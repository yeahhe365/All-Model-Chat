import React, { useMemo } from 'react';
import { useI18n } from '../../../contexts/I18nContext';
import { useChatInput } from '../../../hooks/chat-input/useChatInput';
import { INITIAL_TEXTAREA_HEIGHT_PX } from '../../../hooks/chat-input/useChatInputState';
import { ChatInputContext, type ChatInputContextValue } from './ChatInputContext';

export const ChatInputProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useI18n();
  const logic = useChatInput();
  const { inputState, localFileState, voiceState, liveAPI, queuedSubmission, handlers, isAnyModalOpen } = logic;

  const handleStartLiveCamera = React.useCallback(async () => {
    const didStart = await liveAPI.startCamera();
    if (didStart && !liveAPI.isConnected) {
      await liveAPI.connect();
    }
  }, [liveAPI]);

  const handleStartLiveScreenShare = React.useCallback(async () => {
    const didStart = await liveAPI.startScreenShare();
    if (didStart && !liveAPI.isConnected) {
      await liveAPI.connect();
    }
  }, [liveAPI]);

  const inputDisabled =
    isAnyModalOpen ||
    voiceState.isTranscribing ||
    inputState.isWaitingForUpload ||
    voiceState.isRecording ||
    localFileState.isConverting;

  const queuedSubmissionView = useMemo(
    () =>
      queuedSubmission
        ? {
            title: t('queuedSubmission_title'),
            previewText:
              queuedSubmission.inputText.trim() ||
              queuedSubmission.textToSend.trim() ||
              t('queuedSubmission_attachmentOnlyPreview'),
            fileCount: queuedSubmission.files.length,
            onEdit: handlers.restoreQueuedSubmission,
            onRemove: handlers.removeQueuedSubmission,
          }
        : undefined,
    [handlers.removeQueuedSubmission, handlers.restoreQueuedSubmission, queuedSubmission, t],
  );

  const value = useMemo<ChatInputContextValue>(
    () => ({
      ...logic,
      inputDisabled,
      initialTextareaHeight: INITIAL_TEXTAREA_HEIGHT_PX,
      handleStartLiveCamera,
      handleStartLiveScreenShare,
      queuedSubmissionView,
    }),
    [handleStartLiveCamera, handleStartLiveScreenShare, inputDisabled, logic, queuedSubmissionView],
  );

  return <ChatInputContext.Provider value={value}>{children}</ChatInputContext.Provider>;
};
