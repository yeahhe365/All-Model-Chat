


import React, { useRef, useCallback } from 'react';
import { AppSettings, UploadedFile } from '../../types';
import { useModels } from '../core/useModels';
import { useChatHistory } from './useChatHistory';
import { useFileHandling } from '../files/useFileHandling';
import { useFileDragDrop } from '../files/useFileDragDrop';
import { usePreloadedScenarios } from '../usePreloadedScenarios';
import { useMessageHandler } from '../useMessageHandler';
import { useChatScroll } from './useChatScroll';
import { useAutoTitling } from './useAutoTitling';
import { useSuggestions } from './useSuggestions';
import { useChatState } from './useChatState';
import { useChatActions } from './useChatActions';
import { useChatEffects } from './useChatEffects';
import { useBackgroundKeepAlive } from '../core/useBackgroundKeepAlive';
import { useLocalPythonAgent } from '../features/useLocalPythonAgent';
import { useChatStore } from '../../stores/chatStore';
import { SavedChatSession, ChatGroup, ChatMessage, InputCommand, UploadedFile as UF } from '../../types';

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
    const ttsMessageId = useChatStore(s => s.ttsMessageId);
    const isSwitchingModel = useChatStore(s => s.isSwitchingModel);

    // Stable store references for setters and persistence
    const storeRef = useChatStore;
    const setActiveSessionId = useCallback((v: string | null | ((prev: string | null) => string | null)) => {
        if (typeof v === 'function') {
            const newVal = v(storeRef.getState().activeSessionId);
            storeRef.getState().setActiveSessionId(newVal);
        } else {
            storeRef.getState().setActiveSessionId(v);
        }
    }, []);
    const setActiveMessages = useCallback((v: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
        if (typeof v === 'function') {
            const newVal = v(storeRef.getState().activeMessages);
            storeRef.getState().setActiveMessages(newVal);
        } else {
            storeRef.getState().setActiveMessages(v);
        }
    }, []);
    const setCommandedInput = useCallback((v: InputCommand | null | ((prev: InputCommand | null) => InputCommand | null)) => {
        if (typeof v === 'function') {
            const newVal = v(storeRef.getState().commandedInput);
            storeRef.getState().setCommandedInput(newVal);
        } else {
            storeRef.getState().setCommandedInput(v);
        }
    }, []);
    const setSavedSessions = useCallback((v: SavedChatSession[] | ((prev: SavedChatSession[]) => SavedChatSession[])) => {
        if (typeof v === 'function') {
            const newVal = v(storeRef.getState().savedSessions);
            storeRef.getState().setSavedSessions(newVal);
        } else {
            storeRef.getState().setSavedSessions(v);
        }
    }, []);
    const setSavedGroups = useCallback((v: ChatGroup[] | ((prev: ChatGroup[]) => ChatGroup[])) => {
        if (typeof v === 'function') {
            const newVal = v(storeRef.getState().savedGroups);
            storeRef.getState().setSavedGroups(newVal);
        } else {
            storeRef.getState().setSavedGroups(v);
        }
    }, []);
    const setEditingMessageId = useCallback((v: string | null | ((prev: string | null) => string | null)) => {
        if (typeof v === 'function') {
            const newVal = v(storeRef.getState().editingMessageId);
            storeRef.getState().setEditingMessageId(newVal);
        } else {
            storeRef.getState().setEditingMessageId(v);
        }
    }, []);
    const setSelectedFiles = useCallback((v: UF[] | ((prev: UF[]) => UF[])) => {
        if (typeof v === 'function') {
            const newVal = v(storeRef.getState().selectedFiles);
            storeRef.getState().setSelectedFiles(newVal);
        } else {
            storeRef.getState().setSelectedFiles(v);
        }
    }, []);
    const setAppFileError = useCallback((v: string | null | ((prev: string | null) => string | null)) => {
        if (typeof v === 'function') {
            const newVal = v(storeRef.getState().appFileError);
            storeRef.getState().setAppFileError(newVal);
        } else {
            storeRef.getState().setAppFileError(v);
        }
    }, []);

    // Direct stable references (no adapter needed)
    const setEditMode = useCallback((v: 'update' | 'resend' | ((prev: 'update' | 'resend') => 'update' | 'resend')) => {
        if (typeof v === 'function') {
            storeRef.getState().setEditMode(v(storeRef.getState().editMode));
        } else {
            storeRef.getState().setEditMode(v);
        }
    }, []);
    const setIsAppProcessingFile = useCallback((v: boolean | ((prev: boolean) => boolean)) => {
        if (typeof v === 'function') {
            storeRef.getState().setIsAppProcessingFile(v(storeRef.getState().isAppProcessingFile));
        } else {
            storeRef.getState().setIsAppProcessingFile(v);
        }
    }, []);
    const setAspectRatio = useCallback((v: string | ((prev: string) => string)) => {
        if (typeof v === 'function') {
            storeRef.getState().setAspectRatio(v(storeRef.getState().aspectRatio));
        } else {
            storeRef.getState().setAspectRatio(v);
        }
    }, []);
    const setTtsMessageId = useCallback((v: string | null | ((prev: string | null) => string | null)) => {
        if (typeof v === 'function') {
            storeRef.getState().setTtsMessageId(v(storeRef.getState().ttsMessageId));
        } else {
            storeRef.getState().setTtsMessageId(v);
        }
    }, []);
    const setIsSwitchingModel = useCallback((v: boolean | ((prev: boolean) => boolean)) => {
        if (typeof v === 'function') {
            storeRef.getState().setIsSwitchingModel(v(storeRef.getState().isSwitchingModel));
        } else {
            storeRef.getState().setIsSwitchingModel(v);
        }
    }, []);
    const setLoadingSessionIds = useCallback((v: Set<string> | ((prev: Set<string>) => Set<string>)) => {
        if (typeof v === 'function') {
            storeRef.getState().setLoadingSessionIds(v(storeRef.getState().loadingSessionIds));
        } else {
            storeRef.getState().setLoadingSessionIds(v);
        }
    }, []);
    const setGeneratingTitleSessionIds = useCallback((v: Set<string> | ((prev: Set<string>) => Set<string>)) => {
        if (typeof v === 'function') {
            storeRef.getState().setGeneratingTitleSessionIds(v(storeRef.getState().generatingTitleSessionIds));
        } else {
            storeRef.getState().setGeneratingTitleSessionIds(v);
        }
    }, []);

    // Non-state values from store
    const activeJobs = storeRef.getState()._activeJobs;
    const userScrolledUpRef = storeRef.getState()._userScrolledUp;
    const fileDraftsRef = storeRef.getState()._fileDrafts;

    // Persistence
    const updateAndPersistSessions = storeRef.getState().updateAndPersistSessions;
    const updateAndPersistGroups = storeRef.getState().updateAndPersistGroups;
    const setSessionLoading = storeRef.getState().setSessionLoading;
    const setCurrentChatSettings = storeRef.getState().setCurrentChatSettings;

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
        updateAndPersistSessions: updateAndPersistSessions as any,
        setActiveSessionId,
    });

    const scrollHandler = useChatScroll({ messages, userScrolledUpRef });

    const messageHandler = useMessageHandler({
        appSettings, messages, isLoading, currentChatSettings, selectedFiles,
        setSelectedFiles, editingMessageId, setEditingMessageId, setEditMode, setAppFileError,
        aspectRatio, userScrolledUpRef, ttsMessageId, setTtsMessageId, activeSessionId,
        setActiveSessionId, setCommandedInput, activeJobs, loadingSessionIds,
        setLoadingSessionIds, updateAndPersistSessions, language,
        scrollContainerRef: scrollHandler.scrollContainerRef,
        sessionKeyMapRef,
        setSessionLoading
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
        handleStopGenerating: messageHandler.handleStopGenerating,
        startNewChat,
        handleTogglePinSession: historyHandler.handleTogglePinSession,
        userScrolledUpRef
    });

    // Auto-Agent for Local Python
    useLocalPythonAgent({
        messages,
        appSettings,
        currentChatSettings,
        isLoading,
        activeSessionId,
        updateMessageContent: chatActions.handleUpdateMessageContent,
        onContinueGeneration: messageHandler.handleContinueGeneration,
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
        startNewChat,
        messages
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
        ttsMessageId,

        // Persistence
        updateAndPersistSessions,
        updateAndPersistGroups,

        // Scroll
        scrollContainerRef: scrollHandler.scrollContainerRef,
        setScrollContainerRef: scrollHandler.setScrollContainerRef,
        onScrollContainerScroll: scrollHandler.handleScroll,

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
        handleSendMessage: messageHandler.handleSendMessage,
        handleGenerateCanvas: messageHandler.handleGenerateCanvas,
        handleStopGenerating: messageHandler.handleStopGenerating,
        handleEditMessage: messageHandler.handleEditMessage,
        handleCancelEdit: messageHandler.handleCancelEdit,
        handleDeleteMessage: messageHandler.handleDeleteMessage,
        handleRetryMessage: messageHandler.handleRetryMessage,
        handleRetryLastTurn: messageHandler.handleRetryLastTurn,
        handleTextToSpeech: messageHandler.handleTextToSpeech,
        handleQuickTTS: messageHandler.handleQuickTTS,
        handleEditLastUserMessage: messageHandler.handleEditLastUserMessage,
        handleContinueGeneration: messageHandler.handleContinueGeneration,

        // Scenarios
        savedScenarios: scenarioHandler.savedScenarios,
        handleSaveAllScenarios: scenarioHandler.handleSaveAllScenarios,
        handleLoadPreloadedScenario: scenarioHandler.handleLoadPreloadedScenario,

        // Actions
        handleTranscribeAudio: chatActions.handleTranscribeAudio,
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
    };
};
