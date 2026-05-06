import React from 'react';
import { useI18n } from '../../../contexts/I18nContext';
import { createPortal } from 'react-dom';
import { useChatInput } from '../../../hooks/chat-input/useChatInput';
import { INITIAL_TEXTAREA_HEIGHT_PX } from '../../../hooks/chat-input/useChatInputState';
import { ChatInputModals } from './ChatInputModals';
import { ChatInputFileModals } from './ChatInputFileModals';
import { ChatInputArea } from './ChatInputArea';

const ChatInputComponent: React.FC = () => {
  const { t } = useI18n();
  // 1. 获取所有核心逻辑和状态
  const {
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
    queuedSubmission,
    isAnyModalOpen,
  } = useChatInput();

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

  const chatInputContent = (
    <ChatInputArea
      toolbarLocalProps={{
        showAddByIdInput: modalsState.showAddByIdInput,
        fileIdInput: inputState.fileIdInput,
        setFileIdInput: inputState.setFileIdInput,
        onAddFileByIdSubmit: handlers.handleAddFileByIdSubmit,
        onCancelAddById: () => {
          modalsState.setShowAddByIdInput(false);
          inputState.setFileIdInput('');
          inputState.textareaRef.current?.focus();
        },
        isAddingById: inputState.isAddingById,
        showAddByUrlInput: modalsState.showAddByUrlInput,
        urlInput: inputState.urlInput,
        setUrlInput: inputState.setUrlInput,
        onAddUrlSubmit: () => handlers.handleAddUrl(inputState.urlInput),
        onCancelAddUrl: () => {
          modalsState.setShowAddByUrlInput(false);
          inputState.setUrlInput('');
          inputState.textareaRef.current?.focus();
        },
        isAddingByUrl: inputState.isAddingByUrl,
        ttsContext: inputState.ttsContext,
        onEditTtsContext: () => modalsState.setShowTtsContextEditor(true),
      }}
      actionsLocalProps={{
        onAttachmentAction: modalsState.handleAttachmentAction,
        disabled:
          inputState.isAddingById || isAnyModalOpen || inputState.isWaitingForUpload || localFileState.isConverting,
        onRecordButtonClick: voiceState.handleVoiceInputClick,
        onCancelRecording: voiceState.handleCancelRecording,
        isRecording: voiceState.isRecording,
        isMicInitializing: voiceState.isMicInitializing,
        isTranscribing: voiceState.isTranscribing,
        canSend,
        isWaitingForUpload: inputState.isWaitingForUpload,
        onTranslate: handlers.handleTranslate,
        onPasteFromClipboard: handlers.handlePasteFromClipboard,
        onClearInput: handlers.handleClearInput,
        isTranslating: inputState.isTranslating,
        inputText: inputState.inputText,
        onToggleFullscreen: inputState.handleToggleFullscreen,
        isFullscreen: inputState.isFullscreen,
        onStartLiveSession: liveAPI.connect,
        onDisconnectLiveSession: liveAPI.disconnect,
        isLiveConnected: liveAPI.isConnected,
        isLiveMuted: liveAPI.isMuted,
        onToggleLiveMute: liveAPI.toggleMute,
        onStartLiveCamera: handleStartLiveCamera,
        onStartLiveScreenShare: handleStartLiveScreenShare,
        onStopLiveVideo: liveAPI.stopVideo,
        liveVideoSource: liveAPI.videoSource,
        onFastSendMessage: handlers.handleFastSubmit,
        canQueueMessage,
        onQueueMessage: handlers.queueCurrentSubmission,
        onToggleToolAndFocus: handlers.handleToggleToolAndFocus,
        onAddYouTubeVideo: () => {
          modalsState.setShowAddByUrlInput(true);
          inputState.textareaRef.current?.focus();
        },
        onCountTokens: () => localFileState.setShowTokenModal(true),
      }}
      slashCommandProps={{
        isOpen: slashCommandState.slashCommandState.isOpen,
        commands: slashCommandState.slashCommandState.filteredCommands,
        onSelect: slashCommandState.handleCommandSelect,
        selectedIndex: slashCommandState.slashCommandState.selectedIndex,
      }}
      fileDisplayProps={{
        selectedFiles: chatInput.selectedFiles,
        onRemove: handlers.removeSelectedFile,
        onCancelUpload: chatInput.onCancelUpload,
        onConfigure: localFileState.handleConfigureFile,
        onMoveTextToInput: localFileState.handleMoveTextFileToInput,
        onPreview: localFileState.handlePreviewFile,
        isGemini3: capabilities.isGemini3,
      }}
      inputProps={{
        value: inputState.inputText,
        onChange: handlers.handleInputChange,
        onKeyDown: handlers.handleKeyDown,
        onPaste: handlers.handlePaste,
        textareaRef: inputState.textareaRef,
        placeholder: t('chatInputPlaceholder'),
        disabled: inputDisabled,
        onCompositionStart: handlers.onCompositionStart,
        onCompositionEnd: handlers.onCompositionEnd,
      }}
      quoteProps={{
        quotes: inputState.quotes,
        onRemoveQuote: (index: number) => inputState.setQuotes((prev) => prev.filter((_, i) => i !== index)),
      }}
      queuedSubmissionProps={
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
          : undefined
      }
      layoutProps={{
        isFullscreen: inputState.isFullscreen,
        isPipActive: chatInput.isPipActive,
        isAnimatingSend: inputState.isAnimatingSend,
        isMobile: inputState.isMobile,
        initialTextareaHeight: INITIAL_TEXTAREA_HEIGHT_PX,
        isConverting: localFileState.isConverting,
      }}
      fileInputs={{
        fileInputRef: modalsState.fileInputRef,
        imageInputRef: modalsState.imageInputRef,
        folderInputRef: modalsState.folderInputRef,
        zipInputRef: modalsState.zipInputRef,
        cameraInputRef: modalsState.cameraInputRef,
        handleFileChange: handlers.handleFileChange,
        handleFolderChange: handlers.handleFolderChange,
        handleZipChange: handlers.handleZipChange,
      }}
      formProps={{
        onSubmit: handlers.handleSubmit,
      }}
      suggestionsProps={
        chatInput.showEmptyStateSuggestions && capabilities.permissions.canGenerateSuggestions
          ? {
              show: chatInput.showEmptyStateSuggestions,
              onSuggestionClick: chatInput.onSuggestionClick,
              onOrganizeInfoClick: chatInput.onOrganizeInfoClick,
              onToggleBBox: chatInput.onToggleBBox,
              isBBoxModeActive: chatInput.isBBoxModeActive,
              onToggleGuide: chatInput.onToggleGuide,
              isGuideModeActive: chatInput.isGuideModeActive,
            }
          : undefined
      }
      liveStatusProps={{
        isConnected: liveAPI.isConnected,
        isSpeaking: liveAPI.isSpeaking,
        isReconnecting: liveAPI.isReconnecting,
        volume: liveAPI.volume,
        error: liveAPI.error,
        onDisconnect: liveAPI.disconnect,
      }}
      liveVideoProps={
        capabilities.isNativeAudioModel
          ? {
              videoRef: liveAPI.videoRef,
            }
          : undefined
      }
      themeId={chatInput.themeId}
    />
  );

  return (
    <>
      <ChatInputModals
        showRecorder={modalsState.showRecorder}
        onAudioRecord={modalsState.handleAudioRecord}
        onRecorderCancel={() => {
          modalsState.setShowRecorder(false);
          inputState.textareaRef.current?.focus();
        }}
        showCreateTextFileEditor={modalsState.showCreateTextFileEditor}
        onConfirmCreateTextFile={localFileState.handleSaveTextFile}
        onCreateTextFileCancel={() => {
          modalsState.setShowCreateTextFileEditor(false);
          modalsState.setEditingFile(null);
          inputState.textareaRef.current?.focus();
        }}
        isHelpModalOpen={modalsState.isHelpModalOpen}
        onHelpModalClose={() => modalsState.setIsHelpModalOpen(false)}
        allCommandsForHelp={slashCommandState.allCommandsForHelp}
        isProcessingFile={chatInput.isProcessingFile}
        isLoading={chatInput.isLoading}
        initialContent={modalsState.editingFile?.textContent || ''}
        initialFilename={modalsState.editingFile?.name || ''}
        isSystemAudioRecordingEnabled={chatInput.appSettings.isSystemAudioRecordingEnabled}
        themeId={chatInput.themeId}
        isPasteRichTextAsMarkdownEnabled={chatInput.appSettings.isPasteRichTextAsMarkdownEnabled ?? true}
        showTtsContextEditor={modalsState.showTtsContextEditor}
        onCloseTtsContextEditor={() => modalsState.setShowTtsContextEditor(false)}
        ttsContext={inputState.ttsContext}
        setTtsContext={inputState.setTtsContext}
      />

      <ChatInputFileModals
        configuringFile={localFileState.configuringFile}
        setConfiguringFile={localFileState.setConfiguringFile}
        showTokenModal={localFileState.showTokenModal}
        setShowTokenModal={localFileState.setShowTokenModal}
        previewFile={localFileState.previewFile}
        onClosePreview={localFileState.closePreviewFile}
        inputText={inputState.inputText}
        selectedFiles={chatInput.selectedFiles}
        appSettings={{
          ...chatInput.appSettings,
          ...chatInput.currentChatSettings,
          modelId: chatInput.currentChatSettings.modelId,
        }}
        availableModels={chatInput.availableModels}
        currentModelId={chatInput.currentChatSettings.modelId}
        isGemini3={capabilities.isGemini3}
        isPreviewEditable={localFileState.isPreviewEditable}
        onSaveTextFile={localFileState.handleSavePreviewTextFile}
        handlers={{
          handleSaveFileConfig: handlers.handleSaveFileConfig,
          handlePrevImage: handlers.handlePrevImage,
          handleNextImage: handlers.handleNextImage,
          currentImageIndex: handlers.currentImageIndex,
          inputImages: handlers.inputImages,
        }}
      />

      {inputState.isFullscreen ? createPortal(chatInputContent, targetDocument.body) : chatInputContent}
    </>
  );
};

export const ChatInput = React.memo(ChatInputComponent);
