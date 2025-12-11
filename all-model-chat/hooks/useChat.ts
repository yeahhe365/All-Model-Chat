
import { useEffect, useRef, useCallback } from 'react';
import { AppSettings, UploadedFile, ChatSettings } from '../types';
import { useModels } from './useModels';
import { useChatHistory } from './useChatHistory';
import { useFileHandling } from './useFileHandling';
import { useFileDragDrop } from './useFileDragDrop';
import { usePreloadedScenarios } from './usePreloadedScenarios';
import { useMessageHandler } from './useMessageHandler';
import { useChatScroll } from './useChatScroll';
import { useAutoTitling } from './useAutoTitling';
import { useSuggestions } from './useSuggestions';
import { useChatState } from './useChatState';
import { useChatActions } from './useChatActions';
import { logService } from '../utils/appUtils';

export const useChat = (appSettings: AppSettings, setAppSettings: React.Dispatch<React.SetStateAction<AppSettings>>, language: 'en' | 'zh') => {
    
    // 1. Core State Management
    const chatState = useChatState(appSettings);
    const {
        savedSessions, setSavedSessions, savedGroups, setSavedGroups,
        activeSessionId, setActiveSessionId,
        editingMessageId, setEditingMessageId,
        commandedInput, setCommandedInput,
        loadingSessionIds, setLoadingSessionIds,
        generatingTitleSessionIds, setGeneratingTitleSessionIds,
        activeJobs,
        selectedFiles, setSelectedFiles,
        appFileError, setAppFileError,
        isAppProcessingFile, setIsAppProcessingFile,
        aspectRatio, setAspectRatio,
        imageSize, setImageSize,
        ttsMessageId, setTtsMessageId,
        isSwitchingModel, setIsSwitchingModel,
        userScrolledUp,
        activeChat, messages, currentChatSettings, isLoading,
        setCurrentChatSettings, updateAndPersistSessions, updateAndPersistGroups,
        fileDraftsRef
    } = chatState;

    // Ref to track which API key was last used for a session (for sticky affinity)
    const sessionKeyMapRef = useRef<Map<string, string>>(new Map());

    // 2. Feature Hooks
    const { apiModels, isModelsLoading, modelsLoadingError, setApiModels } = useModels();
    
    const historyHandler = useChatHistory({ 
        appSettings, setSavedSessions, setSavedGroups, setActiveSessionId, 
        setEditingMessageId, setCommandedInput, setSelectedFiles, activeJobs, 
        updateAndPersistSessions, activeChat, language, updateAndPersistGroups,
        userScrolledUp, selectedFiles, fileDraftsRef, activeSessionId
    });
    
    const fileHandler = useFileHandling({ 
        appSettings, selectedFiles, setSelectedFiles, setAppFileError, 
        isAppProcessingFile, setIsAppProcessingFile, currentChatSettings, 
        setCurrentChatSettings 
    });
    
    const handleAddTempFile = useCallback((file: UploadedFile) => {
        setSelectedFiles(prev => [...prev, file]);
    }, [setSelectedFiles]);

    const handleRemoveTempFile = useCallback((id: string) => {
        setSelectedFiles(prev => prev.filter(f => f.id !== id));
    }, [setSelectedFiles]);
    
    const dragDropHandler = useFileDragDrop({ 
        onFilesDropped: fileHandler.handleProcessAndAddFiles,
        onAddTempFile: handleAddTempFile,
        onRemoveTempFile: handleRemoveTempFile
    });

    const scenarioHandler = usePreloadedScenarios({
        appSettings,
        setAppSettings,
        updateAndPersistSessions,
        setActiveSessionId,
    });
    
    const scrollHandler = useChatScroll({ messages, userScrolledUp });
    
    const messageHandler = useMessageHandler({ 
        appSettings, messages, isLoading, currentChatSettings, selectedFiles, 
        setSelectedFiles, editingMessageId, setEditingMessageId, setAppFileError, 
        aspectRatio, userScrolledUp, ttsMessageId, setTtsMessageId, activeSessionId, 
        setActiveSessionId, setCommandedInput, activeJobs, loadingSessionIds, 
        setLoadingSessionIds, updateAndPersistSessions, language, 
        scrollContainerRef: scrollHandler.scrollContainerRef,
        sessionKeyMapRef // Pass ref to message handler
    });

    useAutoTitling({ appSettings, savedSessions, updateAndPersistSessions, language, generatingTitleSessionIds, setGeneratingTitleSessionIds, sessionKeyMapRef });
    useSuggestions({ appSettings, activeChat, isLoading, updateAndPersistSessions, language, sessionKeyMapRef });

    // 3. Actions & Handlers
    const { loadChatSession, startNewChat, handleDeleteChatHistorySession } = historyHandler;

    const chatActions = useChatActions({
        appSettings,
        activeSessionId,
        isLoading,
        currentChatSettings,
        selectedFiles,
        setActiveSessionId,
        setIsSwitchingModel,
        setAppFileError,
        setCurrentChatSettings,
        setSelectedFiles,
        updateAndPersistSessions,
        handleStopGenerating: messageHandler.handleStopGenerating,
        startNewChat,
        handleTogglePinSession: historyHandler.handleTogglePinSession,
        userScrolledUp
    });

    // 4. Effects
    useEffect(() => {
        const loadData = async () => await historyHandler.loadInitialData();
        loadData();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    
    useEffect(() => {
        if (activeSessionId && !savedSessions.find(s => s.id === activeSessionId)) {
            logService.warn(`Active session ${activeSessionId} is no longer available. Switching sessions.`);
            const sortedSessions = [...savedSessions].sort((a,b) => b.timestamp - a.timestamp);
            const nextSession = sortedSessions[0];
            if (nextSession) {
                loadChatSession(nextSession.id, sortedSessions);
            } else {
                startNewChat();
            }
        }
    }, [savedSessions, activeSessionId, loadChatSession, startNewChat]);

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

    const messagesForCleanupRef = useRef<typeof messages>([]);
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

    useEffect(() => { if (isSwitchingModel) { const timer = setTimeout(() => setIsSwitchingModel(false), 0); return () => clearTimeout(timer); } }, [isSwitchingModel]);

    // Auto-set default aspect ratio for specific image models
    const prevModelIdRef = useRef(currentChatSettings.modelId);
    useEffect(() => {
        if (prevModelIdRef.current !== currentChatSettings.modelId) {
            const modelId = currentChatSettings.modelId;
            const isBananaModel = modelId.includes('gemini-2.5-flash-image') || modelId.includes('gemini-3-pro-image');
            
            if (isBananaModel) {
                setAspectRatio('Auto');
            } else if (aspectRatio === 'Auto') {
                setAspectRatio('1:1');
            }
            prevModelIdRef.current = modelId;
        }
    }, [currentChatSettings.modelId, aspectRatio, setAspectRatio]);

    return {
        // State
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
        setApiModels,
        isModelsLoading,
        modelsLoadingError,
        isSwitchingModel,
        aspectRatio,
        setAspectRatio,
        imageSize,
        setImageSize,
        ttsMessageId,
        
        // Persistence
        updateAndPersistSessions,
        updateAndPersistGroups,
        
        // Scroll
        scrollContainerRef: scrollHandler.scrollContainerRef,
        setScrollContainerRef: scrollHandler.setScrollContainerRef, // New export
        scrollNavVisibility: scrollHandler.scrollNavVisibility,
        onScrollContainerScroll: scrollHandler.handleScroll,
        scrollToPrevTurn: scrollHandler.scrollToPrevTurn,
        scrollToNextTurn: scrollHandler.scrollToNextTurn,
        
        // History
        loadChatSession,
        startNewChat,
        handleDeleteChatHistorySession,
        handleRenameSession: historyHandler.handleRenameSession,
        handleTogglePinSession: historyHandler.handleTogglePinSession,
        handleDuplicateSession: historyHandler.handleDuplicateSession,
        handleAddNewGroup: historyHandler.handleAddNewGroup,
        handleDeleteGroup: historyHandler.handleDeleteGroup,
        handleRenameGroup: historyHandler.handleRenameGroup,
        handleMoveSessionToGroup: historyHandler.handleMoveSessionToGroup,
        handleToggleGroupExpansion: historyHandler.handleToggleGroupExpansion,
        clearCacheAndReload: historyHandler.clearCacheAndReload,
        clearAllHistory: historyHandler.clearAllHistory,
        
        // Files & DragDrop
        isAppDraggingOver: dragDropHandler.isAppDraggingOver,
        isProcessingDrop: dragDropHandler.isProcessingDrop,
        handleProcessAndAddFiles: fileHandler.handleProcessAndAddFiles,
        handleAppDragEnter: dragDropHandler.handleAppDragEnter,
        handleAppDragOver: dragDropHandler.handleAppDragOver,
        handleAppDragLeave: dragDropHandler.handleAppDragLeave,
        handleAppDrop: dragDropHandler.handleAppDrop,
        handleCancelFileUpload: fileHandler.handleCancelFileUpload,
        handleAddFileById: fileHandler.handleAddFileById,
        
        // Messaging
        handleSendMessage: messageHandler.handleSendMessage,
        handleStopGenerating: messageHandler.handleStopGenerating,
        handleEditMessage: messageHandler.handleEditMessage,
        handleCancelEdit: messageHandler.handleCancelEdit,
        handleDeleteMessage: messageHandler.handleDeleteMessage,
        handleRetryMessage: messageHandler.handleRetryMessage,
        handleRetryLastTurn: messageHandler.handleRetryLastTurn,
        handleTextToSpeech: messageHandler.handleTextToSpeech,
        handleEditLastUserMessage: messageHandler.handleEditLastUserMessage,
        
        // Scenarios
        savedScenarios: scenarioHandler.savedScenarios,
        handleSaveAllScenarios: scenarioHandler.handleSaveAllScenarios,
        handleLoadPreloadedScenario: scenarioHandler.handleLoadPreloadedScenario,
        
        // Actions (Control)
        handleTranscribeAudio: chatActions.handleTranscribeAudio,
        setCurrentChatSettings,
        handleSelectModelInHeader: chatActions.handleSelectModelInHeader,
        handleClearCurrentChat: chatActions.handleClearCurrentChat,
        toggleGoogleSearch: chatActions.toggleGoogleSearch,
        toggleCodeExecution: chatActions.toggleCodeExecution,
        toggleUrlContext: chatActions.toggleUrlContext,
        toggleDeepSearch: chatActions.toggleDeepSearch,
        handleTogglePinCurrentSession: chatActions.handleTogglePinCurrentSession,
        handleUpdateMessageContent: chatActions.handleUpdateMessageContent,
        handleUpdateMessageFile: chatActions.handleUpdateMessageFile,
    };
};
