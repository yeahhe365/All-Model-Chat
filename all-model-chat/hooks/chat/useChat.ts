
import React, { useRef, useCallback } from 'react';
import { AppSettings, UploadedFile } from '../../types';
import { useModels } from '../core/useModels';
import { useChatHistory } from './useChatHistory';
import { useFileHandling } from '../useFileHandling';
import { useFileDragDrop } from '../useFileDragDrop';
import { usePreloadedScenarios } from '../usePreloadedScenarios';
import { useMessageHandler } from '../useMessageHandler';
import { useChatScroll } from './useChatScroll';
import { useAutoTitling } from './useAutoTitling';
import { useSuggestions } from './useSuggestions';
import { useChatState } from './useChatState';
import { useChatActions } from './useChatActions';
import { useChatEffects } from './useChatEffects';

export const useChat = (appSettings: AppSettings, setAppSettings: React.Dispatch<React.SetStateAction<AppSettings>>, language: 'en' | 'zh') => {
    
    // 1. Core State Management
    const chatState = useChatState(appSettings);
    const {
        savedSessions, setSavedSessions, savedGroups, setSavedGroups,
        activeSessionId, setActiveSessionId,
        editingMessageId, setEditingMessageId,
        editMode, setEditMode,
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
        setSelectedFiles, editingMessageId, setEditingMessageId, setEditMode, setAppFileError, 
        aspectRatio, userScrolledUp, ttsMessageId, setTtsMessageId, activeSessionId, 
        setActiveSessionId, setCommandedInput, activeJobs, loadingSessionIds, 
        setLoadingSessionIds, updateAndPersistSessions, language, 
        scrollContainerRef: scrollHandler.scrollContainerRef,
        sessionKeyMapRef
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

    // 4. Effects (Modularized)
    useChatEffects({
        activeSessionId,
        savedSessions,
        selectedFiles,
        appFileError,
        setAppFileError,
        isModelsLoading,
        apiModels,
        activeChat,
        updateAndPersistSessions,
        isSwitchingModel,
        setIsSwitchingModel,
        currentChatSettings,
        aspectRatio,
        setAspectRatio,
        loadInitialData: historyHandler.loadInitialData,
        loadChatSession,
        startNewChat,
        messages
    });

    return {
        // State
        messages,
        isLoading,
        loadingSessionIds,
        generatingTitleSessionIds,
        currentChatSettings,
        editingMessageId,
        setEditingMessageId,
        editMode,
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
        setScrollContainerRef: scrollHandler.setScrollContainerRef,
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
        handleGenerateCanvas: messageHandler.handleGenerateCanvas,
        handleStopGenerating: messageHandler.handleStopGenerating,
        handleEditMessage: messageHandler.handleEditMessage,
        handleCancelEdit: messageHandler.handleCancelEdit,
        handleDeleteMessage: messageHandler.handleDeleteMessage,
        handleRetryMessage: messageHandler.handleRetryMessage,
        handleRetryLastTurn: messageHandler.handleRetryLastTurn,
        handleTextToSpeech: messageHandler.handleTextToSpeech,
        handleEditLastUserMessage: messageHandler.handleEditLastUserMessage,
        handleContinueGeneration: messageHandler.handleContinueGeneration,
        
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
        handleAddUserMessage: chatActions.handleAddUserMessage,
        handleLiveTranscript: chatActions.handleLiveTranscript,
    };
};
