
import { Dispatch, SetStateAction, useCallback } from 'react';
import { AppSettings, ChatMessage, SavedChatSession, UploadedFile, ChatSettings } from '../types';
import { CHAT_HISTORY_SESSIONS_KEY, ACTIVE_CHAT_SESSION_ID_KEY, DEFAULT_CHAT_SETTINGS } from '../constants/appConstants';
import { generateUniqueId, logService } from '../utils/appUtils';

type CommandedInputSetter = Dispatch<SetStateAction<{ text: string; id: number; } | null>>;
type SessionsUpdater = (updater: (prev: SavedChatSession[]) => SavedChatSession[]) => void;

interface ChatHistoryProps {
    appSettings: AppSettings;
    setSavedSessions: Dispatch<SetStateAction<SavedChatSession[]>>;
    setActiveSessionId: Dispatch<SetStateAction<string | null>>;
    setEditingMessageId: Dispatch<SetStateAction<string | null>>;
    setCommandedInput: CommandedInputSetter;
    setSelectedFiles: Dispatch<SetStateAction<UploadedFile[]>>;
    activeJobs: React.MutableRefObject<Map<string, AbortController>>;
    updateAndPersistSessions: SessionsUpdater;
}

export const useChatHistory = ({
    appSettings,
    setSavedSessions,
    setActiveSessionId,
    setEditingMessageId,
    setCommandedInput,
    setSelectedFiles,
    activeJobs,
    updateAndPersistSessions,
}: ChatHistoryProps) => {

    const startNewChat = useCallback(() => {
        logService.info('Starting new chat session.');
        
        // Create a new session immediately
        const newSessionId = generateUniqueId();
        const newSession: SavedChatSession = {
            id: newSessionId,
            title: "New Chat",
            messages: [],
            timestamp: Date.now(),
            settings: { ...DEFAULT_CHAT_SETTINGS, ...appSettings },
        };

        // Add new session and remove any other empty sessions from before.
        updateAndPersistSessions(prev => [newSession, ...prev.filter(s => s.messages.length > 0)]);

        // Set it as the active session
        setActiveSessionId(newSessionId);
        localStorage.setItem(ACTIVE_CHAT_SESSION_ID_KEY, newSessionId);

        // Reset UI state
        setCommandedInput({ text: '', id: Date.now() });
        setSelectedFiles([]);
        setEditingMessageId(null);
        
        setTimeout(() => {
            document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Chat message input"]')?.focus();
        }, 0);
    }, [appSettings, updateAndPersistSessions, setActiveSessionId, setCommandedInput, setSelectedFiles, setEditingMessageId]);

    const loadChatSession = useCallback((sessionId: string, allSessions: SavedChatSession[]) => {
        logService.info(`Loading chat session: ${sessionId}`);
        const sessionToLoad = allSessions.find(s => s.id === sessionId);
        if (sessionToLoad) {
            setActiveSessionId(sessionToLoad.id);
            localStorage.setItem(ACTIVE_CHAT_SESSION_ID_KEY, sessionId);
            setCommandedInput({ text: '', id: Date.now() });
            setSelectedFiles([]);
            setEditingMessageId(null);
        } else {
            logService.warn(`Session ${sessionId} not found. Starting new chat.`);
            startNewChat();
        }
    }, [setActiveSessionId, setCommandedInput, setSelectedFiles, setEditingMessageId, startNewChat]);

    const loadInitialData = useCallback(() => {
        try {
            logService.info('Attempting to load chat history from localStorage.');
            const storedSessions = localStorage.getItem(CHAT_HISTORY_SESSIONS_KEY);
            let sessions: SavedChatSession[] = [];
            if (storedSessions) {
                try {
                    const parsed = JSON.parse(storedSessions);
                    if (Array.isArray(parsed)) {
                        sessions = parsed;
                    } else {
                        logService.warn('Stored chat history is corrupted (not an array). Discarding.');
                        localStorage.removeItem(CHAT_HISTORY_SESSIONS_KEY);
                    }
                } catch (e) {
                    logService.error('Failed to parse chat history from localStorage. Discarding.', { error: e });
                    localStorage.removeItem(CHAT_HISTORY_SESSIONS_KEY);
                }
            }

            sessions.sort((a,b) => b.timestamp - a.timestamp);
            setSavedSessions(sessions);

            const storedActiveId = localStorage.getItem(ACTIVE_CHAT_SESSION_ID_KEY);
            if (storedActiveId && sessions.find(s => s.id === storedActiveId)) {
                loadChatSession(storedActiveId, sessions);
            } else if (sessions.length > 0) {
                logService.info('No active session ID, loading most recent session.');
                loadChatSession(sessions[0].id, sessions);
            } else {
                logService.info('No history found, starting fresh chat.');
                startNewChat();
            }
        } catch (error) {
            logService.error("Error loading chat history:", error);
            startNewChat();
        }
    }, [setSavedSessions, loadChatSession, startNewChat]);
    
    const handleDeleteChatHistorySession = useCallback((sessionId: string) => {
        logService.info(`Deleting session: ${sessionId}`);

        // Abort any running job for the session being deleted
        updateAndPersistSessions(prev => {
             const sessionToDelete = prev.find(s => s.id === sessionId);
             if (sessionToDelete) {
                 sessionToDelete.messages.forEach(msg => {
                     if(msg.isLoading && activeJobs.current.has(msg.id)) {
                         activeJobs.current.get(msg.id)?.abort();
                         activeJobs.current.delete(msg.id);
                     }
                 });
             }
             return prev.filter(s => s.id !== sessionId);
        });

        // If the deleted session was active, load the next available one or start new
        setActiveSessionId(prevActiveId => {
            if (prevActiveId === sessionId) {
                const sessionsAfterDelete = JSON.parse(localStorage.getItem(CHAT_HISTORY_SESSIONS_KEY) || '[]') as SavedChatSession[];
                sessionsAfterDelete.sort((a,b) => b.timestamp - a.timestamp);
                const nextSessionToLoad = sessionsAfterDelete[0];
                if (nextSessionToLoad) {
                     loadChatSession(nextSessionToLoad.id, sessionsAfterDelete);
                     return nextSessionToLoad.id;
                } else {
                    startNewChat();
                    return null;
                }
            }
            return prevActiveId;
        });

    }, [updateAndPersistSessions, activeJobs, setActiveSessionId, loadChatSession, startNewChat]);

    const clearAllHistory = useCallback(() => {
        logService.warn('User clearing all chat history.');
        
        activeJobs.current.forEach(controller => controller.abort());
        activeJobs.current.clear();
        
        localStorage.removeItem(CHAT_HISTORY_SESSIONS_KEY);
        setSavedSessions([]);
        startNewChat();
    }, [setSavedSessions, startNewChat, activeJobs]);
    
    const clearCacheAndReload = useCallback(() => {
        clearAllHistory();
        localStorage.clear();
        setTimeout(() => window.location.reload(), 50);
    }, [clearAllHistory]);

    return {
        loadInitialData,
        loadChatSession,
        startNewChat,
        handleDeleteChatHistorySession,
        clearAllHistory,
        clearCacheAndReload,
    };
}
    