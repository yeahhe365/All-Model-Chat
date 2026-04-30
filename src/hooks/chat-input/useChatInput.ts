import { useCallback, useMemo } from 'react';
import { useVoiceInput } from '../useVoiceInput';
import { useSlashCommands } from '../useSlashCommands';
import { areFilesStillProcessing } from './pendingSubmissionUtils';
import { hasSendableChatInputContent } from './chatInputUtils';
import { useChatInputCore } from './useChatInputCore';
import { useChatInputFile } from './useChatInputFile';
import { useChatInputGlobalEffects } from './useChatInputGlobalEffects';
import { useChatInputSubmission } from './useChatInputSubmission';
import { useChatInputClipboard } from './useChatInputClipboard';
import { useChatInputKeyboard } from './useChatInputKeyboard';
import { useChatInputTranslation } from './useChatInputTranslation';
import { getChatInputMode } from './chatInputStateMachine';

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
    onToggleGoogleSearch,
    onToggleDeepSearch,
    onToggleCodeExecution,
    onToggleUrlContext,
    onClearChat,
    onNewChat,
    onOpenSettings,
    onToggleCanvasPrompt,
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
    inputState,
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
    isAudioCompressionEnabled: appSettings.isAudioCompressionEnabled,
    isSystemAudioRecordingEnabled: appSettings.isSystemAudioRecordingEnabled,
    textareaRef: inputState.textareaRef,
  });

  const slashCommandState = useSlashCommands({
    t,
    onToggleGoogleSearch,
    onToggleDeepSearch,
    onToggleCodeExecution,
    onToggleUrlContext,
    onClearChat,
    onNewChat,
    onOpenSettings,
    onToggleCanvasPrompt,
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

  const isModalOpen =
    modalsState.showCreateTextFileEditor ||
    modalsState.showRecorder ||
    !!localFileState.configuringFile ||
    !!localFileState.previewFile ||
    localFileState.showTokenModal ||
    modalsState.showTtsContextEditor;
  const isAnyModalOpen = isModalOpen || modalsState.isHelpModalOpen;

  const hasSendableContent = hasSendableChatInputContent({
    inputText: inputState.inputText,
    quotes: inputState.quotes,
    selectedFileCount: selectedFiles.length,
    isNativeAudioModel: capabilities.isNativeAudioModel,
  });

  const canSend =
    hasSendableContent && !isLoading && !inputState.isAddingById && !isModalOpen && !localFileState.isConverting;

  const canQueueMessageBase =
    !capabilities.isNativeAudioModel &&
    hasSendableContent &&
    !!activeSessionId &&
    isLoading &&
    !isEditing &&
    !inputState.isAddingById &&
    !isModalOpen &&
    !localFileState.isConverting &&
    !areFilesStillProcessing(selectedFiles);

  const {
    canQueueMessage,
    activeQueuedSubmission,
    queueCurrentSubmission,
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
    inputState,
    isNativeAudioModel: capabilities.isNativeAudioModel,
    liveAPI,
    onUpdateMessageContent,
    setEditingMessageId,
    onMessageSent,
    onAddUserMessage,
    onSendMessage,
  });

  const chatInputMode = useMemo(
    () =>
      getChatInputMode({
        state: inputState.machineState,
        isEditing,
        hasActiveQueuedSubmission: !!activeQueuedSubmission,
        canQueueMessage,
        isNativeAudioModel: capabilities.isNativeAudioModel || false,
        liveStatus: {
          isConnected: liveAPI.isConnected,
          isReconnecting: liveAPI.isReconnecting,
          error: liveAPI.error,
        },
        isProcessingFile,
        isConverting: localFileState.isConverting,
      }),
    [
      activeQueuedSubmission,
      canQueueMessage,
      capabilities.isNativeAudioModel,
      inputState.machineState,
      isEditing,
      isProcessingFile,
      liveAPI.error,
      liveAPI.isConnected,
      liveAPI.isReconnecting,
      localFileState.isConverting,
    ],
  );

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
    setIsTranslating: inputState.setIsTranslating,
    setAppFileError,
  });

  const { handleInputChange, handleKeyDown } = useChatInputKeyboard({
    appSettings,
    inputState,
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
