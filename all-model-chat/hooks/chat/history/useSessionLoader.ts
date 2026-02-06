
import { useCallback, Dispatch, SetStateAction, useEffect } from 'react';
import { AppSettings, SavedChatSession, ChatGroup, UploadedFile, ChatSettings, ChatMessage, InputCommand } from '../../../types';
import { DEFAULT_CHAT_SETTINGS, ACTIVE_CHAT_SESSION_ID_KEY } from '../../../constants/appConstants';
import { createNewSession, rehydrateSessionFiles, logService } from '../../../utils/appUtils';
import { dbService } from '../../../utils/db';

interface UseSessionLoaderProps {
    appSettings: AppSettings;
    setSavedSessions: Dispatch<SetStateAction<SavedChatSession[]>>;
    setSavedGroups: Dispatch<SetStateAction<ChatGroup[]>>;
    setActiveSessionId: Dispatch<SetStateAction<string | null>>;
    setActiveMessages: Dispatch<SetStateAction<ChatMessage[]>>; // Added setter
    setSelectedFiles: Dispatch<SetStateAction<UploadedFile[]>>;
    setEditingMessageId: Dispatch<SetStateAction<string | null>>;
    setCommandedInput: Dispatch<SetStateAction<InputCommand | null>>;
    updateAndPersistSessions: (updater: (prev: SavedChatSession[]) => SavedChatSession[], options?: { persist?: boolean }) => Promise<void>;
    activeChat: SavedChatSession | undefined;
    userScrolledUp: React.MutableRefObject<boolean>;
    selectedFiles: UploadedFile[];
    fileDraftsRef: React.MutableRefObject<Record<string, UploadedFile[]>>;
    activeSessionId: string | null;
    savedSessions: SavedChatSession[];
}

export const useSessionLoader = ({
    appSettings,
    setSavedSessions,
    setSavedGroups,
    setActiveSessionId,
    setActiveMessages,
    setSelectedFiles,
    setEditingMessageId,
    setCommandedInput,
    updateAndPersistSessions,
    activeChat,
    userScrolledUp,
    selectedFiles,
    fileDraftsRef,
    activeSessionId,
    savedSessions,
}: UseSessionLoaderProps) => {

    const startNewChat = useCallback((explicitTemplateSession?: SavedChatSession) => {
        // If we are already on an empty chat, just focus input and don't create a duplicate
        if (activeChat && activeChat.messages.length === 0 && !activeChat.systemInstruction) {
            logService.info('Already on an empty chat, reusing session.');
            
            // Clear input text, files, and editing state to ensure a "fresh" start visual
            setCommandedInput({ text: '', id: Date.now(), mode: 'replace' });
            setSelectedFiles([]);
            setEditingMessageId(null);

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

        // Determine settings for new chat
        let settingsForNewChat: ChatSettings = { ...DEFAULT_CHAT_SETTINGS, ...appSettings };
        
        // Inherit from explicit template (initial load) or top of sidebar (user action)
        const templateSession = explicitTemplateSession || (savedSessions.length > 0 ? savedSessions[0] : undefined);
        
        if (templateSession) {
            settingsForNewChat = {
                ...settingsForNewChat,
                modelId: templateSession.settings.modelId,
                isGoogleSearchEnabled: templateSession.settings.isGoogleSearchEnabled,
                isCodeExecutionEnabled: templateSession.settings.isCodeExecutionEnabled,
                isUrlContextEnabled: templateSession.settings.isUrlContextEnabled,
                isDeepSearchEnabled: templateSession.settings.isDeepSearchEnabled,
                thinkingBudget: templateSession.settings.thinkingBudget,
                thinkingLevel: templateSession.settings.thinkingLevel,
                ttsVoice: templateSession.settings.ttsVoice,
            };
        }

        const newSession = createNewSession(settingsForNewChat);

        // Update state: Set Active Messages to empty, Add new session metadata to list
        setActiveMessages([]);
        setActiveSessionId(newSession.id);
        
        updateAndPersistSessions(prev => [newSession, ...prev]);

        // Clear files for new chat
        setSelectedFiles([]);
        
        setEditingMessageId(null);
        
        setTimeout(() => {
            document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Chat message input"]')?.focus();
        }, 0);
    }, [appSettings, activeChat, updateAndPersistSessions, setActiveSessionId, setActiveMessages, setSelectedFiles, setEditingMessageId, userScrolledUp, activeSessionId, selectedFiles, fileDraftsRef, setCommandedInput, savedSessions]);

    const loadChatSession = useCallback(async (sessionId: string) => {
        logService.info(`Loading chat session: ${sessionId}`);
        userScrolledUp.current = false;
        
        // Save current files to draft before switching
        if (activeSessionId && activeSessionId !== sessionId) {
            fileDraftsRef.current[activeSessionId] = selectedFiles;
        }

        try {
            const sessionToLoad = await dbService.getSession(sessionId);

            if (sessionToLoad) {
                const rehydrated = rehydrateSessionFiles(sessionToLoad);
                
                // Set Active Messages and ID
                setActiveMessages(rehydrated.messages);
                setActiveSessionId(rehydrated.id);
                
                // Ensure metadata list contains this session (metadata only)
                setSavedSessions(prev => {
                    const exists = prev.some(s => s.id === sessionId);
                    if (exists) {
                         // Update metadata if needed, but strip messages
                         const { messages, ...metadata } = rehydrated;
                         return prev.map(s => s.id === sessionId ? { ...s, ...metadata, messages: [] } : s);
                    } else {
                         // Add if missing (rare case of direct load)
                         const { messages, ...metadata } = rehydrated;
                         return [{ ...metadata, messages: [] } as SavedChatSession, ...prev];
                    }
                });

                // Restore files from draft for the target session
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
        } catch (error) {
            logService.error("Error loading chat session:", error);
            startNewChat();
        }
    }, [setActiveSessionId, setActiveMessages, setSelectedFiles, setEditingMessageId, startNewChat, userScrolledUp, activeSessionId, selectedFiles, fileDraftsRef, setSavedSessions]);

    const loadInitialData = useCallback(async () => {
        try {
            logService.info('Attempting to load chat history metadata from IndexedDB.');
            
            // 1. Fetch metadata only for the list
            const [metadataList, groups] = await Promise.all([
                dbService.getAllSessionMetadata(),
                dbService.getAllGroups()
            ]);

            // Determine Active Session ID
            let initialActiveId: string | null = null;
            const urlMatch = window.location.pathname.match(/^\/chat\/([^/]+)$/);
            const urlSessionId = urlMatch ? urlMatch[1] : null;

            if (urlSessionId && metadataList.some(s => s.id === urlSessionId)) {
                initialActiveId = urlSessionId;
            } else {
                const storedActiveId = sessionStorage.getItem(ACTIVE_CHAT_SESSION_ID_KEY);
                if (storedActiveId && metadataList.some(s => s.id === storedActiveId)) {
                    initialActiveId = storedActiveId;
                }
            }

            // 2. Fetch Active Session Full Data if exists
            if (initialActiveId) {
                const fullActiveSession = await dbService.getSession(initialActiveId);
                if (fullActiveSession) {
                    logService.info(`Loaded full content for active session: ${initialActiveId}`);
                    const rehydrated = rehydrateSessionFiles(fullActiveSession);
                    setActiveMessages(rehydrated.messages);
                    setActiveSessionId(initialActiveId);
                    
                    // Restore files draft
                    const draftFiles = fileDraftsRef.current[initialActiveId] || [];
                    setSelectedFiles(draftFiles);
                } else {
                    // Fallback if ID invalid
                    initialActiveId = null; 
                }
            }

            // 3. Set List State (Metadata only)
            const sortedList = metadataList.sort((a,b) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return b.timestamp - a.timestamp;
            });
            
            setSavedSessions(sortedList);
            setSavedGroups(groups.map(g => ({...g, isExpanded: g.isExpanded ?? true})));

            if (!initialActiveId) {
                // Fallback: New Chat
                logService.info('No active session found or invalid, starting fresh chat.');
                // Pass the top session (if any) as template for inheritance
                startNewChat(sortedList.length > 0 ? sortedList[0] : undefined);
            }

        } catch (error) {
            logService.error("Error loading chat history:", error);
            startNewChat();
        }
    }, [setSavedSessions, setSavedGroups, startNewChat, setActiveSessionId, setActiveMessages, setSelectedFiles, fileDraftsRef]);

    // Handle Browser Back/Forward navigation
    useEffect(() => {
        const handlePopState = () => {
            const match = window.location.pathname.match(/^\/chat\/([^/]+)$/);
            const sessionId = match ? match[1] : null;
            
            if (sessionId) {
                loadChatSession(sessionId);
            } else if (window.location.pathname === '/') {
                startNewChat();
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [loadChatSession, startNewChat]);

    return {
        startNewChat,
        loadChatSession,
        loadInitialData
    };
};