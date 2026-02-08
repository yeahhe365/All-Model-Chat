
import { useCallback, useMemo } from 'react';
import { AppSettings, ChatSettings as IndividualChatSettings } from '../../types';
import { DEFAULT_CHAT_SETTINGS } from '../../constants/appConstants';
import { useChatAuxiliaryState } from './state/useChatAuxiliaryState';
import { useSessionData } from './state/useSessionData';
import { useSessionPersistence } from './state/useSessionPersistence';

export const useChatState = (appSettings: AppSettings) => {
    
    // 1. Auxiliary State (Files, Editing, Inputs, Async Flags)
    const auxState = useChatAuxiliaryState();

    // 2. Core Session Data (Active ID, Messages List, Groups List)
    const sessionData = useSessionData();

    // 3. Persistence & Sync (DB Operations, Broadcasts)
    const persistence = useSessionPersistence({
        setSavedSessions: sessionData.setSavedSessions,
        setSavedGroups: sessionData.setSavedGroups,
        setActiveMessages: sessionData.setActiveMessages,
        setLoadingSessionIds: auxState.setLoadingSessionIds,
        activeSessionIdRef: sessionData.activeSessionIdRef,
        activeMessagesRef: sessionData.activeMessagesRef
    });

    // --- Computed State ---

    // Construct the full active chat object on the fly for consumers
    const activeChat = useMemo(() => {
        const metadata = sessionData.savedSessions.find(s => s.id === sessionData.activeSessionId);
        if (metadata) {
            return { ...metadata, messages: sessionData.activeMessages };
        }
        return undefined;
    }, [sessionData.savedSessions, sessionData.activeSessionId, sessionData.activeMessages]);

    // Fallback/Default settings
    // Use appSettings as fallback to ensure UI reflects global state (like Canvas mode) in New Chat
    const currentChatSettings = useMemo(() => activeChat?.settings || appSettings, [activeChat, appSettings]);
    
    const isLoading = useMemo(() => 
        auxState.loadingSessionIds.has(sessionData.activeSessionId ?? ''), 
    [auxState.loadingSessionIds, sessionData.activeSessionId]);
    
    // Helper to update settings for the active session
    const setCurrentChatSettings = useCallback((updater: (prevSettings: IndividualChatSettings) => IndividualChatSettings) => {
        if (!sessionData.activeSessionId) return;
        persistence.updateAndPersistSessions(prevSessions =>
            prevSessions.map(s =>
                s.id === sessionData.activeSessionId
                    ? { ...s, settings: updater(s.settings) }
                    : s
            )
        );
    }, [sessionData.activeSessionId, persistence.updateAndPersistSessions]);

    // Aggregate everything into a single return object
    return {
        // From Session Data
        savedSessions: sessionData.savedSessions, setSavedSessions: sessionData.setSavedSessions,
        savedGroups: sessionData.savedGroups, setSavedGroups: sessionData.setSavedGroups,
        activeSessionId: sessionData.activeSessionId, setActiveSessionId: sessionData.setActiveSessionId,
        activeMessages: sessionData.activeMessages, setActiveMessages: sessionData.setActiveMessages,
        // Compat alias
        messages: sessionData.activeMessages, 

        // From Auxiliary State
        editingMessageId: auxState.editingMessageId, setEditingMessageId: auxState.setEditingMessageId,
        editMode: auxState.editMode, setEditMode: auxState.setEditMode,
        commandedInput: auxState.commandedInput, setCommandedInput: auxState.setCommandedInput,
        loadingSessionIds: auxState.loadingSessionIds, setLoadingSessionIds: auxState.setLoadingSessionIds,
        generatingTitleSessionIds: auxState.generatingTitleSessionIds, setGeneratingTitleSessionIds: auxState.setGeneratingTitleSessionIds,
        activeJobs: auxState.activeJobs,
        selectedFiles: auxState.selectedFiles, setSelectedFiles: auxState.setSelectedFiles,
        appFileError: auxState.appFileError, setAppFileError: auxState.setAppFileError,
        isAppProcessingFile: auxState.isAppProcessingFile, setIsAppProcessingFile: auxState.setIsAppProcessingFile,
        aspectRatio: auxState.aspectRatio, setAspectRatio: auxState.setAspectRatio,
        imageSize: auxState.imageSize, setImageSize: auxState.setImageSize,
        ttsMessageId: auxState.ttsMessageId, setTtsMessageId: auxState.setTtsMessageId,
        isSwitchingModel: auxState.isSwitchingModel, setIsSwitchingModel: auxState.setIsSwitchingModel,
        userScrolledUp: auxState.userScrolledUp,
        fileDraftsRef: auxState.fileDraftsRef,

        // From Persistence
        updateAndPersistSessions: persistence.updateAndPersistSessions,
        updateAndPersistGroups: persistence.updateAndPersistGroups,
        refreshSessions: persistence.refreshSessions,
        refreshGroups: persistence.refreshGroups,
        setSessionLoading: persistence.setSessionLoading,

        // Computed
        activeChat,
        currentChatSettings,
        isLoading,
        setCurrentChatSettings,
    };
};
