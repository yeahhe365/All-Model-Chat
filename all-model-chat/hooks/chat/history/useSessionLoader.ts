
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
}: UseSessionLoaderProps) => {

    const startNewChat = useCallback(() => {
        // If we are already on an empty chat, just focus input and don't create a duplicate
        if (activeChat && activeChat.messages.length === 0 && !activeChat.systemInstruction) {
            logService.info('Already on an empty chat, reusing session.');
            setTimeout(() => {
                document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Chat message input"]')?.focus();
            }, 0);
            return;
        }

        logService.info('Starting new chat session.');
        userScrolledUp.current = false;
        
        // Save current files to draft before switching
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

        // Crucial Fix: Do NOT filter out other empty sessions (prev.filter(...)). 
        // Doing so deletes empty "New Chat" sessions created in other tabs, causing them to 
        // lose their state and auto-switch to this session.
        updateAndPersistSessions(prev => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
        
        // Clear files for new chat
        setSelectedFiles([]);
        
        setEditingMessageId(null);
        
        setTimeout(() => {
            document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Chat message input"]')?.focus();
        }, 0);
    }, [appSettings, activeChat, updateAndPersistSessions, setActiveSessionId, setSelectedFiles, setEditingMessageId, userScrolledUp, activeSessionId, selectedFiles, fileDraftsRef]);

    const loadChatSession = useCallback((sessionId: string, allSessions: SavedChatSession[]) => {
        logService.info(`Loading chat session: ${sessionId}`);
        userScrolledUp.current = false;
        
        // Save current files to draft before switching if we are coming from another valid session
        if (activeSessionId && activeSessionId !== sessionId) {
            fileDraftsRef.current[activeSessionId] = selectedFiles;
        }

        const sessionToLoad = allSessions.find(s => s.id === sessionId);
        if (sessionToLoad) {
            setActiveSessionId(sessionToLoad.id);
            // Note: activeSessionId persistence is now handled by useEffect in useChatState
            
            // Restore files from draft for the target session, or empty if none
            const draftFiles = fileDraftsRef.current[sessionId] || [];
            setSelectedFiles(draftFiles);
            
            setEditingMessageId(null);
            setTimeout(() => {
                document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Chat message input"]')?.focus();
            }, 0);
        } else {
            logService.warn(`Session ${sessionId} not found. Starting new chat.`);
            startNewChat();
        }
    }, [setActiveSessionId, setSelectedFiles, setEditingMessageId, startNewChat, userScrolledUp, activeSessionId, selectedFiles, fileDraftsRef]);

    const loadInitialData = useCallback(async () => {
        try {
            logService.info('Attempting to load chat history from IndexedDB.');
            const [sessions, groups] = await Promise.all([
                dbService.getAllSessions(),
                dbService.getAllGroups()
            ]);

            const rehydratedSessions = sessions.map(rehydrateSessionFiles);
            rehydratedSessions.sort((a,b) => b.timestamp - a.timestamp);
            
            setSavedSessions(rehydratedSessions);
            setSavedGroups(groups.map(g => ({...g, isExpanded: g.isExpanded ?? true})));

            // Priority 1: Check URL for deep linking
            const urlMatch = window.location.pathname.match(/^\/chat\/([^/]+)$/);
            const urlSessionId = urlMatch ? urlMatch[1] : null;

            if (urlSessionId && rehydratedSessions.find(s => s.id === urlSessionId)) {
                logService.info(`Deep link found for session: ${urlSessionId}`);
                loadChatSession(urlSessionId, rehydratedSessions);
            } else {
                // Priority 2: Check Session Storage
                const storedActiveId = sessionStorage.getItem(ACTIVE_CHAT_SESSION_ID_KEY);

                if (storedActiveId && rehydratedSessions.find(s => s.id === storedActiveId)) {
                    loadChatSession(storedActiveId, rehydratedSessions);
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
                // We set ID directly. We can't easily call loadChatSession here because we don't have 
                // the full session list in closure without adding a heavy dependency.
                // Setting ID triggers useChatState effects which updates context.
                // Input drafts might be lost on back button navigation, but chat content is safe.
                setActiveSessionId(sessionId);
            } else if (window.location.pathname === '/') {
                startNewChat();
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [setActiveSessionId, startNewChat]);

    return {
        startNewChat,
        loadChatSession,
        loadInitialData
    };
};
