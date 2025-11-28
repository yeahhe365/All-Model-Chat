
import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { UploadedFile, AppSettings, ModelOption, ChatSettings as IndividualChatSettings } from '../../types';
import { ALL_SUPPORTED_MIME_TYPES, SUPPORTED_IMAGE_MIME_TYPES } from '../../constants/fileConstants';
import { translations } from '../../utils/appUtils';
import { ChatInputModals } from './input/ChatInputModals';
import { ChatInputArea } from './input/ChatInputArea';
import { useChatInputModals } from '../../hooks/useChatInputModals';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import { useSlashCommands } from '../../hooks/useSlashCommands';
import { useIsDesktop } from '../../hooks/useDevice';
import { useWindowContext } from '../../contexts/WindowContext';
import { useChatInputState, INITIAL_TEXTAREA_HEIGHT_PX } from '../../hooks/useChatInputState';
import { VideoSettingsModal } from '../modals/VideoSettingsModal';
import { FilePreviewModal } from '../shared/ImageZoomModal';
import { ThemeColors } from '../../constants/themeConstants';
import { useChatInputHandlers } from '../../hooks/useChatInputHandlers';

export interface ChatInputProps {
  appSettings: AppSettings;
  currentChatSettings: IndividualChatSettings;
  setAppFileError: (error: string | null) => void;
  activeSessionId: string | null;
  commandedInput: { text: string; id: number } | null;
  onMessageSent: () => void;
  selectedFiles: UploadedFile[]; 
  setSelectedFiles: (files: UploadedFile[] | ((prevFiles: UploadedFile[]) => UploadedFile[])) => void; 
  onSendMessage: (text: string) => void;
  isLoading: boolean; 
  isEditing: boolean;
  onStopGenerating: () => void;
  onCancelEdit: () => void;
  onProcessFiles: (files: FileList | File[]) => Promise<void>;
  onAddFileById: (fileId: string) => Promise<void>;
  onCancelUpload: (fileId: string) => void;
  onTranscribeAudio: (file: File) => Promise<string | null>;
  isProcessingFile: boolean; 
  fileError: string | null;
  t: (key: keyof typeof translations) => string;
  isImagenModel?: boolean;
  isImageEditModel?: boolean;
  aspectRatio?: string;
  setAspectRatio?: (ratio: string) => void;
  imageSize?: string;
  setImageSize?: (size: string) => void;
  isGoogleSearchEnabled: boolean;
  onToggleGoogleSearch: () => void;
  isCodeExecutionEnabled: boolean;
  onToggleCodeExecution: () => void;
  isUrlContextEnabled: boolean;
  onToggleUrlContext: () => void;
  isDeepSearchEnabled: boolean;
  onToggleDeepSearch: () => void;
  onClearChat: () => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
  onToggleCanvasPrompt: () => void;
  onTogglePinCurrentSession: () => void;
  onRetryLastTurn: () => void;
  onSelectModel: (modelId: string) => void;
  availableModels: ModelOption[];
  onEditLastUserMessage: () => void;
  onTogglePip: () => void;
  isPipActive?: boolean;
  isHistorySidebarOpen?: boolean;
  onSetDefaultModel: (modelId: string) => void;
  generateQuadImages: boolean;
  onToggleQuadImages: () => void;
  setCurrentChatSettings: (updater: (prevSettings: IndividualChatSettings) => IndividualChatSettings) => void;
}

export const ChatInput: React.FC<ChatInputProps> = (props) => {
  const {
    appSettings, currentChatSettings, setAppFileError, activeSessionId, commandedInput, onMessageSent, selectedFiles, setSelectedFiles, onSendMessage,
    isLoading, isEditing, onStopGenerating, onCancelEdit, onProcessFiles,
    onAddFileById, onCancelUpload, isProcessingFile, fileError, t,
    isImagenModel, isImageEditModel, aspectRatio, setAspectRatio, imageSize, setImageSize, onTranscribeAudio,
    isGoogleSearchEnabled, onToggleGoogleSearch,
    isCodeExecutionEnabled, onToggleCodeExecution,
    isUrlContextEnabled, onToggleUrlContext,
    isDeepSearchEnabled, onToggleDeepSearch,
    onClearChat, onNewChat, onOpenSettings, onToggleCanvasPrompt, onTogglePinCurrentSession, onTogglePip,
    onRetryLastTurn, onSelectModel, availableModels, onEditLastUserMessage, isPipActive, isHistorySidebarOpen, onSetDefaultModel,
    generateQuadImages, onToggleQuadImages, setCurrentChatSettings
  } = props;

  const {
    inputText, setInputText,
    isTranslating, setIsTranslating,
    isAnimatingSend, setIsAnimatingSend,
    fileIdInput, setFileIdInput,
    isAddingById, setIsAddingById,
    urlInput, setUrlInput,
    isAddingByUrl, setIsAddingByUrl,
    isWaitingForUpload, setIsWaitingForUpload,
    isFullscreen, setIsFullscreen,
    textareaRef,
    justInitiatedFileOpRef,
    prevIsProcessingFileRef,
    isComposingRef,
    adjustTextareaHeight,
    clearCurrentDraft,
    handleToggleFullscreen,
    isMobile
  } = useChatInputState(activeSessionId, isEditing);

  const isDesktop = useIsDesktop();
  const { document: targetDocument } = useWindowContext();
  
  const [configuringFile, setConfiguringFile] = useState<UploadedFile | null>(null);
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  const {
    showCamera, showRecorder, showCreateTextFileEditor, showAddByIdInput, showAddByUrlInput, isHelpModalOpen,
    fileInputRef, imageInputRef, folderInputRef, zipInputRef,
    handleAttachmentAction, handleConfirmCreateTextFile, handlePhotoCapture, handleAudioRecord,
    setIsHelpModalOpen, setShowAddByIdInput, setShowCamera, setShowRecorder, setShowCreateTextFileEditor, setShowAddByUrlInput,
  } = useChatInputModals({
    onProcessFiles: (files) => onProcessFiles(files),
    justInitiatedFileOpRef,
    textareaRef,
  });
  
  const {
    isRecording, isTranscribing, isMicInitializing, handleVoiceInputClick, handleCancelRecording,
  } = useVoiceInput({
    onTranscribeAudio,
    setInputText,
    adjustTextareaHeight,
  });

  const {
    slashCommandState, setSlashCommandState, allCommandsForHelp,
    handleCommandSelect, handleInputChange: handleSlashInputChange, handleSlashCommandExecution,
  } = useSlashCommands({
    t, onToggleGoogleSearch, onToggleDeepSearch, onToggleCodeExecution, onToggleUrlContext, onClearChat, onNewChat, onOpenSettings,
    onToggleCanvasPrompt, onTogglePinCurrentSession, onRetryLastTurn, onStopGenerating, onAttachmentAction: handleAttachmentAction,
    availableModels, onSelectModel, onMessageSent, setIsHelpModalOpen, textareaRef, onEditLastUserMessage, setInputText,
    onTogglePip, onSetDefaultModel, currentModelId: currentChatSettings.modelId,
  });

  const isModalOpen = showCreateTextFileEditor || showCamera || showRecorder || !!configuringFile || !!previewFile;
  const isAnyModalOpen = isModalOpen || isHelpModalOpen;
  
  const canSend = (
    (inputText.trim() !== '' || selectedFiles.length > 0)
    && !isLoading && !isAddingById && !isModalOpen && !isConverting
  );

  const handlers = useChatInputHandlers({
    inputText, setInputText, fileIdInput, setFileIdInput, urlInput, setUrlInput,
    selectedFiles, setSelectedFiles, previewFile, setPreviewFile,
    isAddingById, setIsAddingById, isAddingByUrl, setIsAddingByUrl,
    isTranslating, setIsTranslating, isConverting, setIsConverting,
    isLoading, isFullscreen, setIsFullscreen, setIsAnimatingSend, setIsWaitingForUpload,
    showCreateTextFileEditor, showCamera, showRecorder, setShowAddByUrlInput, setShowAddByIdInput,
    textareaRef, fileInputRef, imageInputRef, folderInputRef, zipInputRef,
    justInitiatedFileOpRef, isComposingRef,
    appSettings, currentChatSettings, setCurrentChatSettings, setAppFileError,
    slashCommandState, setSlashCommandState, handleCommandSelect, handleSlashCommandExecution, handleSlashInputChange,
    onProcessFiles, onAddFileById, onSendMessage, onMessageSent,
    adjustTextareaHeight, clearCurrentDraft, handleToggleFullscreen,
    isMobile, isDesktop, canSend
  });
  
  useEffect(() => {
    if (commandedInput) {
      setInputText(commandedInput.text);
      if (commandedInput.text) {
        setTimeout(() => {
          const textarea = textareaRef.current;
          if (textarea) {
            textarea.focus();
            const textLength = textarea.value.length;
            textarea.setSelectionRange(textLength, textLength);
          }
        }, 0);
      }
    }
  }, [commandedInput]);

  useEffect(() => {
    if (prevIsProcessingFileRef.current && !isProcessingFile && !isAddingById && justInitiatedFileOpRef.current) {
      textareaRef.current?.focus();
      justInitiatedFileOpRef.current = false;
    }
    prevIsProcessingFileRef.current = isProcessingFile;
  }, [isProcessingFile, isAddingById]);

  useEffect(() => {
    if (isWaitingForUpload) {
        const filesAreStillProcessing = selectedFiles.some(f => f.isProcessing);
        if (!filesAreStillProcessing) {
            clearCurrentDraft();
            onSendMessage(inputText);
            setInputText('');
            onMessageSent();
            setIsWaitingForUpload(false);
            setIsAnimatingSend(true);
            setTimeout(() => setIsAnimatingSend(false), 400);
            if (isFullscreen) {
                setIsFullscreen(false);
            }
        }
    }
  }, [isWaitingForUpload, selectedFiles, onSendMessage, inputText, onMessageSent, clearCurrentDraft, isFullscreen]);

  const isGemini3ImageModel = currentChatSettings.modelId === 'gemini-3-pro-image-preview';

  const chatInputContent = (
      <ChatInputArea 
        toolbarProps={{
            isImagenModel: isImagenModel || false,
            isGemini3ImageModel,
            aspectRatio,
            setAspectRatio,
            imageSize,
            setImageSize,
            fileError,
            showAddByIdInput,
            fileIdInput,
            setFileIdInput,
            onAddFileByIdSubmit: handlers.handleAddFileByIdSubmit,
            onCancelAddById: () => { setShowAddByIdInput(false); setFileIdInput(''); textareaRef.current?.focus(); },
            isAddingById,
            showAddByUrlInput,
            urlInput,
            setUrlInput,
            onAddUrlSubmit: () => handlers.handleAddUrl(urlInput),
            onCancelAddUrl: () => { setShowAddByUrlInput(false); setUrlInput(''); textareaRef.current?.focus(); },
            isAddingByUrl,
            isLoading,
            t,
            generateQuadImages,
            onToggleQuadImages,
        }}
        actionsProps={{
            onAttachmentAction: handleAttachmentAction,
            disabled: isAddingById || isModalOpen || isWaitingForUpload || isConverting,
            isGoogleSearchEnabled,
            onToggleGoogleSearch: () => handlers.handleToggleToolAndFocus(onToggleGoogleSearch),
            isCodeExecutionEnabled,
            onToggleCodeExecution: () => handlers.handleToggleToolAndFocus(onToggleCodeExecution),
            isUrlContextEnabled,
            onToggleUrlContext: () => handlers.handleToggleToolAndFocus(onToggleUrlContext),
            isDeepSearchEnabled,
            onToggleDeepSearch: () => handlers.handleToggleToolAndFocus(onToggleDeepSearch),
            onAddYouTubeVideo: () => { setShowAddByUrlInput(true); textareaRef.current?.focus(); },
            onRecordButtonClick: handleVoiceInputClick,
            onCancelRecording: handleCancelRecording,
            isRecording,
            isMicInitializing,
            isTranscribing,
            isLoading,
            onStopGenerating,
            isEditing,
            onCancelEdit,
            canSend,
            isWaitingForUpload,
            t,
            onTranslate: handlers.handleTranslate,
            isTranslating,
            inputText,
            onToggleFullscreen: handleToggleFullscreen,
            isFullscreen,
        }}
        slashCommandProps={{
            isOpen: slashCommandState.isOpen,
            commands: slashCommandState.filteredCommands,
            onSelect: handleCommandSelect,
            selectedIndex: slashCommandState.selectedIndex,
        }}
        fileDisplayProps={{
            selectedFiles,
            onRemove: handlers.removeSelectedFile,
            onCancelUpload,
            onConfigure: setConfiguringFile,
            onPreview: setPreviewFile,
        }}
        inputProps={{
            value: inputText,
            onChange: handlers.handleInputChange,
            onKeyDown: handlers.handleKeyDown,
            onPaste: handlers.handlePaste,
            textareaRef,
            placeholder: t('chatInputPlaceholder'),
            disabled: isAnyModalOpen || isTranscribing || isWaitingForUpload || isRecording || isConverting,
            onCompositionStart: () => isComposingRef.current = true,
            onCompositionEnd: () => isComposingRef.current = false,
            onFocus: adjustTextareaHeight,
        }}
        layoutProps={{
            isFullscreen,
            isPipActive,
            isAnimatingSend,
            isMobile,
            initialTextareaHeight: isMobile ? 24 : INITIAL_TEXTAREA_HEIGHT_PX,
            isConverting,
        }}
        fileInputRefs={{
            fileInputRef,
            imageInputRef,
            folderInputRef,
            zipInputRef,
            handleFileChange: handlers.handleFileChange,
            handleFolderChange: handlers.handleFolderChange,
            handleZipChange: handlers.handleZipChange,
        }}
        formProps={{
            onSubmit: handlers.handleSubmit,
        }}
        t={t}
      />
  );

  return (
    <>
      <ChatInputModals
        showCamera={showCamera}
        onPhotoCapture={handlePhotoCapture}
        onCameraCancel={() => { setShowCamera(false); textareaRef.current?.focus(); }}
        showRecorder={showRecorder}
        onAudioRecord={handleAudioRecord}
        onRecorderCancel={() => { setShowRecorder(false); textareaRef.current?.focus(); }}
        showCreateTextFileEditor={showCreateTextFileEditor}
        onConfirmCreateTextFile={handleConfirmCreateTextFile}
        onCreateTextFileCancel={() => { setShowCreateTextFileEditor(false); textareaRef.current?.focus(); }}
        isHelpModalOpen={isHelpModalOpen}
        onHelpModalClose={() => setIsHelpModalOpen(false)}
        allCommandsForHelp={allCommandsForHelp}
        isProcessingFile={isProcessingFile}
        isLoading={isLoading}
        t={t}
        isHistorySidebarOpen={isHistorySidebarOpen}
      />
      
      <VideoSettingsModal 
        isOpen={!!configuringFile} 
        onClose={() => setConfiguringFile(null)} 
        file={configuringFile}
        onSave={handlers.handleSaveVideoMetadata}
        t={t}
      />

      <FilePreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
        themeColors={{} as ThemeColors}
        t={t}
        onPrev={handlers.handlePrevImage}
        onNext={handlers.handleNextImage}
        hasPrev={handlers.currentImageIndex > 0}
        hasNext={handlers.currentImageIndex !== -1 && handlers.currentImageIndex < handlers.inputImages.length - 1}
      />

      {isFullscreen ? createPortal(chatInputContent, targetDocument.body) : chatInputContent}
    </>
  );
};
