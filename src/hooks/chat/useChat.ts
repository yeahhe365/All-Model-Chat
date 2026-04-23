

import React, { useRef, useCallback, useMemo } from 'react';
import { AppSettings, UploadedFile } from '../../types';
import { useModels } from '../core/useModels';
import { useChatHistory } from './useChatHistory';
import { useFileHandling } from '../files/useFileHandling';
import { useFileDragDrop } from '../files/useFileDragDrop';
import { usePreloadedScenarios } from '../usePreloadedScenarios';
import { useMessageSender } from '../useMessageSender';
import { useChatScroll } from './useChatScroll';
import { useAutoTitling } from './useAutoTitling';
import { useSuggestions } from './useSuggestions';
import { useChatState } from './useChatState';
import { useChatActions } from './useChatActions';
import { useChatEffects } from './useChatEffects';
import { useBackgroundKeepAlive } from '../core/useBackgroundKeepAlive';
import { useMessageActions } from './messages/useMessageActions';
import { useTextToSpeechHandler } from './messages/useTextToSpeechHandler';
import { createLiveClientFunctions } from '../live-api/liveClientFunctions';
import { getPyodideService } from '../../services/loadPyodideService';
import { useChatStoreBindings } from './useChatStoreBindings';

export const useChat = (appSettings: AppSettings, setAppSettings: React.Dispatch<React.SetStateAction<AppSettings>>, language: 'en' | 'zh') => {

    // Computed state — reactive values that require derivation
    const { activeChat, currentChatSettings, isLoading, activeSessionId, savedSessions, activeMessages } = useChatState(appSettings);

    const {
        savedGroups,
        editingMessageId,
        editMode,
        commandedInput,
        loadingSessionIds,
        generatingTitleSessionIds,
        selectedFiles,
        appFileError,
        isAppProcessingFile,
        aspectRatio,
        imageSize,
        imageOutputMode,
        personGeneration,
        isSwitchingModel,
        setActiveSessionId,
        setActiveMessages,
        setCommandedInput,
        setSavedSessions,
        setSavedGroups,
        setEditingMessageId,
        setSelectedFiles,
        setAppFileError,
        setEditMode,
        setIsAppProcessingFile,
        setAspectRatio,
        setImageSize,
        setIsSwitchingModel,
        setGeneratingTitleSessionIds,
        updateAndPersistSessions,
        updateAndPersistGroups,
        setSessionLoading,
        setCurrentChatSettings,
        activeJobs,
        userScrolledUpRef,
        fileDraftsRef,
    } = useChatStoreBindings();

    // Aliases
    const messages = activeMessages;

    // Optimize background performance when loading
    useBackgroundKeepAlive(isLoading);

    const sessionKeyMapRef = useRef<Map<string, string>>(new Map());

    const { apiModels: apiModelsFromHook, isModelsLoading, modelsLoadingError, setApiModels } = useModels();

    const effectiveApiModels = apiModelsFromHook;

    const historyHandler = useChatHistory({
        appSettings, setSavedSessions, setSavedGroups, setActiveSessionId, setActiveMessages,
        setEditingMessageId, setCommandedInput, setSelectedFiles, activeJobs,
        updateAndPersistSessions, activeChat, language, updateAndPersistGroups,
        userScrolledUpRef, selectedFiles, fileDraftsRef, activeSessionId,
        savedSessions
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

    const scrollHandler = useChatScroll();

    const messageSender = useMessageSender({
        appSettings,
        currentChatSettings,
        messages,
        selectedFiles,
        setSelectedFiles,
        editingMessageId,
        setEditingMessageId,
        setAppFileError,
        aspectRatio,
        imageSize,
        imageOutputMode,
        personGeneration,
        userScrolledUpRef,
        activeSessionId,
        setActiveSessionId,
        activeJobs,
        updateAndPersistSessions,
        sessionKeyMapRef,
        language,
        setSessionLoading,
    });

    const messageActions = useMessageActions({
        messages,
        isLoading,
        activeSessionId,
        editingMessageId,
        activeJobs,
        setCommandedInput,
        setSelectedFiles,
        setEditingMessageId,
        setEditMode,
        setAppFileError,
        updateAndPersistSessions,
        userScrolledUpRef,
        handleSendMessage: messageSender.handleSendMessage,
        setSessionLoading,
    });

    const liveClientFunctions = useMemo(
        () =>
            createLiveClientFunctions({
                isLocalPythonEnabled:
                    !!currentChatSettings.isLocalPythonEnabled || !!appSettings.isLocalPythonEnabled,
                selectedFiles,
                runPython: async (code, options) => {
                    const pyodideService = await getPyodideService();
                    return pyodideService.runPython(code, options);
                },
            }),
        [appSettings.isLocalPythonEnabled, currentChatSettings.isLocalPythonEnabled, selectedFiles],
    );

    const { handleQuickTTS } = useTextToSpeechHandler({
        appSettings,
        currentChatSettings,
    });

    useAutoTitling({ appSettings, activeChat, updateAndPersistSessions, language, generatingTitleSessionIds, setGeneratingTitleSessionIds, sessionKeyMapRef });
    useSuggestions({ appSettings, activeChat, isLoading, updateAndPersistSessions, language, sessionKeyMapRef });

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
        handleStopGenerating: messageActions.handleStopGenerating,
        startNewChat,
        handleTogglePinSession: historyHandler.handleTogglePinSession,
        userScrolledUpRef
    });

    useChatEffects({
        activeSessionId,
        savedSessions,
        selectedFiles,
        appFileError,
        setAppFileError,
        isModelsLoading,
        apiModels: effectiveApiModels,
        activeChat,
        updateAndPersistSessions,
        isSwitchingModel,
        setIsSwitchingModel,
        currentChatSettings,
        aspectRatio,
        setAspectRatio,
        imageSize,
        setImageSize,
        loadInitialData: historyHandler.loadInitialData,
        loadChatSession,
        startNewChat
    });

    return {
        // Computed state
        messages,
        isLoading,
        currentChatSettings,
        activeChat,

        // Store state (reactive via selectors)
        loadingSessionIds,
        generatingTitleSessionIds,
        editingMessageId,
        editMode,
        commandedInput,
        selectedFiles,
        appFileError,
        isAppProcessingFile,
        savedSessions,
        savedGroups,
        activeSessionId,
        apiModels: effectiveApiModels,
        setApiModels,
        isModelsLoading,
        modelsLoadingError,
        isSwitchingModel,
        aspectRatio,
        imageSize,

        // Persistence
        updateAndPersistSessions,
        updateAndPersistGroups,

        // Scroll
        scrollContainerRef: scrollHandler.scrollContainerRef,
        setScrollContainerRef: scrollHandler.setScrollContainerRef,

        // History handlers
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

        // Drag/drop & Files
        isAppDraggingOver: dragDropHandler.isAppDraggingOver,
        isProcessingDrop: dragDropHandler.isProcessingDrop,
        handleProcessAndAddFiles: fileHandler.handleProcessAndAddFiles,
        handleAppDragEnter: dragDropHandler.handleAppDragEnter,
        handleAppDragOver: dragDropHandler.handleAppDragOver,
        handleAppDragLeave: dragDropHandler.handleAppDragLeave,
        handleAppDrop: dragDropHandler.handleAppDrop,
        handleCancelFileUpload: fileHandler.handleCancelFileUpload,
        handleCancelUpload: fileHandler.handleCancelFileUpload,
        handleAddFileById: fileHandler.handleAddFileById,

        // Message handlers
        handleSendMessage: messageSender.handleSendMessage,
        handleGenerateCanvas: messageSender.handleGenerateCanvas,
        handleStopGenerating: messageActions.handleStopGenerating,
        handleEditMessage: messageActions.handleEditMessage,
        handleCancelEdit: messageActions.handleCancelEdit,
        handleDeleteMessage: messageActions.handleDeleteMessage,
        handleRetryMessage: messageActions.handleRetryMessage,
        handleRetryLastTurn: messageActions.handleRetryLastTurn,
        handleQuickTTS,
        handleEditLastUserMessage: messageActions.handleEditLastUserMessage,
        handleContinueGeneration: messageActions.handleContinueGeneration,

        // Scenarios
        savedScenarios: scenarioHandler.savedScenarios,
        handleSaveAllScenarios: scenarioHandler.handleSaveAllScenarios,
        handleLoadPreloadedScenario: scenarioHandler.handleLoadPreloadedScenario,

        // Actions
        handleTranscribeAudio: chatActions.handleTranscribeAudio,
        setCommandedInput,
        setCurrentChatSettings,
        handleSelectModelInHeader: chatActions.handleSelectModelInHeader,
        handleClearCurrentChat: chatActions.handleClearCurrentChat,
        toggleGoogleSearch: chatActions.toggleGoogleSearch,
        toggleCodeExecution: chatActions.toggleCodeExecution,
        toggleLocalPython: chatActions.toggleLocalPython,
        toggleUrlContext: chatActions.toggleUrlContext,
        toggleDeepSearch: chatActions.toggleDeepSearch,
        handleTogglePinCurrentSession: chatActions.handleTogglePinCurrentSession,
        handleUpdateMessageContent: chatActions.handleUpdateMessageContent,
        handleUpdateMessageFile: chatActions.handleUpdateMessageFile,
        handleAddUserMessage: chatActions.handleAddUserMessage,
        handleLiveTranscript: chatActions.handleLiveTranscript,
        liveClientFunctions,
    };
};
