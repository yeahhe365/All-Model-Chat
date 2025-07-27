import { Dispatch, SetStateAction, useCallback } from 'react';
import { AppSettings, ChatMessage, SavedChatSession, UploadedFile, ChatSettings, ChatGroup } from '../types';
import { CHAT_HISTORY_SESSIONS_KEY, ACTIVE_CHAT_SESSION_ID_KEY, DEFAULT_CHAT_SETTINGS, CHAT_HISTORY_GROUPS_KEY } from '../constants/appConstants';
import { generateUniqueId, logService, getTranslator } from '../utils/appUtils';

type CommandedInputSetter = Dispatch<SetStateAction<{ text: string; id: number; } | null>>;
type SessionsUpdater = (updater: (prev: SavedChatSession[]) => SavedChatSession[]) => void;

interface ChatHistoryProps {
    appSettings: AppSettings;
    setSavedSessions: Dispatch<SetStateAction<SavedChatSession[]>>;
    setSavedGroups: Dispatch<SetStateAction<ChatGroup[]>>;
    setActiveSessionId: Dispatch<SetStateAction<string | null>>;
    setEditingMessageId: Dispatch<SetStateAction<string | null>>;
    setCommandedInput: CommandedInputSetter;
    setSelectedFiles: Dispatch<SetStateAction<UploadedFile[]>>;
    activeJobs: React.MutableRefObject<Map<string, AbortController>>;
    updateAndPersistSessions: SessionsUpdater;
    activeChat: SavedChatSession | undefined;
    language: 'en' | 'zh';
}

export const useChatHistory = ({
    appSettings,
    setSavedSessions,
    setSavedGroups,
    setActiveSessionId,
    setEditingMessageId,
    setCommandedInput,
    setSelectedFiles,
    activeJobs,
    updateAndPersistSessions,
    activeChat,
    language,
}: ChatHistoryProps) => {
    const t = getTranslator(language);

    const updateAndPersistGroups = useCallback((updater: (prev: ChatGroup[]) => ChatGroup[]) => {
        setSavedGroups(prevGroups => {
            const newGroups = updater(prevGroups);
            localStorage.setItem(CHAT_HISTORY_GROUPS_KEY, JSON.stringify(newGroups));
            return newGroups;
        });
    }, [setSavedGroups]);


    const startNewChat = useCallback(() => {
        logService.info('Starting new chat session.');
        
        let settingsForNewChat: ChatSettings = { ...DEFAULT_CHAT_SETTINGS, ...appSettings };
        if (activeChat) {
            settingsForNewChat = {
                ...settingsForNewChat,
                isGoogleSearchEnabled: activeChat.settings.isGoogleSearchEnabled,
                isCodeExecutionEnabled: activeChat.settings.isCodeExecutionEnabled,
                isUrlContextEnabled: activeChat.settings.isUrlContextEnabled,
            };
        }

        const newSessionId = generateUniqueId();
        const newSession: SavedChatSession = {
            id: newSessionId,
            title: "New Chat",
            messages: [],
            timestamp: Date.now(),
            settings: settingsForNewChat,
            groupId: null,
        };

        updateAndPersistSessions(prev => [newSession, ...prev.filter(s => s.messages.length > 0)]);
        setActiveSessionId(newSessionId);
        localStorage.setItem(ACTIVE_CHAT_SESSION_ID_KEY, newSessionId);

        setCommandedInput({ text: '', id: Date.now() });
        setSelectedFiles([]);
        setEditingMessageId(null);
        
        setTimeout(() => {
            document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Chat message input"]')?.focus();
        }, 0);
    }, [appSettings, activeChat, updateAndPersistSessions, setActiveSessionId, setCommandedInput, setSelectedFiles, setEditingMessageId]);

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

            const storedGroups = localStorage.getItem(CHAT_HISTORY_GROUPS_KEY);
            if (storedGroups) {
                try {
                    const parsedGroups = JSON.parse(storedGroups);
                    if (Array.isArray(parsedGroups)) {
                        setSavedGroups(parsedGroups.map(g => ({...g, isExpanded: g.isExpanded ?? true})));
                    }
                } catch (e) {
                    logService.error('Failed to parse groups from localStorage.', { error: e });
                }
            }

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
    }, [setSavedSessions, setSavedGroups, loadChatSession, startNewChat]);
    
    const handleDeleteChatHistorySession = useCallback((sessionId: string) => {
        logService.info(`Deleting session: ${sessionId}`);
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
        // The logic to switch to a new active session is now handled declaratively in useChat.ts's useEffect.
    }, [updateAndPersistSessions, activeJobs]);
    
    const handleRenameSession = useCallback((sessionId: string, newTitle: string) => {
        if (!newTitle.trim()) return;
        logService.info(`Renaming session ${sessionId} to "${newTitle}"`);
        updateAndPersistSessions(prev =>
            prev.map(s => (s.id === sessionId ? { ...s, title: newTitle.trim() } : s))
        );
    }, [updateAndPersistSessions]);

    const handleTogglePinSession = useCallback((sessionId: string) => {
        logService.info(`Toggling pin for session ${sessionId}`);
        updateAndPersistSessions(prev =>
            prev.map(s => s.id === sessionId ? { ...s, isPinned: !s.isPinned } : s)
        );
    }, [updateAndPersistSessions]);

    const handleAddNewGroup = useCallback(() => {
        logService.info('Adding new group.');
        const newGroup: ChatGroup = {
            id: `group-${generateUniqueId()}`,
            title: t('newGroup_title', 'Untitled'),
            timestamp: Date.now(),
            isExpanded: true,
        };
        updateAndPersistGroups(prev => [newGroup, ...prev]);
    }, [updateAndPersistGroups, t]);

    const handleDeleteGroup = useCallback((groupId: string) => {
        logService.info(`Deleting group: ${groupId}`);
        updateAndPersistGroups(prev => prev.filter(g => g.id !== groupId));
        updateAndPersistSessions(prev => prev.map(s => s.groupId === groupId ? { ...s, groupId: null } : s));
    }, [updateAndPersistGroups, updateAndPersistSessions]);

    const handleRenameGroup = useCallback((groupId: string, newTitle: string) => {
        if (!newTitle.trim()) return;
        logService.info(`Renaming group ${groupId} to "${newTitle}"`);
        updateAndPersistGroups(prev => prev.map(g => g.id === groupId ? { ...g, title: newTitle.trim() } : g));
    }, [updateAndPersistGroups]);
    
    const handleMoveSessionToGroup = useCallback((sessionId: string, groupId: string | null) => {
        logService.info(`Moving session ${sessionId} to group ${groupId}`);
        updateAndPersistSessions(prev => prev.map(s => s.id === sessionId ? { ...s, groupId } : s));
    }, [updateAndPersistSessions]);

    const handleToggleGroupExpansion = useCallback((groupId: string) => {
        updateAndPersistGroups(prev => prev.map(g => g.id === groupId ? { ...g, isExpanded: !(g.isExpanded ?? true) } : g));
    }, [updateAndPersistGroups]);

    const clearAllHistory = useCallback(() => {
        logService.warn('User clearing all chat history.');
        activeJobs.current.forEach(controller => controller.abort());
        activeJobs.current.clear();
        localStorage.removeItem(CHAT_HISTORY_SESSIONS_KEY);
        localStorage.removeItem(CHAT_HISTORY_GROUPS_KEY);
        setSavedSessions([]);
        setSavedGroups([]);
        startNewChat();
    }, [setSavedSessions, setSavedGroups, startNewChat, activeJobs]);
    
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
        handleRenameSession,
        handleTogglePinSession,
        handleAddNewGroup,
        handleDeleteGroup,
        handleRenameGroup,
        handleMoveSessionToGroup,
        handleToggleGroupExpansion,
        clearAllHistory,
        clearCacheAndReload,
    };
}
