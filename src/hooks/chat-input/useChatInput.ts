import { useCallback, useMemo } from 'react';
import { useVoiceInput } from '../useVoiceInput';
import { useSlashCommands } from '../useSlashCommands';
import { useChatInputCore } from './useChatInputCore';
import { useChatInputFile } from './useChatInputFile';
import { useChatInputGlobalEffects } from './useChatInputGlobalEffects';
import { useChatInputSubmission } from './useChatInputSubmission';
import { useChatInputClipboard } from './useChatInputClipboard';
import { useChatInputKeyboard } from './useChatInputKeyboard';
import { useChatInputTranslation } from './useChatInputTranslation';
import { getChatInputAvailability, getCurrentChatInputMode } from './chatInputAvailability';

export const useChatInput = () => {
  const { t, chatInput, inputState, fileRefs, targetDocument, insertText, capabilities, liveAPI } = useChatInputCore();
  const {
    appSettings,
    currentChatSettings,
    activeSessionId,
    isEditing,
    onProcessFiles,
    commandedInput,
    onSendMessage,
    onMessageSent,
    setEditingMessageId,
    onTranscribeAudio,
    onUpdateMessageContent,
    onCancelEdit,
    onStopGenerating,
    toolStates = {},
    onClearChat,
    onNewChat,
    onOpenSettings,
    onToggleLiveArtifactsPrompt,
    onTogglePinCurrentSession,
    onRetryLastTurn,
    onSelectModel,
    availableModels,
    onEditLastUserMessage,
    onTogglePip,
    setCurrentChatSettings,
    onAddUserMessage,
    selectedFiles,
    setSelectedFiles,
    setAppFileError,
    isLoading,
    editMode,
    editingMessageId,
    onAddFileById,
    isProcessingFile,
  } = chatInput;

  const {
    filePreProcessing,
    modalsState,
    localFileState,
    removeSelectedFile,
    handleAddFileByIdSubmit,
    handleSaveFileConfig,
  } = useChatInputFile({
    fileIdInput: inputState.fileIdInput,
    isAddingById: inputState.isAddingById,
    setAddingById: inputState.setAddingById,
    setFileIdInput: inputState.setFileIdInput,
    setInputText: inputState.setInputText,
    textareaRef: inputState.textareaRef,
    selectedFiles,
    setSelectedFiles,
    setAppFileError,
    onProcessFiles,
    onAddFileById,
    isLoading,
    fileRefs,
    justInitiatedFileOpRef: inputState.justInitiatedFileOpRef,
  });

  const voiceState = useVoiceInput({
    onTranscribeAudio,
    setInputText: inputState.setInputText,
    setAppFileError,
    isAudioCompressionEnabled: appSettings.isAudioCompressionEnabled,
    textareaRef: inputState.textareaRef,
  });

  const slashCommandState = useSlashCommands({
    t,
    toolStates,
    onClearChat,
    onNewChat,
    onOpenSettings,
    onToggleLiveArtifactsPrompt,
    onTogglePinCurrentSession,
    onRetryLastTurn,
    onAttachmentAction: modalsState.handleAttachmentAction,
    availableModels,
    onSelectModel,
    onMessageSent,
    setIsHelpModalOpen: modalsState.setIsHelpModalOpen,
    textareaRef: inputState.textareaRef,
    onEditLastUserMessage,
    setInputText: inputState.setInputText,
    onTogglePip,
    currentModelId: currentChatSettings.modelId,
    onSetThinkingLevel: (level) => setCurrentChatSettings((prev) => ({ ...prev, thinkingLevel: level })),
    thinkingLevel: currentChatSettings.thinkingLevel,
  });

  const { canSend, canQueueMessageBase, isAnyModalOpen } = getChatInputAvailability({
    inputState,
    modalsState,
    localFileState,
    selectedFiles,
    capabilities,
    activeSessionId,
    isLoading,
    isEditing,
  });

  const {
    canQueueMessage,
    activeQueuedSubmission,
    queueCurrentSubmission,
    cancelPendingUploadSend,
    restoreQueuedSubmission,
    removeQueuedSubmission,
    handleSubmit,
    handleFastSubmit,
    handleSmartSendMessage,
  } = useChatInputSubmission({
    activeSessionId,
    currentChatSettings,
    selectedFiles,
    setSelectedFiles,
    setAppFileError,
    uploadFailureMessage: t('messageSender_fileUploadFailedBeforeSend'),
    isLoading,
    isEditing,
    editMode,
    editingMessageId,
    canSend,
    canQueueMessageBase,
    submissionState: {
      inputText: inputState.inputText,
      quotes: inputState.quotes,
      ttsContext: inputState.ttsContext,
      isFullscreen: inputState.isFullscreen,
      clearCurrentDraft: inputState.clearCurrentDraft,
      setInputText: inputState.setInputText,
      setQuotes: inputState.setQuotes,
      setWaitingForUpload: inputState.setWaitingForUpload,
      startSendAnimation: inputState.startSendAnimation,
      stopSendAnimation: inputState.stopSendAnimation,
      exitFullscreen: inputState.exitFullscreen,
      textareaRef: inputState.textareaRef,
    },
    isNativeAudioModel: capabilities.isNativeAudioModel,
    liveAPI,
    onUpdateMessageContent,
    setEditingMessageId,
    onMessageSent,
    onAddUserMessage,
    onSendMessage,
  });

  const chatInputMode = getCurrentChatInputMode({
    inputState,
    localFileState,
    capabilities,
    liveAPI,
    activeQueuedSubmission,
    canQueueMessage,
    isEditing,
    isProcessingFile,
  });

  const { handleAddUrl, handlePaste, handlePasteAction, handlePasteFromClipboard, handleClearInput } =
    useChatInputClipboard({
      appSettings,
      isAddingById: inputState.isAddingById,
      showCreateTextFileEditor: modalsState.showCreateTextFileEditor,
      showRecorder: modalsState.showRecorder,
      justInitiatedFileOpRef: inputState.justInitiatedFileOpRef,
      textareaRef: inputState.textareaRef,
      setInputText: inputState.setInputText,
      setUrlInput: inputState.setUrlInput,
      setShowAddByUrlInput: modalsState.setShowAddByUrlInput,
      setSelectedFiles,
      setAppFileError,
      onProcessFiles,
      insertText,
    });

  const { handleTranslate } = useChatInputTranslation({
    appSettings,
    currentChatSettings,
    inputText: inputState.inputText,
    isTranslating: inputState.isTranslating,
    setInputText: inputState.setInputText,
    setTranslating: inputState.setTranslating,
    setAppFileError,
  });

  const { handleInputChange, handleKeyDown } = useChatInputKeyboard({
    appSettings,
    keyboardState: {
      inputText: inputState.inputText,
      isFullscreen: inputState.isFullscreen,
      isMobile: inputState.isMobile,
      isComposingRef: inputState.isComposingRef,
      setInputText: inputState.setInputText,
      handleToggleFullscreen: inputState.handleToggleFullscreen,
    },
    slashCommandState,
    isLoading,
    isEditing,
    canSend,
    canQueueMessage,
    handleSubmit,
    queueCurrentSubmission,
    onStopGenerating,
    onCancelEdit,
    onEditLastUserMessage,
  });

  const handleToggleToolAndFocus = useCallback(
    (toggleFunc: () => void) => {
      toggleFunc();
      setTimeout(() => inputState.textareaRef.current?.focus(), 0);
    },
    [inputState.textareaRef],
  );

  const handlers = useMemo(
    () => ({
      handleFileChange: filePreProcessing.handleFileChange,
      handleFolderChange: filePreProcessing.handleFolderChange,
      handleZipChange: filePreProcessing.handleZipChange,
      handleAddUrl,
      handlePaste,
      handlePasteAction,
      handleInputChange,
      handleSubmit,
      handleFastSubmit,
      handleTranslate,
      handlePasteFromClipboard,
      handleClearInput,
      handleKeyDown,
      onCompositionStart: inputState.handleCompositionStart,
      onCompositionEnd: inputState.handleCompositionEnd,
      removeSelectedFile,
      handleAddFileByIdSubmit,
      handleToggleToolAndFocus,
      handleSaveFileConfig,
      queueCurrentSubmission,
      cancelPendingUploadSend,
      restoreQueuedSubmission,
      removeQueuedSubmission,
      handlePrevImage: localFileState.handlePrevImage,
      handleNextImage: localFileState.handleNextImage,
      inputImages: localFileState.inputImages,
      currentImageIndex: localFileState.currentImageIndex,
    }),
    [
      handleAddFileByIdSubmit,
      handleAddUrl,
      handleClearInput,
      handleFastSubmit,
      filePreProcessing.handleFileChange,
      filePreProcessing.handleFolderChange,
      filePreProcessing.handleZipChange,
      handleInputChange,
      handleKeyDown,
      handlePaste,
      handlePasteAction,
      handlePasteFromClipboard,
      handleSaveFileConfig,
      queueCurrentSubmission,
      cancelPendingUploadSend,
      removeQueuedSubmission,
      restoreQueuedSubmission,
      handleSubmit,
      handleToggleToolAndFocus,
      handleTranslate,
      localFileState.currentImageIndex,
      localFileState.handleNextImage,
      localFileState.handlePrevImage,
      localFileState.inputImages,
      inputState.handleCompositionEnd,
      inputState.handleCompositionStart,
      removeSelectedFile,
    ],
  );

  useChatInputGlobalEffects({
    appSettings,
    commandedInput,
    isAnyModalOpen,
    isProcessingFile,
    isAddingById: inputState.isAddingById,
    selectedFileCount: selectedFiles.length,
    targetDocument,
    textareaRef: inputState.textareaRef,
    prevIsProcessingFileRef: inputState.prevIsProcessingFileRef,
    justInitiatedFileOpRef: inputState.justInitiatedFileOpRef,
    setInputText: inputState.setInputText,
    setQuotes: inputState.setQuotes,
    insertText,
    handlePasteAction,
  });

  return {
    chatInput,
    inputState,
    capabilities,
    liveAPI,
    modalsState,
    localFileState,
    voiceState,
    slashCommandState,
    handlers,
    targetDocument,
    canSend,
    canQueueMessage,
    queuedSubmission: activeQueuedSubmission,
    chatInputMode,
    isAnyModalOpen,
    handleSmartSendMessage,
  };
};
