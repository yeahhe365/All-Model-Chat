
import { useMemo } from 'react';
import { AppSettings } from '../../types';
import { useChatStore } from '../../stores/chatStore';

export const useChatState = (appSettings: AppSettings) => {

    const activeSessionId = useChatStore((s) => s.activeSessionId);
    const savedSessions = useChatStore((s) => s.savedSessions);
    const activeMessages = useChatStore((s) => s.activeMessages);
    const editingMessageId = useChatStore((s) => s.editingMessageId);
    const editMode = useChatStore((s) => s.editMode);
    const commandedInput = useChatStore((s) => s.commandedInput);
    const loadingSessionIds = useChatStore((s) => s.loadingSessionIds);
    const generatingTitleSessionIds = useChatStore((s) => s.generatingTitleSessionIds);
    const selectedFiles = useChatStore((s) => s.selectedFiles);
    const appFileError = useChatStore((s) => s.appFileError);
    const isAppProcessingFile = useChatStore((s) => s.isAppProcessingFile);
    const aspectRatio = useChatStore((s) => s.aspectRatio);
    const imageSize = useChatStore((s) => s.imageSize);
    const ttsMessageId = useChatStore((s) => s.ttsMessageId);
    const isSwitchingModel = useChatStore((s) => s.isSwitchingModel);
    const scrollContainerRef = useChatStore((s) => s.scrollContainerRef);

    // --- Computed State ---

    const activeChat = useMemo(() => {
        const metadata = savedSessions.find(s => s.id === activeSessionId);
        if (metadata) {
            return { ...metadata, messages: activeMessages };
        }
        return undefined;
    }, [savedSessions, activeSessionId, activeMessages]);

    const currentChatSettings = useMemo(() => activeChat?.settings || appSettings, [activeChat, appSettings]);

    const isLoading = useMemo(() =>
        loadingSessionIds.has(activeSessionId ?? ''),
    [loadingSessionIds, activeSessionId]);

    // Aggregate everything into a single return object
    return {
        // Session Data
        savedSessions,
        setSavedSessions: useChatStore.getState().setSavedSessions,
        savedGroups: useChatStore((s) => s.savedGroups),
        setSavedGroups: useChatStore.getState().setSavedGroups,
        activeSessionId,
        setActiveSessionId: useChatStore.getState().setActiveSessionId,
        activeMessages,
        setActiveMessages: useChatStore.getState().setActiveMessages,
        messages: activeMessages,

        // Auxiliary State
        editingMessageId,
        setEditingMessageId: useChatStore.getState().setEditingMessageId,
        editMode,
        setEditMode: useChatStore.getState().setEditMode,
        commandedInput,
        setCommandedInput: useChatStore.getState().setCommandedInput,
        loadingSessionIds,
        setLoadingSessionIds: useChatStore.getState().setLoadingSessionIds,
        generatingTitleSessionIds,
        setGeneratingTitleSessionIds: useChatStore.getState().setGeneratingTitleSessionIds,
        activeJobs: useChatStore.getState()._activeJobs,
        selectedFiles,
        setSelectedFiles: useChatStore.getState().setSelectedFiles,
        appFileError,
        setAppFileError: useChatStore.getState().setAppFileError,
        isAppProcessingFile,
        setIsAppProcessingFile: useChatStore.getState().setIsAppProcessingFile,
        aspectRatio,
        setAspectRatio: useChatStore.getState().setAspectRatio,
        imageSize,
        setImageSize: useChatStore.getState().setImageSize,
        ttsMessageId,
        setTtsMessageId: useChatStore.getState().setTtsMessageId,
        isSwitchingModel,
        setIsSwitchingModel: useChatStore.getState().setIsSwitchingModel,
        userScrolledUp: useChatStore.getState()._userScrolledUp,
        fileDraftsRef: useChatStore.getState()._fileDrafts,
        scrollContainerRef,
        setScrollContainerRef: useChatStore.getState().setScrollContainerRef,

        // Persistence
        updateAndPersistSessions: useChatStore.getState().updateAndPersistSessions,
        updateAndPersistGroups: useChatStore.getState().updateAndPersistGroups,
        refreshSessions: useChatStore.getState().refreshSessions,
        refreshGroups: useChatStore.getState().refreshGroups,
        setSessionLoading: useChatStore.getState().setSessionLoading,

        // Computed
        activeChat,
        currentChatSettings,
        isLoading,
        setCurrentChatSettings: useChatStore.getState().setCurrentChatSettings,
    };
};
