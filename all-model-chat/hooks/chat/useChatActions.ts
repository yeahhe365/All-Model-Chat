
import React from 'react';
import { AppSettings, ChatSettings as IndividualChatSettings, SavedChatSession, UploadedFile } from '../../types';
import { useModelSelection } from './actions/useModelSelection';
import { useChatSessionActions } from './actions/useChatSessionActions';
import { useMessageUpdates } from './actions/useMessageUpdates';
import { useAudioActions } from './actions/useAudioActions';

interface UseChatActionsProps {
    appSettings: AppSettings;
    setAppSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
    activeSessionId: string | null;
    isLoading: boolean;
    currentChatSettings: IndividualChatSettings;
    selectedFiles: UploadedFile[];
    
    // State Setters
    setActiveSessionId: (id: string | null) => void;
    setIsSwitchingModel: (switching: boolean) => void;
    setAppFileError: (error: string | null) => void;
    setCurrentChatSettings: (updater: (prevSettings: IndividualChatSettings) => IndividualChatSettings) => void;
    setSelectedFiles: (files: UploadedFile[]) => void;
    
    // Functional Dependencies
    updateAndPersistSessions: (updater: (prev: SavedChatSession[]) => SavedChatSession[], options?: { persist?: boolean }) => void;
    handleStopGenerating: (options?: { silent?: boolean }) => void;
    startNewChat: () => void;
    handleTogglePinSession: (sessionId: string) => void;
    userScrolledUp: React.MutableRefObject<boolean>;
}

export const useChatActions = ({
    appSettings,
    setAppSettings,
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
    handleStopGenerating,
    startNewChat,
    handleTogglePinSession,
    userScrolledUp,
}: UseChatActionsProps) => {

    const { handleSelectModelInHeader } = useModelSelection({
        appSettings,
        setAppSettings,
        activeSessionId,
        currentChatSettings,
        isLoading,
        updateAndPersistSessions,
        setActiveSessionId,
        setCurrentChatSettings,
        setIsSwitchingModel,
        handleStopGenerating,
        userScrolledUp,
    });

    const {
        handleClearCurrentChat,
        handleTogglePinCurrentSession,
        toggleGoogleSearch,
        toggleCodeExecution,
        toggleUrlContext,
        toggleDeepSearch
    } = useChatSessionActions({
        activeSessionId,
        isLoading,
        currentChatSettings,
        updateAndPersistSessions,
        setCurrentChatSettings,
        setAppSettings,
        setSelectedFiles,
        handleStopGenerating,
        startNewChat,
        handleTogglePinSession
    });

    const {
        handleUpdateMessageContent,
        handleUpdateMessageFile,
        handleAddUserMessage,
        handleLiveTranscript
    } = useMessageUpdates({
        activeSessionId,
        setActiveSessionId: (id) => setActiveSessionId(id), // Helper to match types if needed, though strictly compatible
        appSettings,
        currentChatSettings,
        updateAndPersistSessions,
        userScrolledUp,
    });

    const { handleTranscribeAudio } = useAudioActions({
        appSettings,
        currentChatSettings,
        setCurrentChatSettings,
        setAppFileError,
        selectedFiles,
    });

    return {
        handleSelectModelInHeader,
        handleClearCurrentChat,
        handleTranscribeAudio,
        toggleGoogleSearch,
        toggleCodeExecution,
        toggleUrlContext,
        toggleDeepSearch,
        handleTogglePinCurrentSession,
        handleUpdateMessageContent,
        handleUpdateMessageFile,
        handleAddUserMessage,
        handleLiveTranscript
    };
};
