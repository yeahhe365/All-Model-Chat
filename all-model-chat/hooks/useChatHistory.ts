import { Dispatch, SetStateAction, useCallback } from 'react';
import { AppSettings, ChatMessage, SavedChatSession, UploadedFile, ChatSettings, ChatGroup } from '../types';
import { DEFAULT_CHAT_SETTINGS } from '../constants/appConstants';
import { generateUniqueId, logService, getTranslator } from '../utils/appUtils';
import { dbService } from '../utils/db';
import { SUPPORTED_IMAGE_MIME_TYPES } from '../constants/fileConstants';

type CommandedInputSetter = Dispatch<SetStateAction<{ text: string; id: number; } | null>>;
type SessionsUpdater = (updater: (prev: SavedChatSession[]) => SavedChatSession[], options?: { persist?: boolean }) => Promise<void>;
type GroupsUpdater = (updater: (prev: ChatGroup[]) => ChatGroup[]) => Promise<void>;

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
    updateAndPersistGroups: GroupsUpdater;
    activeChat: SavedChatSession | undefined;
    language: 'en' | 'zh';
}

const rehydrateSessionFiles = (session: SavedChatSession): SavedChatSession => {
    const newMessages = session.messages.map(message => {
        if (!message.files?.length) return message;

        const newFiles = message.files.map(file => {
            // Check if it's an image that was stored locally (has rawFile)
            if (SUPPORTED_IMAGE_MIME_TYPES.includes(file.type) && file.rawFile) {
                try {
                    // Create a new blob URL. The browser will handle the old invalid one on page unload.
                    const dataUrl = URL.createObjectURL(file.rawFile);
                    return { ...file, dataUrl: dataUrl };
                } catch (error) {
                    logService.error("Failed to create object URL for file on load", { fileId: file.id, error });
                    // Keep the file but mark that preview failed
                    return { ...file, dataUrl: undefined, error: "Preview failed to load" };
                }
            }
            return file;
        });

        return { ...message, files: newFiles };
    });

    return { ...session, messages: newMessages };
};

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
    updateAndPersistGroups,
    activeChat,
    language,
}: ChatHistoryProps) => {
    const t = getTranslator(language);

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
        dbService.setActiveSessionId(newSessionId);

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
            dbService.setActiveSessionId(sessionId);
            setCommandedInput({ text: '', id: Date.now() });
            setSelectedFiles([]);
            setEditingMessageId(null);
            setTimeout(() => {
                document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Chat message input"]')?.focus();
            }, 0);
        } else {
            logService.warn(`Session ${sessionId} not found. Starting new chat.`);
            startNewChat();
        }
    }, [setActiveSessionId, setCommandedInput, setSelectedFiles, setEditingMessageId, startNewChat]);

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
        if (!window.confirm(t('settingsClearHistory_confirm'))) return;
        logService.warn('User clearing all chat history.');
        activeJobs.current.forEach(controller => controller.abort());
        activeJobs.current.clear();
        Promise.all([dbService.setAllSessions([]), dbService.setAllGroups([]), dbService.setActiveSessionId(null)]);
        setSavedSessions([]);
        setSavedGroups([]);
        startNewChat();
    }, [setSavedSessions, setSavedGroups, startNewChat, activeJobs, t]);
    
    const clearCacheAndReload = useCallback(() => {
        if (!window.confirm(t('settingsClearCache_confirm'))) return;
        logService.warn('User clearing all application cache and settings.');
        activeJobs.current.forEach(controller => controller.abort());
        activeJobs.current.clear();
        dbService.clearAllData();
        setTimeout(() => window.location.reload(), 50);
    }, [activeJobs, t]);

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