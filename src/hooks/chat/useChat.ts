

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
import { useLocalPythonAgent } from '../features/useLocalPythonAgent';
import { useChatStore } from '../../stores/chatStore';
import { useMessageActions } from './messages/useMessageActions';
import { useTextToSpeechHandler } from './messages/useTextToSpeechHandler';
import { createLiveClientFunctions } from '../live-api/liveClientFunctions';
import { pyodideService } from '../../services/pyodideService';

export const useChat = (appSettings: AppSettings, setAppSettings: React.Dispatch<React.SetStateAction<AppSettings>>, language: 'en' | 'zh') => {

    // Computed state — reactive values that require derivation
    const { activeChat, currentChatSettings, isLoading, activeSessionId, savedSessions, activeMessages } = useChatState(appSettings);

    // Reactive store values via selectors
    const savedGroups = useChatStore(s => s.savedGroups);
    const editingMessageId = useChatStore(s => s.editingMessageId);
    const editMode = useChatStore(s => s.editMode);
    const commandedInput = useChatStore(s => s.commandedInput);
    const loadingSessionIds = useChatStore(s => s.loadingSessionIds);
    const generatingTitleSessionIds = useChatStore(s => s.generatingTitleSessionIds);
    const selectedFiles = useChatStore(s => s.selectedFiles);
    const appFileError = useChatStore(s => s.appFileError);
    const isAppProcessingFile = useChatStore(s => s.isAppProcessingFile);
    const aspectRatio = useChatStore(s => s.aspectRatio);
    const imageSize = useChatStore(s => s.imageSize);
    const isSwitchingModel = useChatStore(s => s.isSwitchingModel);

    const setActiveSessionId = useChatStore((s) => s.setActiveSessionId);
    const setActiveMessages = useChatStore((s) => s.setActiveMessages);
    const setCommandedInput = useChatStore((s) => s.setCommandedInput);
    const setSavedSessions = useChatStore((s) => s.setSavedSessions);
    const setSavedGroups = useChatStore((s) => s.setSavedGroups);
    const setEditingMessageId = useChatStore((s) => s.setEditingMessageId);
    const setSelectedFiles = useChatStore((s) => s.setSelectedFiles);
    const setAppFileError = useChatStore((s) => s.setAppFileError);
    const setEditMode = useChatStore((s) => s.setEditMode);
    const setIsAppProcessingFile = useChatStore((s) => s.setIsAppProcessingFile);
    const setAspectRatio = useChatStore((s) => s.setAspectRatio);
    const setIsSwitchingModel = useChatStore((s) => s.setIsSwitchingModel);
    const setGeneratingTitleSessionIds = useChatStore((s) => s.setGeneratingTitleSessionIds);
    const updateAndPersistSessions = useChatStore((s) => s.updateAndPersistSessions);
    const updateAndPersistGroups = useChatStore((s) => s.updateAndPersistGroups);
    const setSessionLoading = useChatStore((s) => s.setSessionLoading);
    const setCurrentChatSettings = useChatStore((s) => s.setCurrentChatSettings);

    // Non-state values from store
    const activeJobs = useChatStore.getState()._activeJobs;
    const userScrolledUp = useChatStore.getState()._userScrolledUp;
    const fileDraftsRef = useChatStore.getState()._fileDrafts;

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
        updateAndPersistSessions: updateAndPersistSessions as any, activeChat, language, updateAndPersistGroups: updateAndPersistGroups as any,
        userScrolledUp, selectedFiles, fileDraftsRef, activeSessionId,
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
        updateAndPersistSessions: updateAndPersistSessions as any,
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
        userScrolledUp,
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
        userScrolledUp,
        handleSendMessage: messageSender.handleSendMessage,
        setSessionLoading,
    });

    const liveClientFunctions = useMemo(
        () =>
            createLiveClientFunctions({
                isLocalPythonEnabled:
                    !!currentChatSettings.isLocalPythonEnabled || !!appSettings.isLocalPythonEnabled,
                selectedFiles,
                mountFiles: (files) => pyodideService.mountFiles(files),
                runPython: (code) => pyodideService.runPython(code),
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
        userScrolledUp
    });

    // Auto-Agent for Local Python
    useLocalPythonAgent({
        messages,
        appSettings,
        currentChatSettings,
        isLoading,
        activeSessionId,
        updateMessageContent: chatActions.handleUpdateMessageContent,
        onContinueGeneration: messageActions.handleContinueGeneration,
        updateAndPersistSessions
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
