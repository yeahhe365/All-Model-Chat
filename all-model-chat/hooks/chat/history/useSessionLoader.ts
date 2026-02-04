
import { useCallback, Dispatch, SetStateAction, useEffect } from 'react';
import { AppSettings, SavedChatSession, ChatGroup, UploadedFile, ChatSettings, ChatSessionMetadata } from '../../../types';
import { DEFAULT_CHAT_SETTINGS, ACTIVE_CHAT_SESSION_ID_KEY } from '../../../constants/appConstants';
import { createNewSession, rehydrateSessionFiles, logService } from '../../../utils/appUtils';
import { dbService } from '../../../utils/db';

interface UseSessionLoaderProps {
    appSettings: AppSettings;
    setSavedSessions: Dispatch<SetStateAction<ChatSessionMetadata[]>>;
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
    setActiveChatSession?: Dispatch<SetStateAction<SavedChatSession | null>>;
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
    setActiveChatSession
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
        
        // Immediately set the active session in full
        if (setActiveChatSession) {
            setActiveChatSession(newSession);
        }

        // Add to the list (metadata will be extracted by updateAndPersistSessions)
        updateAndPersistSessions(prev => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
        
        setSelectedFiles([]);
        setEditingMessageId(null);
        
        setTimeout(() => {
            document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Chat message input"]')?.focus();
        }, 0);
    }, [appSettings, activeChat, updateAndPersistSessions, setActiveSessionId, setSelectedFiles, setEditingMessageId, userScrolledUp, activeSessionId, selectedFiles, fileDraftsRef, setActiveChatSession]);

    const loadChatSession = useCallback(async (sessionId: string, allSessions: ChatSessionMetadata[]) => {
        logService.info(`Loading chat session: ${sessionId}`);
        userScrolledUp.current = false;
        
        if (activeSessionId && activeSessionId !== sessionId) {
            fileDraftsRef.current[activeSessionId] = selectedFiles;
        }

        // Check if session exists in metadata list
        const sessionMetadata = allSessions.find(s => s.id === sessionId);
        if (sessionMetadata) {
            // Lazy Load: Fetch full session data
            try {
                const fullSession = await dbService.getSessionById(sessionId);
                if (fullSession && setActiveChatSession) {
                    const rehydrated = rehydrateSessionFiles(fullSession);
                    setActiveChatSession(rehydrated);
                } else {
                    logService.error(`Failed to load full session data for ${sessionId}`);
                }
            } catch (e) {
                logService.error(`Error fetching session ${sessionId}`, { error: e });
            }

            setActiveSessionId(sessionId);
            
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
    }, [setActiveSessionId, setSelectedFiles, setEditingMessageId, startNewChat, userScrolledUp, activeSessionId, selectedFiles, fileDraftsRef, setActiveChatSession]);

    const loadInitialData = useCallback(async () => {
        try {
            logService.info('Attempting to load chat history (metadata) from IndexedDB.');
            const [sessions, groups] = await Promise.all([
                dbService.getAllSessionMetadata(), // Lazy load metadata only
                dbService.getAllGroups()
            ]);

            sessions.sort((a,b) => b.timestamp - a.timestamp);
            
            setSavedSessions(sessions);
            setSavedGroups(groups.map(g => ({...g, isExpanded: g.isExpanded ?? true})));

            // Priority 1: Check URL for deep linking
            const urlMatch = window.location.pathname.match(/^\/chat\/([^/]+)$/);
            const urlSessionId = urlMatch ? urlMatch[1] : null;

            if (urlSessionId && sessions.find(s => s.id === urlSessionId)) {
                logService.info(`Deep link found for session: ${urlSessionId}`);
                await loadChatSession(urlSessionId, sessions);
            } else {
                // Priority 2: Check Session Storage
                const storedActiveId = sessionStorage.getItem(ACTIVE_CHAT_SESSION_ID_KEY);

                if (storedActiveId && sessions.find(s => s.id === storedActiveId)) {
                    await loadChatSession(storedActiveId, sessions);
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
                // For lazy loading, we must trigger the load function to fetch data
                // We need access to the session list here, but it's not in scope.
                // We'll rely on activeSessionId change trigger or simple refresh?
                // A robust way is to rely on `setActiveSessionId` triggering an effect in useChatState
                // BUT useChatState effect only syncs TO storage/URL, not FROM it for data fetching.
                
                // Hack: We reload to ensure consistent state, or we need to expose sessions list here.
                // Or better: call loadChatSession with current sessions state via a ref or prop?
                // For now, setting ID might leave ActiveSession null.
                
                // Let's assume parent component re-renders or handles this. 
                // Ideally we should call `loadChatSession(sessionId, savedSessions)`
                // We can't do that easily inside this effect without adding `savedSessions` dependency which might loop.
                
                // Minimal fix: reload page if navigating history to ensure state consistency
                window.location.reload(); 
            } else if (window.location.pathname === '/') {
                startNewChat();
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [startNewChat]);

    return {
        startNewChat,
        loadChatSession,
        loadInitialData
    };
};