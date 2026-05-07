import React, { useMemo } from 'react';
import { useI18n } from '../../../contexts/I18nContext';
import { useChatInput } from '../../../hooks/chat-input/useChatInput';
import { INITIAL_TEXTAREA_HEIGHT_PX } from '../../../hooks/chat-input/useChatInputState';
import {
  ChatInputActionsContext,
  ChatInputComposerStatusContext,
  ChatInputContext,
  ChatInputToolbarContext,
  type ChatInputActionsContextValue,
  type ChatInputComposerStatusContextValue,
  type ChatInputContextValue,
  type ChatInputToolbarContextValue,
} from './ChatInputContext';

const useLatestCallback = <Args extends unknown[], ReturnValue>(callback: (...args: Args) => ReturnValue) => {
  const callbackRef = React.useRef(callback);

  React.useLayoutEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return React.useCallback((...args: Args) => callbackRef.current(...args), []);
};

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
  const actionDisabled =
    inputState.isAddingById || isAnyModalOpen || inputState.isWaitingForUpload || localFileState.isConverting;
  const hasTrimmedInput = inputState.inputText.trim().length > 0;

  const onAttachmentAction = useLatestCallback(logic.modalsState.handleAttachmentAction);
  const onRecordButtonClick = useLatestCallback(voiceState.handleVoiceInputClick);
  const onCancelRecording = useLatestCallback(voiceState.handleCancelRecording);
  const onToggleFullscreen = useLatestCallback(inputState.handleToggleFullscreen);
  const onStartLiveSession = useLatestCallback(() => liveAPI.connect());
  const onDisconnectLiveSession = useLatestCallback(() => liveAPI.disconnect());
  const onToggleLiveMute = useLatestCallback(() => liveAPI.toggleMute());
  const onStartLiveCamera = useLatestCallback(() => handleStartLiveCamera());
  const onStartLiveScreenShare = useLatestCallback(() => handleStartLiveScreenShare());
  const onStopLiveVideo = useLatestCallback(() => liveAPI.stopVideo());
  const onToggleToolAndFocus = useLatestCallback(handlers.handleToggleToolAndFocus);
  const onCountTokens = useLatestCallback(() => localFileState.setShowTokenModal(true));
  const onAddFileByIdSubmit = useLatestCallback(handlers.handleAddFileByIdSubmit);
  const onCancelAddById = useLatestCallback(() => {
    logic.modalsState.setShowAddByIdInput(false);
    inputState.setFileIdInput('');
    inputState.textareaRef.current?.focus();
  });
  const onAddUrlSubmit = useLatestCallback(() => handlers.handleAddUrl(inputState.urlInput));
  const onCancelAddUrl = useLatestCallback(() => {
    logic.modalsState.setShowAddByUrlInput(false);
    inputState.setUrlInput('');
    inputState.textareaRef.current?.focus();
  });
  const onEditTtsContext = useLatestCallback(() => logic.modalsState.setShowTtsContextEditor(true));
  const onTranslate = useLatestCallback(handlers.handleTranslate);
  const onPasteFromClipboard = useLatestCallback(handlers.handlePasteFromClipboard);
  const onClearInput = useLatestCallback(handlers.handleClearInput);
  const onFastSendMessage = useLatestCallback(handlers.handleFastSubmit);
  const onQueueMessage = useLatestCallback(handlers.queueCurrentSubmission);

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

  const toolbarValue = useMemo<ChatInputToolbarContextValue>(
    () => ({
      showAddByIdInput: logic.modalsState.showAddByIdInput,
      fileIdInput: inputState.fileIdInput,
      setFileIdInput: inputState.setFileIdInput,
      onAddFileByIdSubmit,
      onCancelAddById,
      isAddingById: inputState.isAddingById,
      showAddByUrlInput: logic.modalsState.showAddByUrlInput,
      urlInput: inputState.urlInput,
      setUrlInput: inputState.setUrlInput,
      onAddUrlSubmit,
      onCancelAddUrl,
      isAddingByUrl: inputState.isAddingByUrl,
      ttsContext: inputState.ttsContext,
      onEditTtsContext,
    }),
    [
      inputState.fileIdInput,
      inputState.isAddingById,
      inputState.isAddingByUrl,
      inputState.setFileIdInput,
      inputState.setUrlInput,
      inputState.ttsContext,
      inputState.urlInput,
      logic.modalsState.showAddByIdInput,
      logic.modalsState.showAddByUrlInput,
      onAddFileByIdSubmit,
      onAddUrlSubmit,
      onCancelAddById,
      onCancelAddUrl,
      onEditTtsContext,
    ],
  );

  const actionsValue = useMemo<ChatInputActionsContextValue>(
    () => ({
      onAttachmentAction,
      disabled: actionDisabled,
      onRecordButtonClick,
      onCancelRecording,
      isRecording: !!voiceState.isRecording,
      isMicInitializing: !!voiceState.isMicInitializing,
      isTranscribing: voiceState.isTranscribing,
      isWaitingForUpload: inputState.isWaitingForUpload,
      isTranslating: inputState.isTranslating,
      onToggleFullscreen,
      isFullscreen: inputState.isFullscreen,
      onStartLiveSession,
      onDisconnectLiveSession,
      isLiveConnected: liveAPI.isConnected,
      isLiveMuted: liveAPI.isMuted,
      onToggleLiveMute,
      onStartLiveCamera,
      onStartLiveScreenShare,
      onStopLiveVideo,
      liveVideoSource: liveAPI.videoSource,
      onToggleToolAndFocus,
      onCountTokens,
      isImageModel: logic.capabilities.isImagenModel || false,
      isRealImagenModel: logic.capabilities.isRealImagenModel || false,
      isNativeAudioModel: logic.capabilities.isNativeAudioModel || false,
      canAddYouTubeVideo: !!logic.capabilities.permissions?.canUseYouTubeUrl,
      isLoading: logic.chatInput.isLoading,
    }),
    [
      actionDisabled,
      inputState.isFullscreen,
      inputState.isTranslating,
      inputState.isWaitingForUpload,
      liveAPI.isConnected,
      liveAPI.isMuted,
      liveAPI.videoSource,
      logic.capabilities.isImagenModel,
      logic.capabilities.isNativeAudioModel,
      logic.capabilities.isRealImagenModel,
      logic.capabilities.permissions?.canUseYouTubeUrl,
      logic.chatInput.isLoading,
      onAttachmentAction,
      onCancelRecording,
      onCountTokens,
      onDisconnectLiveSession,
      onRecordButtonClick,
      onStartLiveCamera,
      onStartLiveScreenShare,
      onStartLiveSession,
      onStopLiveVideo,
      onToggleFullscreen,
      onToggleLiveMute,
      onToggleToolAndFocus,
      voiceState.isMicInitializing,
      voiceState.isRecording,
      voiceState.isTranscribing,
    ],
  );

  const composerStatusValue = useMemo<ChatInputComposerStatusContextValue>(
    () => ({
      hasTrimmedInput,
      canSend: logic.canSend,
      canQueueMessage: logic.canQueueMessage,
      onTranslate,
      onPasteFromClipboard,
      onClearInput,
      onFastSendMessage,
      onQueueMessage,
    }),
    [
      hasTrimmedInput,
      logic.canQueueMessage,
      logic.canSend,
      onClearInput,
      onFastSendMessage,
      onPasteFromClipboard,
      onQueueMessage,
      onTranslate,
    ],
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

  return (
    <ChatInputContext.Provider value={value}>
      <ChatInputToolbarContext.Provider value={toolbarValue}>
        <ChatInputActionsContext.Provider value={actionsValue}>
          <ChatInputComposerStatusContext.Provider value={composerStatusValue}>
            {children}
          </ChatInputComposerStatusContext.Provider>
        </ChatInputActionsContext.Provider>
      </ChatInputToolbarContext.Provider>
    </ChatInputContext.Provider>
  );
};
