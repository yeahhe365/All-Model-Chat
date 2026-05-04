import React from 'react';
import {
  AppSettings,
  ChatMessage,
  ChatSettings as IndividualChatSettings,
  SavedChatSession,
  UploadedFile,
} from '../../types';
import { useModelSelection } from './actions/useModelSelection';
import { useChatSessionActions } from './actions/useChatSessionActions';
import { useMessageUpdates } from './actions/useMessageUpdates';
import { useAudioActions } from './actions/useAudioActions';

interface UseChatActionsProps {
  appSettings: AppSettings;
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
  updateAndPersistSessions: (
    updater: (prev: SavedChatSession[]) => SavedChatSession[],
    options?: { persist?: boolean },
  ) => void;
  updateMessageInActiveSession: (
    messageId: string,
    updates: Partial<ChatMessage> | ((message: ChatMessage) => ChatMessage),
    options?: { persist?: boolean },
  ) => void;
  appendMessageToSession: (sessionId: string, message: ChatMessage, options?: { persist?: boolean }) => void;
  handleStopGenerating: (options?: { silent?: boolean }) => void;
  startNewChat: () => void;
  handleTogglePinSession: (sessionId: string) => void;
  userScrolledUpRef: React.MutableRefObject<boolean>;
}

export const useChatActions = ({
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
  updateMessageInActiveSession,
  appendMessageToSession,
  handleStopGenerating,
  startNewChat,
  handleTogglePinSession,
  userScrolledUpRef,
}: UseChatActionsProps) => {
  const { handleSelectModelInHeader } = useModelSelection({
    appSettings,
    activeSessionId,
    currentChatSettings,
    isLoading,
    updateAndPersistSessions,
    setActiveSessionId,
    setCurrentChatSettings,
    setIsSwitchingModel,
    handleStopGenerating,
    userScrolledUpRef,
  });

  const {
    handleClearCurrentChat,
    handleTogglePinCurrentSession,
    toggleGoogleSearch,
    toggleCodeExecution,
    toggleLocalPython,
    toggleUrlContext,
    toggleDeepSearch,
  } = useChatSessionActions({
    activeSessionId,
    isLoading,
    updateAndPersistSessions,
    setCurrentChatSettings,
    setSelectedFiles,
    handleStopGenerating,
    startNewChat,
    handleTogglePinSession,
  });

  const { handleUpdateMessageContent, handleUpdateMessageFile, handleAddUserMessage, handleLiveTranscript } =
    useMessageUpdates({
      activeSessionId,
      setActiveSessionId: (id) => setActiveSessionId(id), // Helper to match types if needed, though strictly compatible
      appSettings,
      currentChatSettings,
      updateAndPersistSessions,
      updateMessageInActiveSession,
      appendMessageToSession,
      userScrolledUpRef,
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
    toggleLocalPython,
    toggleUrlContext,
    toggleDeepSearch,
    handleTogglePinCurrentSession,
    handleUpdateMessageContent,
    handleUpdateMessageFile,
    handleAddUserMessage,
    handleLiveTranscript,
  };
};
