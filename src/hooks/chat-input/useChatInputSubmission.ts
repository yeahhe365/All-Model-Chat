import { useCallback } from 'react';
import type { UploadedFile } from '../../types';
import type { ChatSettings } from '../../types/settings';
import { areFilesStillProcessing, buildPendingChatInputSubmission } from './pendingSubmissionUtils';
import { useLiveModeHandler, type LiveModeApi } from './useLiveModeHandler';
import { useMessageQueue } from './useMessageQueue';
import type { useChatInputState } from './useChatInputState';

type ChatInputState = ReturnType<typeof useChatInputState>;
type SetSelectedFiles = (files: UploadedFile[] | ((prevFiles: UploadedFile[]) => UploadedFile[])) => void;

interface UseChatInputSubmissionParams {
  activeSessionId: string | null;
  currentChatSettings: ChatSettings;
  selectedFiles: UploadedFile[];
  setSelectedFiles: SetSelectedFiles;
  setAppFileError: (error: string | null) => void;
  uploadFailureMessage: string;
  isLoading: boolean;
  isEditing: boolean;
  editMode: 'update' | 'resend';
  editingMessageId: string | null;
  canSend: boolean;
  canQueueMessageBase: boolean;
  inputState: ChatInputState;
  isNativeAudioModel: boolean;
  liveAPI: LiveModeApi;
  onUpdateMessageContent: (messageId: string, content: string) => void;
  setEditingMessageId: (id: string | null) => void;
  onMessageSent: () => void;
  onAddUserMessage?: (text: string, files?: UploadedFile[]) => void;
  onSendMessage: (text: string, options?: { isFastMode?: boolean; files?: UploadedFile[] }) => void;
}

export const useChatInputSubmission = ({
  activeSessionId,
  currentChatSettings,
  selectedFiles,
  setSelectedFiles,
  setAppFileError,
  uploadFailureMessage,
  isLoading,
  isEditing,
  editMode,
  editingMessageId,
  canSend,
  canQueueMessageBase,
  inputState,
  isNativeAudioModel,
  liveAPI,
  onUpdateMessageContent,
  setEditingMessageId,
  onMessageSent,
  onAddUserMessage,
  onSendMessage,
}: UseChatInputSubmissionParams) => {
  const { handleSmartSendMessage } = useLiveModeHandler({
    isNativeAudioModel,
    selectedFiles,
    setSelectedFiles,
    currentModelId: currentChatSettings.modelId,
    mediaResolution: currentChatSettings.mediaResolution,
    liveAPI,
    onAddUserMessage,
    onSendMessage,
  });

  const completeEditSubmission = useCallback(
    (messageId: string, content: string) => {
      onUpdateMessageContent(messageId, content);
      setEditingMessageId(null);
      inputState.clearCurrentDraft();
      inputState.setInputText('');
      inputState.setQuotes([]);
      onMessageSent();
    },
    [inputState, onMessageSent, onUpdateMessageContent, setEditingMessageId],
  );

  const completeSendSubmission = useCallback(
    (
      textToSend: string,
      isFastMode: boolean,
      options?: {
        files?: UploadedFile[];
        preserveComposer?: boolean;
      },
    ) => {
      const preserveComposer = options?.preserveComposer ?? false;
      const files = options?.files;

      if (!preserveComposer) {
        inputState.clearCurrentDraft();
      }

      handleSmartSendMessage(textToSend, { isFastMode, files });

      if (!preserveComposer) {
        inputState.setInputText('');
        inputState.setQuotes([]);
      }

      onMessageSent();
      inputState.setIsAnimatingSend(true);
      setTimeout(() => inputState.setIsAnimatingSend(false), 400);

      if (!preserveComposer && inputState.isFullscreen) {
        inputState.setIsFullscreen(false);
      }
    },
    [handleSmartSendMessage, inputState, onMessageSent],
  );

  const {
    canQueueMessage,
    activeQueuedSubmission,
    queueCurrentSubmission,
    queuePendingSubmission,
    restoreQueuedSubmission,
    removeQueuedSubmission,
  } = useMessageQueue({
    activeSessionId,
    modelId: currentChatSettings.modelId,
    inputText: inputState.inputText,
    quotes: inputState.quotes,
    ttsContext: inputState.ttsContext,
    selectedFiles,
    isLoading,
    canQueueMessageBase,
    clearCurrentDraft: inputState.clearCurrentDraft,
    setInputText: inputState.setInputText,
    setQuotes: inputState.setQuotes,
    setIsWaitingForUpload: inputState.setIsWaitingForUpload,
    textareaRef: inputState.textareaRef,
    setSelectedFiles,
    setAppFileError,
    uploadFailureMessage,
    completeEditSubmission,
    completeSendSubmission,
  });

  const performSubmit = useCallback(
    (isFastMode: boolean) => {
      if (!canSend) {
        return;
      }

      const submission = buildPendingChatInputSubmission({
        inputText: inputState.inputText,
        quotes: inputState.quotes,
        modelId: currentChatSettings.modelId,
        ttsContext: inputState.ttsContext,
        isEditing,
        editMode,
        editingMessageId,
        isFastMode,
      });

      if (areFilesStillProcessing(selectedFiles)) {
        queuePendingSubmission(submission);
        return;
      }

      if (submission.kind === 'edit') {
        completeEditSubmission(submission.messageId, submission.content);
        return;
      }

      completeSendSubmission(submission.textToSend, submission.isFastMode);
    },
    [
      canSend,
      completeEditSubmission,
      completeSendSubmission,
      currentChatSettings.modelId,
      editMode,
      editingMessageId,
      inputState,
      isEditing,
      queuePendingSubmission,
      selectedFiles,
    ],
  );

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      performSubmit(false);
    },
    [performSubmit],
  );

  const handleFastSubmit = useCallback(() => {
    performSubmit(true);
  }, [performSubmit]);

  return {
    canQueueMessage,
    activeQueuedSubmission,
    queueCurrentSubmission,
    restoreQueuedSubmission,
    removeQueuedSubmission,
    handleSubmit,
    handleFastSubmit,
    performSubmit,
    handleSmartSendMessage,
  };
};
