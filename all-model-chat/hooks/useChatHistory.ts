import { useState, useEffect, useCallback, Dispatch, SetStateAction } from 'react';
import { AppSettings, ChatMessage, SavedChatSession, ChatSettings as IndividualChatSettings, UploadedFile } from '../types';
import { CHAT_HISTORY_SESSIONS_KEY, ACTIVE_CHAT_SESSION_ID_KEY } from '../constants/appConstants';
import { SUPPORTED_IMAGE_MIME_TYPES } from '../constants/fileConstants';
import { generateUniqueId, generateSessionTitle } from '../utils/appUtils';
import { logService } from '../services/logService';
import { imageDbService } from '../services/imageDbService';

interface ChatHistoryProps {
    appSettings: AppSettings;
    messages: ChatMessage[];
    setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
    currentChatSettings: IndividualChatSettings;
    setCurrentChatSettings: Dispatch<SetStateAction<IndividualChatSettings>>;
    setInputText: Dispatch<SetStateAction<string>>;
    setSelectedFiles: Dispatch<SetStateAction<UploadedFile[]>>;
    setEditingMessageId: Dispatch<SetStateAction<string | null>>;
    isLoading: boolean;
    abortControllerRef: React.MutableRefObject<AbortController | null>;
    sessionSaveTimeoutRef: React.MutableRefObject<number | null>;
    userScrolledUp: React.MutableRefObject<boolean>;
}

export const useChatHistory = ({
    appSettings,
    messages,
    setMessages,
    currentChatSettings,
    setCurrentChatSettings,
    setInputText,
    setSelectedFiles,
    setEditingMessageId,
    isLoading,
    abortControllerRef,
    sessionSaveTimeoutRef,
    userScrolledUp,
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
            
            const finalSessionId = sessionIdToSave;

            currentMessages.forEach(msg => {
                if (msg.files) {
                    msg.files.forEach(file => {
                        if (SUPPORTED_IMAGE_MIME_TYPES.includes(file.type) && file.dataUrl) {
                            imageDbService.addImage(finalSessionId, file).catch(err => {
                                logService.error(`Failed to save image ${file.id} to IndexedDB`, err);
                            });
                        }
                    });
                }
            });

            const existingSession = savedSessions.find(s => s.id === sessionIdToSave);
            
            const sessionToSave: SavedChatSession = {
                id: sessionIdToSave,
                title: generateSessionTitle(currentMessages),
                timestamp: Date.now(),
                messages: currentMessages.map(msg => ({ 
                    ...msg,
                    files: msg.files?.map(f => {
                        const { abortController, rawFile, ...rest } = f; 
                        return { ...rest, dataUrl: SUPPORTED_IMAGE_MIME_TYPES.includes(f.type) ? undefined : f.dataUrl };
                    })
                })),
                settings: currentSettingsToSave,
            };

            if (existingSession) {
                const areMessagesSame = JSON.stringify(existingSession.messages) === JSON.stringify(sessionToSave.messages);
                const areSettingsSame = JSON.stringify(existingSession.settings) === JSON.stringify(sessionToSave.settings);
            
                if (areMessagesSame && areSettingsSame) {
                    return;
                }
    
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

                localStorage.setItem(CHAT_HISTORY_SESSIONS_KEY, JSON.stringify(updatedSessions));

                return updatedSessions;
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
        setInputText('');
        setSelectedFiles([]);
        setEditingMessageId(null);
        userScrolledUp.current = false;
        setTimeout(() => {
            document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Chat message input"]')?.focus();
        }, 0);
    }, [activeSessionId, messages, currentChatSettings, appSettings, isLoading, saveCurrentChatSession, abortControllerRef, setMessages, setCurrentChatSettings, setInputText, setSelectedFiles, setEditingMessageId, userScrolledUp]);
    
    const loadChatSession = useCallback(async (sessionId: string, allSessions?: SavedChatSession[]) => {
        logService.info(`Loading chat session: ${sessionId}`);
        const sessionsToSearch = allSessions || savedSessions;
        const sessionToLoad = sessionsToSearch.find(s => s.id === sessionId);
        if (sessionToLoad) {
            if (isLoading && abortControllerRef.current) abortControllerRef.current.abort();

            const imagesFromDb = await imageDbService.getImagesForSession(sessionId);
            const imageMap = new Map(imagesFromDb.map(img => [img.id, img.dataUrl]));

            const messagesWithImages = sessionToLoad.messages.map(msg => {
                if (!msg.files) return msg;
                const updatedFiles = msg.files.map(file => {
                    if (SUPPORTED_IMAGE_MIME_TYPES.includes(file.type) && !file.dataUrl && imageMap.has(file.id)) {
                        return { ...file, dataUrl: imageMap.get(file.id) };
                    }
                    return file;
                });
                return { ...msg, files: updatedFiles };
            });

            setMessages(messagesWithImages.map(m => ({
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
            setInputText('');
            setSelectedFiles([]);
            setEditingMessageId(null);
            userScrolledUp.current = false;
        } else {
            logService.warn(`Session ${sessionId} not found. Starting new chat.`);
            startNewChat(false);
        }
    }, [savedSessions, isLoading, abortControllerRef, setMessages, setCurrentChatSettings, setActiveSessionId, setInputText, setSelectedFiles, setEditingMessageId, userScrolledUp, startNewChat]);

    // Initial data loading
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                logService.info('Attempting to load chat history from localStorage.');
                const storedSessions = localStorage.getItem(CHAT_HISTORY_SESSIONS_KEY);
                const sessions: SavedChatSession[] = storedSessions ? JSON.parse(storedSessions) : [];
                sessions.sort((a,b) => b.timestamp - a.timestamp);
                setSavedSessions(sessions);

                const storedActiveId = localStorage.getItem(ACTIVE_CHAT_SESSION_ID_KEY);
                if (storedActiveId && sessions.find(s => s.id === storedActiveId)) {
                    await loadChatSession(storedActiveId, sessions);
                } else if (sessions.length > 0) {
                    logService.info('No active session ID, loading most recent session.');
                    await loadChatSession(sessions[0].id, sessions);
                } else {
                    logService.info('No history found, starting fresh chat.');
                    startNewChat(false);
                }
            } catch (error) {
                logService.error("Error loading chat history:", error);
                startNewChat(false);
            }
        };
        loadInitialData();
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

    // Cleanup logic for old session images
    useEffect(() => {
        const cleanupOldImages = async () => {
            if (savedSessions.length <= 3) return;

            const sessionsToKeep = new Set(savedSessions.slice(0, 3).map(s => s.id));
            try {
                const allStoredSessionIds = await imageDbService.getAllSessionIds();
                const sessionsToDelete = allStoredSessionIds.filter(id => !sessionsToKeep.has(id));
                
                if (sessionsToDelete.length > 0) {
                    logService.info('Cleaning up images from old sessions', { sessionIds: sessionsToDelete });
                    await Promise.all(sessionsToDelete.map(id => imageDbService.deleteImagesForSession(id)));
                }
            } catch (error) {
                logService.error('Error during old image cleanup', error);
            }
        };

        cleanupOldImages();
    }, [savedSessions]);
    
    const handleDeleteChatHistorySession = (sessionId: string) => {
        logService.info(`Deleting session: ${sessionId}`);
        imageDbService.deleteImagesForSession(sessionId).catch(err => logService.error(`Failed to delete images for session ${sessionId}`, err));
        setSavedSessions(prev => {
            const updated = prev.filter(s => s.id !== sessionId);
            localStorage.setItem(CHAT_HISTORY_SESSIONS_KEY, JSON.stringify(updated));
            return updated;
        });
        if (activeSessionId === sessionId) {
            const nextSessionToLoad = savedSessions.find(s => s.id !== sessionId);
            if (nextSessionToLoad) {
                 loadChatSession(nextSessionToLoad.id);
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
        savedSessions.forEach(session => {
            imageDbService.deleteImagesForSession(session.id).catch(err => logService.error(`Failed to delete images for session ${session.id}`, err));
        });
        localStorage.removeItem(CHAT_HISTORY_SESSIONS_KEY);
        setSavedSessions([]);
        startNewChat(false);
    }, [startNewChat, sessionSaveTimeoutRef, savedSessions]);


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