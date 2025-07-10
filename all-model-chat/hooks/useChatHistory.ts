import { useState, useEffect, useCallback, Dispatch, SetStateAction } from 'react';
import { AppSettings, ChatMessage, SavedChatSession, ChatSettings as IndividualChatSettings, UploadedFile } from '../types';
import { CHAT_HISTORY_SESSIONS_KEY, ACTIVE_CHAT_SESSION_ID_KEY } from '../constants/appConstants';
import { generateUniqueId, generateSessionTitle } from '../utils/appUtils';
import { logService } from '../services/logService';
import { SUPPORTED_IMAGE_MIME_TYPES } from '../constants/fileConstants';

const applyImageCachePolicy = (sessions: SavedChatSession[]): SavedChatSession[] => {
    const sessionsCopy = JSON.parse(JSON.stringify(sessions)); // Deep copy to avoid direct state mutation
    if (sessionsCopy.length > 5) {
        logService.debug('Applying image cache policy: Pruning images from sessions older than 5th.');
        // Prune images from the 6th session onwards
        for (let i = 5; i < sessionsCopy.length; i++) {
            const session = sessionsCopy[i];
            if (session.messages && Array.isArray(session.messages)) {
                session.messages.forEach((message: ChatMessage) => {
                    if (message.files && Array.isArray(message.files)) {
                        message.files.forEach((file: UploadedFile) => {
                            if (SUPPORTED_IMAGE_MIME_TYPES.includes(file.type)) {
                                if (file.dataUrl) delete file.dataUrl;
                                if (file.base64Data) delete file.base64Data;
                            }
                        });
                    }
                });
            }
        }
    }
    return sessionsCopy;
};

type CommandedInputSetter = Dispatch<SetStateAction<{ text: string; id: number; } | null>>;

interface ChatHistoryProps {
    appSettings: AppSettings;
    messages: ChatMessage[];
    setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
    currentChatSettings: IndividualChatSettings;
    setCurrentChatSettings: Dispatch<SetStateAction<IndividualChatSettings>>;
    setSelectedFiles: Dispatch<SetStateAction<UploadedFile[]>>;
    setEditingMessageId: Dispatch<SetStateAction<string | null>>;
    isLoading: boolean;
    abortControllerRef: React.MutableRefObject<AbortController | null>;
    sessionSaveTimeoutRef: React.MutableRefObject<number | null>;
    userScrolledUp: React.MutableRefObject<boolean>;
    setCommandedInput: CommandedInputSetter;
}

export const useChatHistory = ({
    appSettings,
    messages,
    setMessages,
    currentChatSettings,
    setCurrentChatSettings,
    setSelectedFiles,
    setEditingMessageId,
    isLoading,
    abortControllerRef,
    sessionSaveTimeoutRef,
    userScrolledUp,
    setCommandedInput,
}: ChatHistoryProps) => {
    const [savedSessions, setSavedSessions] = useState<SavedChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

    const saveCurrentChatSession = useCallback((currentMessages: ChatMessage[], currentActiveSessionId: string | null, currentSettingsToSave: IndividualChatSettings) => {
        if (sessionSaveTimeoutRef.current) clearTimeout(sessionSaveTimeoutRef.current);

        sessionSaveTimeoutRef.current = window.setTimeout(() => {
            if (currentMessages.length === 0 && (!currentActiveSessionId || !savedSessions.find(s => s.id === currentActiveSessionId))) {
                const isExistingSession = currentActiveSessionId && savedSessions.find(s => s.id === currentActiveSessionId);
                if (!isExistingSession) {
                    if (activeSessionId && !localStorage.getItem(ACTIVE_CHAT_SESSION_ID_KEY)) {
                        localStorage.removeItem(ACTIVE_CHAT_SESSION_ID_KEY);
                        setActiveSessionId(null);
                    }
                    return;
                }
            }

            let sessionIdToSave = currentActiveSessionId;
            let isNewSessionInHistory = false;

            if (!sessionIdToSave) {
                sessionIdToSave = generateUniqueId();
                isNewSessionInHistory = true;
            }

            const existingSession = savedSessions.find(s => s.id === sessionIdToSave);
            
            const sessionToSave: SavedChatSession = {
                id: sessionIdToSave,
                title: generateSessionTitle(currentMessages),
                timestamp: Date.now(),
                messages: currentMessages.map(msg => ({ 
                    ...msg,
                    files: msg.files?.map(f => {
                        const { abortController, ...rest } = f; 
                        return rest;
                    })
                })),
                settings: currentSettingsToSave,
            };

            if (existingSession) {
                const areMessagesSame = JSON.stringify(existingSession.messages) === JSON.stringify(sessionToSave.messages);
                const areSettingsSame = JSON.stringify(existingSession.settings) === JSON.stringify(sessionToSave.settings);
            
                if (areMessagesSame && areSettingsSame) {
                    // No need to log or save if nothing has changed. This breaks the loop.
                    return;
                }
    
                // To be less aggressive with re-ordering, let's reuse the old timestamp
                // if only settings have changed, but not messages.
                if (areMessagesSame) {
                    sessionToSave.timestamp = existingSession.timestamp;
                }
            }
            
            logService.debug(`Saving session ${sessionIdToSave}`, { isNew: isNewSessionInHistory, messageCount: currentMessages.length });

            setSavedSessions(prevSessions => {
                const existingIndex = prevSessions.findIndex(s => s.id === sessionIdToSave);
                let updatedSessions;
                if (existingIndex !== -1) {
                    updatedSessions = [...prevSessions];
                    updatedSessions[existingIndex] = sessionToSave;
                } else {
                    updatedSessions = [sessionToSave, ...prevSessions];
                }
                updatedSessions.sort((a,b) => b.timestamp - a.timestamp);

                // Apply caching policy before writing to localStorage
                const sessionsForStorage = applyImageCachePolicy(updatedSessions);
                localStorage.setItem(CHAT_HISTORY_SESSIONS_KEY, JSON.stringify(sessionsForStorage));

                return updatedSessions; // Return original state for UI
            });

            if ((isNewSessionInHistory || !currentActiveSessionId) && sessionIdToSave) {
                 setActiveSessionId(sessionIdToSave);
                 localStorage.setItem(ACTIVE_CHAT_SESSION_ID_KEY, sessionIdToSave);
            }
        }, 500);
    }, [savedSessions, activeSessionId, sessionSaveTimeoutRef, setActiveSessionId]);

    const startNewChat = useCallback((saveCurrent: boolean = true) => {
        logService.info('Starting new chat.', { saveCurrent });
        if (saveCurrent && activeSessionId && messages.length > 0) {
            saveCurrentChatSession(messages, activeSessionId, currentChatSettings);
        }
        if (isLoading && abortControllerRef.current) abortControllerRef.current.abort();

        setMessages([]);

        const newChatSessionSettings: IndividualChatSettings = {
            modelId: currentChatSettings.modelId,
            temperature: appSettings.temperature,
            topP: appSettings.topP,
            showThoughts: appSettings.showThoughts,
            systemInstruction: appSettings.systemInstruction,
            ttsVoice: appSettings.ttsVoice,
            thinkingBudget: appSettings.thinkingBudget,
            lockedApiKey: null,
        };
        setCurrentChatSettings(newChatSessionSettings);

        setActiveSessionId(null);
        localStorage.removeItem(ACTIVE_CHAT_SESSION_ID_KEY);
        setCommandedInput({ text: '', id: Date.now() });
        setSelectedFiles([]);
        setEditingMessageId(null);
        userScrolledUp.current = false;
        setTimeout(() => {
            document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Chat message input"]')?.focus();
        }, 0);
    }, [activeSessionId, messages, currentChatSettings, appSettings, isLoading, saveCurrentChatSession, abortControllerRef, setMessages, setCurrentChatSettings, setCommandedInput, setSelectedFiles, setEditingMessageId, userScrolledUp]);
    
    const loadChatSession = useCallback((sessionId: string, allSessions?: SavedChatSession[]) => {
        logService.info(`Loading chat session: ${sessionId}`);
        const sessionsToSearch = allSessions || savedSessions;
        const sessionToLoad = sessionsToSearch.find(s => s.id === sessionId);
        if (sessionToLoad) {
            if (isLoading && abortControllerRef.current) abortControllerRef.current.abort();

            setMessages(sessionToLoad.messages.map(m => ({
                ...m,
                timestamp: new Date(m.timestamp),
                generationStartTime: m.generationStartTime ? new Date(m.generationStartTime) : undefined,
                generationEndTime: m.generationEndTime ? new Date(m.generationEndTime) : undefined,
                cumulativeTotalTokens: m.cumulativeTotalTokens,
            })));
            setCurrentChatSettings({
                ...sessionToLoad.settings,
                lockedApiKey: sessionToLoad.settings.lockedApiKey || null,
            });
            setActiveSessionId(sessionToLoad.id);
            localStorage.setItem(ACTIVE_CHAT_SESSION_ID_KEY, sessionToLoad.id);
            setCommandedInput({ text: '', id: Date.now() });
            setSelectedFiles([]);
            setEditingMessageId(null);
            userScrolledUp.current = false;
        } else {
            logService.warn(`Session ${sessionId} not found. Starting new chat.`);
            startNewChat(false);
        }
    }, [savedSessions, isLoading, abortControllerRef, setMessages, setCurrentChatSettings, setActiveSessionId, setCommandedInput, setSelectedFiles, setEditingMessageId, userScrolledUp, startNewChat]);

    // Initial data loading
    useEffect(() => {
        try {
            logService.info('Attempting to load chat history from localStorage.');
            const storedSessions = localStorage.getItem(CHAT_HISTORY_SESSIONS_KEY);
            const sessions: SavedChatSession[] = storedSessions ? JSON.parse(storedSessions) : [];
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
                startNewChat(false);
            }
        } catch (error) {
            logService.error("Error loading chat history:", error);
            startNewChat(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only once on mount

     // Session saving logic
    useEffect(() => {
        if (messages.length > 0 || (activeSessionId && savedSessions.find(s => s.id === activeSessionId))) {
            saveCurrentChatSession(messages, activeSessionId, currentChatSettings);
        } else if (messages.length === 0 && !activeSessionId && localStorage.getItem(ACTIVE_CHAT_SESSION_ID_KEY)) {
            localStorage.removeItem(ACTIVE_CHAT_SESSION_ID_KEY);
        }
    }, [messages, activeSessionId, currentChatSettings, saveCurrentChatSession, savedSessions]);
    
    const handleDeleteChatHistorySession = (sessionId: string) => {
        logService.info(`Deleting session: ${sessionId}`);
        const currentSessions = [...savedSessions];
        const updated = currentSessions.filter(s => s.id !== sessionId);

        const sessionsForStorage = applyImageCachePolicy(updated);
        localStorage.setItem(CHAT_HISTORY_SESSIONS_KEY, JSON.stringify(sessionsForStorage));
        setSavedSessions(updated);

        if (activeSessionId === sessionId) {
            const nextSessionToLoad = updated[0];
            if (nextSessionToLoad) {
                 loadChatSession(nextSessionToLoad.id, updated);
            } else {
                startNewChat(false);
            }
        }
    };

    const clearAllHistory = useCallback(() => {
        logService.warn('User clearing all chat history.');
        if (sessionSaveTimeoutRef.current) {
            clearTimeout(sessionSaveTimeoutRef.current);
            sessionSaveTimeoutRef.current = null;
        }
        localStorage.removeItem(CHAT_HISTORY_SESSIONS_KEY);
        setSavedSessions([]);
        startNewChat(false);
    }, [startNewChat, sessionSaveTimeoutRef]);


    return {
        savedSessions,
        setSavedSessions,
        activeSessionId,
        setActiveSessionId,
        loadChatSession,
        startNewChat,
        saveCurrentChatSession,
        handleDeleteChatHistorySession,
        clearAllHistory,
    };
}
