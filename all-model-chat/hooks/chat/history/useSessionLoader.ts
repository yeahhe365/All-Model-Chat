
import { useCallback, Dispatch, SetStateAction } from 'react';
import { AppSettings, SavedChatSession, ChatGroup, UploadedFile, ChatSettings } from '../../../types';
import { DEFAULT_CHAT_SETTINGS } from '../../../constants/appConstants';
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
    savedSessions: SavedChatSession[];
    t: (key: string, fallback?: string) => string;
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
    savedSessions,
    t
}: UseSessionLoaderProps) => {

    const startNewChat = useCallback(() => {
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

        // Calculate unique title for the new session
        const baseTitle = t('newChat');
        const nonEmptySessions = savedSessions.filter(s => s.messages.length > 0);
        const existingTitles = new Set(nonEmptySessions.map(s => s.title));
        
        let newTitle = baseTitle;
        let counter = 1;
        while (existingTitles.has(newTitle)) {
            newTitle = `${baseTitle} ${counter}`;
            counter++;
        }

        const newSession = createNewSession(settingsForNewChat, [], newTitle);

        updateAndPersistSessions(prev => [newSession, ...prev.filter(s => s.messages.length > 0)]);
        setActiveSessionId(newSession.id);
        dbService.setActiveSessionId(newSession.id);

        // Don't force clear text (handled by localStorage draft for new ID)
        // Clear files for new chat
        setSelectedFiles([]);
        
        setEditingMessageId(null);
        
        setTimeout(() => {
            document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Chat message input"]')?.focus();
        }, 0);
    }, [appSettings, activeChat, updateAndPersistSessions, setActiveSessionId, setSelectedFiles, setEditingMessageId, userScrolledUp, activeSessionId, selectedFiles, fileDraftsRef, savedSessions, t]);

    const loadChatSession = useCallback((sessionId: string, allSessions: SavedChatSession[]) => {
        logService.info(`Loading chat session: ${sessionId}`);
        userScrolledUp.current = false;
        
        // Save current files to draft before switching
        if (activeSessionId) {
            fileDraftsRef.current[activeSessionId] = selectedFiles;
        }

        const sessionToLoad = allSessions.find(s => s.id === sessionId);
        if (sessionToLoad) {
            setActiveSessionId(sessionToLoad.id);
            dbService.setActiveSessionId(sessionId);
            
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
            const [sessions, groups, storedActiveId] = await Promise.all([
                dbService.getAllSessions(),
                dbService.getAllGroups(),
                dbService.getActiveSessionId()
            ]);

            const rehydratedSessions = sessions.map(rehydrateSessionFiles);
            rehydratedSessions.sort((a,b) => b.timestamp - a.timestamp);
            
            setSavedSessions(rehydratedSessions);
            setSavedGroups(groups.map(g => ({...g, isExpanded: g.isExpanded ?? true})));

            if (storedActiveId && rehydratedSessions.find(s => s.id === storedActiveId)) {
                loadChatSession(storedActiveId, rehydratedSessions);
            } else if (rehydratedSessions.length > 0) {
                logService.info('No active session ID, loading most recent session.');
                loadChatSession(rehydratedSessions[0].id, rehydratedSessions);
            } else {
                logService.info('No history found, starting fresh chat.');
                startNewChat();
            }
        } catch (error) {
            logService.error("Error loading chat history:", error);
            startNewChat();
        }
    }, [setSavedSessions, setSavedGroups, loadChatSession, startNewChat]);

    return {
        startNewChat,
        loadChatSession,
        loadInitialData
    };
};
