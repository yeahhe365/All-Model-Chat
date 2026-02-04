
import { useCallback, Dispatch, SetStateAction, useEffect } from 'react';
import { AppSettings, SavedChatSession, ChatGroup, UploadedFile, ChatSettings } from '../../../types';
import { DEFAULT_CHAT_SETTINGS, ACTIVE_CHAT_SESSION_ID_KEY } from '../../../constants/appConstants';
import { createNewSession, rehydrateSessionFiles, logService } from '../../../utils/appUtils';
import { dbService } from '../../../utils/db';

interface UseSessionLoaderProps {
    appSettings: AppSettings;
    setSavedSessions: Dispatch<SetStateAction<SavedChatSession[]>>;
    setSavedGroups: Dispatch<SetStateAction<ChatGroup[]>>;
    setActiveSessionId: Dispatch<SetStateAction<string | null>>;
    setSelectedFiles: Dispatch<SetStateAction<UploadedFile[]>>;
    setEditingMessageId: Dispatch<SetStateAction<string | null>>;
    updateAndPersistSessions: (updater: (prev: SavedChatSession[]) => SavedChatSession[], options?: { persist?: boolean }) => Promise<void>;
    activeChat: SavedChatSession | undefined;
    userScrolledUp: React.MutableRefObject<boolean>;
    selectedFiles: UploadedFile[];
    fileDraftsRef: React.MutableRefObject<Record<string, UploadedFile[]>>;
    activeSessionId: string | null;
    setActiveChat?: Dispatch<SetStateAction<SavedChatSession | undefined>>;
}

export const useSessionLoader = ({
    appSettings,
    setSavedSessions,
    setSavedGroups,
    setActiveSessionId,
    setSelectedFiles,
    setEditingMessageId,
    updateAndPersistSessions,
    activeChat,
    userScrolledUp,
    selectedFiles,
    fileDraftsRef,
    activeSessionId,
    setActiveChat
}: UseSessionLoaderProps) => {

    const startNewChat = useCallback(() => {
        // If we are already on an empty chat, just focus input
        if (activeChat && activeChat.messages.length === 0 && !activeChat.systemInstruction) {
            logService.info('Already on an empty chat, reusing session.');
            setTimeout(() => {
                document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Chat message input"]')?.focus();
            }, 0);
            return;
        }

        logService.info('Starting new chat session.');
        userScrolledUp.current = false;
        
        if (activeSessionId) {
            fileDraftsRef.current[activeSessionId] = selectedFiles;
        }

        let settingsForNewChat: ChatSettings = { ...DEFAULT_CHAT_SETTINGS, ...appSettings };
        if (activeChat) {
            settingsForNewChat = {
                ...settingsForNewChat,
                modelId: activeChat.settings.modelId,
                thinkingBudget: activeChat.settings.thinkingBudget,
                thinkingLevel: activeChat.settings.thinkingLevel,
                isGoogleSearchEnabled: activeChat.settings.isGoogleSearchEnabled,
                isCodeExecutionEnabled: activeChat.settings.isCodeExecutionEnabled,
                isUrlContextEnabled: activeChat.settings.isUrlContextEnabled,
                isDeepSearchEnabled: activeChat.settings.isDeepSearchEnabled,
            };
        }

        const newSession = createNewSession(settingsForNewChat);
        
        // Immediate UI Update: Set active session first
        if (setActiveChat) setActiveChat(newSession);
        
        // Then update the list (Metadata will be extracted by updateAndPersistSessions)
        updateAndPersistSessions(prev => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
        
        setSelectedFiles([]);
        setEditingMessageId(null);
        
        setTimeout(() => {
            document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Chat message input"]')?.focus();
        }, 0);
    }, [appSettings, activeChat, updateAndPersistSessions, setActiveSessionId, setSelectedFiles, setEditingMessageId, userScrolledUp, activeSessionId, selectedFiles, fileDraftsRef, setActiveChat]);

    const loadChatSession = useCallback(async (sessionId: string, allSessionsMetadata: SavedChatSession[]) => {
        logService.info(`Loading chat session: ${sessionId}`);
        userScrolledUp.current = false;
        
        if (activeSessionId && activeSessionId !== sessionId) {
            fileDraftsRef.current[activeSessionId] = selectedFiles;
        }

        // Lazy Loading: Fetch full session from DB
        try {
            const sessionData = await dbService.getSessionById(sessionId);
            
            if (sessionData) {
                const rehydrated = rehydrateSessionFiles(sessionData);
                if (setActiveChat) setActiveChat(rehydrated);
                setActiveSessionId(sessionData.id);

                const draftFiles = fileDraftsRef.current[sessionId] || [];
                setSelectedFiles(draftFiles);
                setEditingMessageId(null);
                
                setTimeout(() => {
                    document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Chat message input"]')?.focus();
                }, 0);
            } else {
                logService.warn(`Session ${sessionId} not found in DB. Starting new chat.`);
                startNewChat();
            }
        } catch (error) {
            logService.error(`Failed to load session ${sessionId}`, error);
            startNewChat();
        }
    }, [setActiveSessionId, setSelectedFiles, setEditingMessageId, startNewChat, userScrolledUp, activeSessionId, selectedFiles, fileDraftsRef, setActiveChat]);

    const loadInitialData = useCallback(async () => {
        try {
            logService.info('Attempting to load chat history (metadata) from IndexedDB.');
            const [sessionsMetadata, groups] = await Promise.all([
                dbService.getAllSessionsMetadata(),
                dbService.getAllGroups()
            ]);

            // Metadata doesn't need rehydration of files
            sessionsMetadata.sort((a,b) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return b.timestamp - a.timestamp;
            });
            
            setSavedSessions(sessionsMetadata);
            setSavedGroups(groups.map(g => ({...g, isExpanded: g.isExpanded ?? true})));

            // Priority 1: Check URL for deep linking
            const urlMatch = window.location.pathname.match(/^\/chat\/([^/]+)$/);
            const urlSessionId = urlMatch ? urlMatch[1] : null;

            if (urlSessionId) {
                // We don't check existence in metadata immediately because it might be a new share or just latency.
                // We try to load it. If loadChatSession fails, it falls back.
                logService.info(`Deep link found for session: ${urlSessionId}`);
                loadChatSession(urlSessionId, sessionsMetadata);
            } else {
                // Priority 2: Check Session Storage
                const storedActiveId = sessionStorage.getItem(ACTIVE_CHAT_SESSION_ID_KEY);

                if (storedActiveId && sessionsMetadata.find(s => s.id === storedActiveId)) {
                    loadChatSession(storedActiveId, sessionsMetadata);
                } else {
                    // Fallback: New Chat
                    logService.info('No active session in URL or storage, starting fresh chat.');
                    startNewChat();
                }
            }
        } catch (error) {
            logService.error("Error loading chat history:", error);
            startNewChat();
        }
    }, [setSavedSessions, setSavedGroups, loadChatSession, startNewChat]);

    // Handle Browser Back/Forward navigation
    useEffect(() => {
        const handlePopState = () => {
            const match = window.location.pathname.match(/^\/chat\/([^/]+)$/);
            const sessionId = match ? match[1] : null;
            
            if (sessionId) {
                // Since we need to fetch data, we reuse loadChatSession here.
                // Note: We need access to metadata list, but for simplicity we assume valid ID 
                // and pass empty array or refetch. 
                // Better to just call loadChatSession which handles fetch.
                // But we need the list... 
                // Let's just try to load by ID.
                dbService.getSessionById(sessionId).then(session => {
                    if (session && setActiveChat) {
                        setActiveChat(rehydrateSessionFiles(session));
                        setActiveSessionId(sessionId);
                    } else {
                        startNewChat();
                    }
                });
            } else if (window.location.pathname === '/') {
                startNewChat();
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [setActiveSessionId, startNewChat, setActiveChat]);

    return {
        startNewChat,
        loadChatSession,
        loadInitialData
    };
};
