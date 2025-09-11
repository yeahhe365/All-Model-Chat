import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { AppSettings, ChatMessage, ChatSettings as IndividualChatSettings, SavedChatSession, UploadedFile, ChatGroup } from '../types';
import { DEFAULT_CHAT_SETTINGS } from '../constants/appConstants';
import { useModels } from './useModels';
import { useChatHistory } from './useChatHistory';
import { useFileHandling } from './useFileHandling';
import { usePreloadedScenarios } from './usePreloadedScenarios';
import { useMessageHandler } from './useMessageHandler';
import { useChatScroll } from './useChatScroll';
import { useAutoTitling } from './useAutoTitling';
import { useSuggestions } from './useSuggestions';
import { generateUniqueId, getKeyForRequest, logService, createChatHistoryForApi } from '../utils/appUtils';
import { geminiServiceInstance } from '../services/geminiService';
import { Chat } from '@google/genai';
import { getApiClient, buildGenerationConfig } from '../services/api/baseApi';
import { dbService } from '../utils/db';


export const useChat = (appSettings: AppSettings, language: 'en' | 'zh') => {
    // 1. Core application state
    const [savedSessions, setSavedSessions] = useState<SavedChatSession[]>([]);
    const [savedGroups, setSavedGroups] = useState<ChatGroup[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [commandedInput, setCommandedInput] = useState<{ text: string; id: number; } | null>(null);
    const [loadingSessionIds, setLoadingSessionIds] = useState(new Set<string>());
    const [generatingTitleSessionIds, setGeneratingTitleSessionIds] = useState(new Set<string>());
    const activeJobs = useRef(new Map<string, AbortController>());
    const [selectedFiles, setSelectedFiles] = useState<UploadedFile[]>([]);
    const [appFileError, setAppFileError] = useState<string | null>(null);
    const [isAppProcessingFile, setIsAppProcessingFile] = useState<boolean>(false);
    const [aspectRatio, setAspectRatio] = useState<string>('1:1');
    const [ttsMessageId, setTtsMessageId] = useState<string | null>(null);
    const [isSwitchingModel, setIsSwitchingModel] = useState<boolean>(false);
    const userScrolledUp = useRef<boolean>(false);
    const [chat, setChat] = useState<Chat | null>(null);

    const updateAndPersistSessions = useCallback(async (
        updater: (prev: SavedChatSession[]) => SavedChatSession[],
        options: { persist?: boolean } = {}
    ) => {
        const { persist = true } = options;
        let newSessions: SavedChatSession[] = [];
        setSavedSessions(prevSessions => {
            newSessions = updater(prevSessions);
            return newSessions;
        });
        if (persist) {
            await dbService.setAllSessions(newSessions);
            logService.debug('Persisted sessions to IndexedDB.');
        }
    }, []);
    
    const updateAndPersistGroups = useCallback(async (updater: (prev: ChatGroup[]) => ChatGroup[]) => {
        setSavedGroups(prevGroups => {
            const newGroups = updater(prevGroups);
            dbService.setAllGroups(newGroups);
            return newGroups;
        });
    }, []);

    // 2. Derive active session state
    const activeChat = useMemo(() => savedSessions.find(s => s.id === activeSessionId), [savedSessions, activeSessionId]);
    const messages = useMemo(() => activeChat?.messages || [], [activeChat]);
    const currentChatSettings = useMemo(() => activeChat?.settings || DEFAULT_CHAT_SETTINGS, [activeChat]);
    const isLoading = useMemo(() => loadingSessionIds.has(activeSessionId ?? ''), [loadingSessionIds, activeSessionId]);
    
    const setCurrentChatSettings = useCallback((updater: (prevSettings: IndividualChatSettings) => IndividualChatSettings) => {
        if (!activeSessionId) return;
        updateAndPersistSessions(prevSessions =>
            prevSessions.map(s =>
                s.id === activeSessionId
                    ? { ...s, settings: updater(s.settings) }
                    : s
            )
        );
    }, [activeSessionId, updateAndPersistSessions]);

    // Memoize stable dependencies to prevent unnecessary Chat object re-creation
    const nonLoadingMessageCount = useMemo(() => messages.filter(m => !m.isLoading).length, [messages]);
    const {
        modelId,
        systemInstruction,
        temperature,
        topP,
        showThoughts,
        thinkingBudget,
        isGoogleSearchEnabled,
        isCodeExecutionEnabled,
        isUrlContextEnabled,
        lockedApiKey,
    } = currentChatSettings;

    useEffect(() => {
        const activeSession = savedSessions.find(s => s.id === activeSessionId);
        if (!activeSession) {
            setChat(null);
            return;
        }

        const initializeChat = async () => {
            const keyResult = getKeyForRequest(appSettings, activeSession.settings);
            if ('error' in keyResult) {
                logService.error("Could not create chat object: API Key not configured.");
                setChat(null);
                return;
            }
            
            const storedSettings = await dbService.getAppSettings();
            const apiProxyUrl = storedSettings ? storedSettings.apiProxyUrl : null;
            const ai = getApiClient(keyResult.key, apiProxyUrl);
            
            // Use only non-loading messages for history when creating the object
            // This makes the history stable during a streaming response.
            const historyForChat = await createChatHistoryForApi(
                activeSession.messages.filter(m => !m.isLoading)
            );

            const modelIdToUse = activeSession.settings.modelId || appSettings.modelId;
            const newChat = ai.chats.create({
                model: modelIdToUse,
                history: historyForChat,
                config: buildGenerationConfig(
                    modelIdToUse,
                    activeSession.settings.systemInstruction,
                    { temperature: activeSession.settings.temperature, topP: activeSession.settings.topP },
                    activeSession.settings.showThoughts,
                    activeSession.settings.thinkingBudget,
                    activeSession.settings.isGoogleSearchEnabled,
                    activeSession.settings.isCodeExecutionEnabled,
                    activeSession.settings.isUrlContextEnabled
                )
            });
            setChat(newChat);
            logService.info(`Chat object initialized/updated for session ${activeSessionId} with model ${modelIdToUse}`);
        };

        initializeChat();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        activeSessionId, 
        appSettings, 
        nonLoadingMessageCount, // Stable during stream, changes on delete/completion
        modelId,
        systemInstruction,
        temperature,
        topP,
        showThoughts,
        thinkingBudget,
        isGoogleSearchEnabled,
        isCodeExecutionEnabled,
        isUrlContextEnabled,
        lockedApiKey,
    ]);


    // 3. Child hooks for modular logic
    const { apiModels, isModelsLoading, modelsLoadingError } = useModels(appSettings);
    const historyHandler = useChatHistory({ appSettings, setSavedSessions, setSavedGroups, setActiveSessionId, setEditingMessageId, setCommandedInput, setSelectedFiles, activeJobs, updateAndPersistSessions, activeChat, language, updateAndPersistGroups });
    const fileHandler = useFileHandling({ appSettings, selectedFiles, setSelectedFiles, setAppFileError, isAppProcessingFile, setIsAppProcessingFile, currentChatSettings, setCurrentChatSettings: setCurrentChatSettings, });
    const scenarioHandler = usePreloadedScenarios({ startNewChat: historyHandler.startNewChat, updateAndPersistSessions });
    const scrollHandler = useChatScroll({ messages, userScrolledUp });
    const messageHandler = useMessageHandler({ appSettings, messages, isLoading, currentChatSettings, selectedFiles, setSelectedFiles, editingMessageId, setEditingMessageId, setAppFileError, aspectRatio, userScrolledUp, ttsMessageId, setTtsMessageId, activeSessionId, setActiveSessionId, setCommandedInput, activeJobs, loadingSessionIds, setLoadingSessionIds, updateAndPersistSessions, language, scrollContainerRef: scrollHandler.scrollContainerRef, chat });
    useAutoTitling({ appSettings, activeChat, isLoading, updateAndPersistSessions, language, generatingTitleSessionIds, setGeneratingTitleSessionIds });
    useSuggestions({ appSettings, activeChat, isLoading, updateAndPersistSessions, language });
    
    const { loadChatSession, startNewChat, handleDeleteChatHistorySession } = historyHandler;

    useEffect(() => {
        const loadData = async () => await historyHandler.loadInitialData();
        loadData();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    
    // This effect handles the case where the active session is deleted.
    useEffect(() => {
        if (activeSessionId && !savedSessions.find(s => s.id === activeSessionId)) {
            logService.warn(`Active session ${activeSessionId} is no longer available. Switching sessions.`);
            const sortedSessions = [...savedSessions].sort((a,b) => b.timestamp - a.timestamp);
            const nextSession = sortedSessions[0];
            if (nextSession) {
                loadChatSession(nextSession.id, sortedSessions);
            } else {
                // This case handles when the very last session is deleted.
                startNewChat();
            }
        }
    }, [savedSessions, activeSessionId, loadChatSession, startNewChat]);


    const handleTranscribeAudio = useCallback(async (audioFile: File): Promise<string | null> => {
        logService.info('Starting transcription process...');
        setAppFileError(null);
        
        const keyResult = getKeyForRequest(appSettings, currentChatSettings);
        if ('error' in keyResult) {
            setAppFileError(keyResult.error);
            logService.error('Transcription failed: API key error.', { error: keyResult.error });
            return null;
        }
        
        if (keyResult.isNewKey) {
            const fileRequiresApi = selectedFiles.some(f => f.fileUri);
            if (!fileRequiresApi) {
                logService.info('New API key selected for this session due to transcription.');
                setCurrentChatSettings(prev => ({...prev, lockedApiKey: keyResult.key }));
            }
        }
    
        try {
            const modelToUse = appSettings.transcriptionModelId || 'gemini-2.5-flash';
            const transcribedText = await geminiServiceInstance.transcribeAudio(
                keyResult.key,
                audioFile,
                modelToUse,
                {
                    isThinkingEnabled: appSettings.isTranscriptionThinkingEnabled,
                    context: currentChatSettings.systemInstruction,
                    language: appSettings.transcriptionLanguage,
                    enableItn: appSettings.enableItn,
                }
            );
            return transcribedText;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setAppFileError(`Transcription failed: ${errorMessage}`);
            logService.error('Transcription failed in useChat handler', { error });
            return null;
        }
    }, [appSettings, currentChatSettings, setCurrentChatSettings, setAppFileError, selectedFiles]);

    useEffect(() => {
        const handleOnline = () => {
            setAppFileError(currentError => {
                if (currentError && (currentError.toLowerCase().includes('network') || currentError.toLowerCase().includes('fetch'))) {
                    logService.info('Network restored, clearing file processing error.');
                    return null;
                }
                return currentError;
            });
        };
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, []);

    useEffect(() => {
        const isFileProcessing = selectedFiles.some(file => file.isProcessing);
        if (appFileError === 'Wait for files to finish processing.' && !isFileProcessing) {
            setAppFileError(null);
        }
    }, [selectedFiles, appFileError]);

    const messagesForCleanupRef = useRef<ChatMessage[]>([]);
    useEffect(() => {
        const prevFiles = messagesForCleanupRef.current.flatMap(m => m.files || []);
        const currentFiles = savedSessions.flatMap(s => s.messages).flatMap(m => m.files || []);
        const removedFiles = prevFiles.filter(prevFile => !currentFiles.some(currentFile => currentFile.id === prevFile.id));
        removedFiles.forEach(file => { if (file.dataUrl && file.dataUrl.startsWith('blob:')) URL.revokeObjectURL(file.dataUrl); });
        messagesForCleanupRef.current = savedSessions.flatMap(s => s.messages);
    }, [savedSessions]);
    useEffect(() => () => { messagesForCleanupRef.current.flatMap(m => m.files || []).forEach(file => { if (file.dataUrl?.startsWith('blob:')) URL.revokeObjectURL(file.dataUrl); }); }, []);

    useEffect(() => {
        if (!isModelsLoading && apiModels.length > 0 && activeChat && !apiModels.some(m => m.id === activeChat.settings.modelId)) {
            const preferredModelId = apiModels.find(m => m.isPinned)?.id || apiModels[0]?.id;
            if(preferredModelId) {
                updateAndPersistSessions(prev => prev.map(s => s.id === activeSessionId ? {...s, settings: {...s.settings, modelId: preferredModelId }} : s));
            }
        }
    }, [isModelsLoading, apiModels, activeChat, activeSessionId, updateAndPersistSessions]);
    
    const handleSelectModelInHeader = useCallback((modelId: string) => {
        if (!activeSessionId) {
            const newSessionId = generateUniqueId();
            const newSession: SavedChatSession = {
                id: newSessionId, title: 'New Chat', messages: [], timestamp: Date.now(), settings: { ...DEFAULT_CHAT_SETTINGS, ...appSettings, modelId: modelId },
            };
            updateAndPersistSessions(prev => [newSession, ...prev]);
            setActiveSessionId(newSessionId);
        } else {
            if (isLoading) messageHandler.handleStopGenerating();
            if (modelId !== currentChatSettings.modelId) {
                setIsSwitchingModel(true);
                updateAndPersistSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, settings: { ...s.settings, modelId } } : s));
            }
        }
        userScrolledUp.current = false;
    }, [isLoading, currentChatSettings.modelId, updateAndPersistSessions, activeSessionId, userScrolledUp, messageHandler, appSettings, setActiveSessionId]);

    useEffect(() => { if (isSwitchingModel) { const timer = setTimeout(() => setIsSwitchingModel(false), 0); return () => clearTimeout(timer); } }, [isSwitchingModel]);
    
    const handleClearCurrentChat = useCallback(() => {
        if (isLoading) messageHandler.handleStopGenerating();
        if (activeSessionId) {
            updateAndPersistSessions(prev =>
                prev.map(s =>
                    s.id === activeSessionId
                        ? {
                            ...s,
                            messages: [],
                            title: "New Chat",
                            // Resetting lockedApiKey is crucial to allow using new global settings
                            settings: { ...s.settings, lockedApiKey: null }
                          }
                        : s
                )
            );
            setSelectedFiles([]);
        } else {
            startNewChat();
        }
    }, [isLoading, activeSessionId, messageHandler.handleStopGenerating, updateAndPersistSessions, setSelectedFiles, startNewChat]);


     const toggleGoogleSearch = useCallback(() => {
        if (!activeSessionId) return;
        if (isLoading) messageHandler.handleStopGenerating();
        setCurrentChatSettings(prev => ({ ...prev, isGoogleSearchEnabled: !prev.isGoogleSearchEnabled }));
    }, [activeSessionId, isLoading, setCurrentChatSettings, messageHandler]);
    
    const toggleCodeExecution = useCallback(() => {
        if (!activeSessionId) return;
        if (isLoading) messageHandler.handleStopGenerating();
        setCurrentChatSettings(prev => ({ ...prev, isCodeExecutionEnabled: !prev.isCodeExecutionEnabled }));
    }, [activeSessionId, isLoading, setCurrentChatSettings, messageHandler]);

    const toggleUrlContext = useCallback(() => {
        if (!activeSessionId) return;
        if (isLoading) messageHandler.handleStopGenerating();
        setCurrentChatSettings(prev => ({ ...prev, isUrlContextEnabled: !prev.isUrlContextEnabled }));
    }, [activeSessionId, isLoading, setCurrentChatSettings, messageHandler]);
    
    const handleTogglePinCurrentSession = useCallback(() => {
        if (activeSessionId) {
            historyHandler.handleTogglePinSession(activeSessionId);
        }
    }, [activeSessionId, historyHandler.handleTogglePinSession]);

    return {
        messages,
        isLoading,
        loadingSessionIds,
        generatingTitleSessionIds,
        currentChatSettings,
        editingMessageId,
        setEditingMessageId,
        commandedInput,
        setCommandedInput,
        selectedFiles,
        setSelectedFiles,
        appFileError,
        setAppFileError,
        isAppProcessingFile,
        savedSessions,
        savedGroups,
        activeSessionId,
        apiModels,
        isModelsLoading,
        modelsLoadingError,
        isSwitchingModel,
        aspectRatio,
        setAspectRatio,
        ttsMessageId,
        updateAndPersistSessions,
        updateAndPersistGroups,
        // from scrollHandler
        scrollContainerRef: scrollHandler.scrollContainerRef,
        scrollNavVisibility: scrollHandler.scrollNavVisibility,
        onScrollContainerScroll: scrollHandler.handleScroll,
        scrollToPrevTurn: scrollHandler.scrollToPrevTurn,
        scrollToNextTurn: scrollHandler.scrollToNextTurn,
        // from historyHandler
        loadChatSession: historyHandler.loadChatSession,
        startNewChat: historyHandler.startNewChat,
        handleDeleteChatHistorySession: historyHandler.handleDeleteChatHistorySession,
        handleRenameSession: historyHandler.handleRenameSession,
        handleTogglePinSession: historyHandler.handleTogglePinSession,
        handleAddNewGroup: historyHandler.handleAddNewGroup,
        handleDeleteGroup: historyHandler.handleDeleteGroup,
        handleRenameGroup: historyHandler.handleRenameGroup,
        handleMoveSessionToGroup: historyHandler.handleMoveSessionToGroup,
        handleToggleGroupExpansion: historyHandler.handleToggleGroupExpansion,
        clearCacheAndReload: historyHandler.clearCacheAndReload,
        clearAllHistory: historyHandler.clearAllHistory,
        // from fileHandler
        isAppDraggingOver: fileHandler.isAppDraggingOver,
        handleProcessAndAddFiles: fileHandler.handleProcessAndAddFiles,
        handleAppDragEnter: fileHandler.handleAppDragEnter,
        handleAppDragOver: fileHandler.handleAppDragOver,
        handleAppDragLeave: fileHandler.handleAppDragLeave,
        handleAppDrop: fileHandler.handleAppDrop,
        handleCancelFileUpload: fileHandler.handleCancelFileUpload,
        handleAddFileById: fileHandler.handleAddFileById,
        // from messageHandler
        handleSendMessage: messageHandler.handleSendMessage,
        handleStopGenerating: messageHandler.handleStopGenerating,
        handleEditMessage: messageHandler.handleEditMessage,
        handleCancelEdit: messageHandler.handleCancelEdit,
        handleDeleteMessage: messageHandler.handleDeleteMessage,
        handleRetryMessage: messageHandler.handleRetryMessage,
        handleRetryLastTurn: messageHandler.handleRetryLastTurn,
        handleTextToSpeech: messageHandler.handleTextToSpeech,
        handleEditLastUserMessage: messageHandler.handleEditLastUserMessage,
        // from scenarioHandler
        savedScenarios: scenarioHandler.savedScenarios,
        handleSaveAllScenarios: scenarioHandler.handleSaveAllScenarios,
        handleLoadPreloadedScenario: scenarioHandler.handleLoadPreloadedScenario,
        // from this hook
        handleTranscribeAudio,
        setCurrentChatSettings,
        handleSelectModelInHeader,
        handleClearCurrentChat,
        toggleGoogleSearch,
        toggleCodeExecution,
        toggleUrlContext,
        handleTogglePinCurrentSession,
    };
};