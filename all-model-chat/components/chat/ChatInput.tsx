import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { UploadedFile, AppSettings, ModelOption, ChatSettings as IndividualChatSettings, InputCommand } from '../../types';
import { translations } from '../../utils/appUtils';
import { ChatInputModals } from './input/ChatInputModals';
import { ChatInputArea } from './input/ChatInputArea';
import { useChatInputModals } from '../../hooks/chat-input/useChatInputModals';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import { useSlashCommands } from '../../hooks/useSlashCommands';
import { useIsDesktop } from '../../hooks/useDevice';
import { useWindowContext } from '../../contexts/WindowContext';
import { useChatInputState } from '../../hooks/chat-input/useChatInputState';
import { useChatInputHandlers } from '../../hooks/chat-input/useChatInputHandlers';
import { ChatInputFileModals } from './input/ChatInputFileModals';
import { useChatInputAreaProps } from '../../hooks/chat-input/useChatInputAreaProps';
import { useChatInputEffects } from '../../hooks/chat-input/useChatInputEffects';
import { useModelCapabilities } from '../../hooks/useModelCapabilities';

export interface ChatInputProps {
  appSettings: AppSettings;
  currentChatSettings: IndividualChatSettings;
  setAppFileError: (error: string | null) => void;
  activeSessionId: string | null;
  commandedInput: InputCommand | null;
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
  generateQuadImages: boolean;
  onToggleQuadImages: () => void;
  setCurrentChatSettings: (updater: (prevSettings: IndividualChatSettings) => IndividualChatSettings) => void;
  onSuggestionClick?: (suggestion: string) => void;
  onOrganizeInfoClick?: (suggestion: string) => void;
  showEmptyStateSuggestions?: boolean;
  editMode: 'update' | 'resend';
  onUpdateMessageContent: (messageId: string, content: string) => void;
  editingMessageId: string | null;
  setEditingMessageId: (id: string | null) => void;
}

export const ChatInput: React.FC<ChatInputProps> = (props) => {
  const {
    appSettings, currentChatSettings, setAppFileError, activeSessionId, commandedInput, onMessageSent, selectedFiles, setSelectedFiles, onSendMessage,
    isLoading, isEditing, onStopGenerating, onCancelEdit, onProcessFiles,
    onAddFileById, onCancelUpload, isProcessingFile, fileError, t,
    aspectRatio, setAspectRatio, imageSize, setImageSize, onTranscribeAudio,
    isGoogleSearchEnabled, onToggleGoogleSearch,
    isCodeExecutionEnabled, onToggleCodeExecution,
    isUrlContextEnabled, onToggleUrlContext,
    isDeepSearchEnabled, onToggleDeepSearch,
    onClearChat, onNewChat, onOpenSettings, onToggleCanvasPrompt, onTogglePinCurrentSession, onTogglePip,
    onRetryLastTurn, onSelectModel, availableModels, onEditLastUserMessage, isPipActive,
    generateQuadImages, onToggleQuadImages, setCurrentChatSettings,
    onSuggestionClick, onOrganizeInfoClick, showEmptyStateSuggestions,
    editMode, onUpdateMessageContent, editingMessageId, setEditingMessageId
  } = props;

  const {
    inputText, setInputText,
    quoteText, setQuoteText,
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
  const [showTokenModal, setShowTokenModal] = useState(false);

  // Model Capabilities Hook
  const { 
      isImagenModel, 
      isGemini3ImageModel, 
      isGemini3, 
      supportedAspectRatios, 
      supportedImageSizes 
  } = useModelCapabilities(currentChatSettings.modelId);

  const {
    showRecorder, showCreateTextFileEditor, showAddByIdInput, showAddByUrlInput, isHelpModalOpen,
    fileInputRef, imageInputRef, folderInputRef, zipInputRef, cameraInputRef,
    handleAttachmentAction, handleConfirmCreateTextFile, handleAudioRecord,
    setIsHelpModalOpen, setShowAddByIdInput, setShowRecorder, setShowCreateTextFileEditor, setShowAddByUrlInput,
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
    isAudioCompressionEnabled: appSettings.isAudioCompressionEnabled,
  });

  const {
    slashCommandState, setSlashCommandState, allCommandsForHelp,
    handleCommandSelect, handleInputChange: handleSlashInputChange, handleSlashCommandExecution,
  } = useSlashCommands({
    t, onToggleGoogleSearch, onToggleDeepSearch, onToggleCodeExecution, onToggleUrlContext, onClearChat, onNewChat, onOpenSettings,
    onToggleCanvasPrompt, onTogglePinCurrentSession, onRetryLastTurn, onStopGenerating, onAttachmentAction: handleAttachmentAction,
    availableModels, onSelectModel, onMessageSent, setIsHelpModalOpen, textareaRef, onEditLastUserMessage, setInputText,
    onTogglePip, currentModelId: currentChatSettings.modelId,
    onSetThinkingLevel: (level) => setCurrentChatSettings(prev => ({ ...prev, thinkingLevel: level })),
    thinkingLevel: currentChatSettings.thinkingLevel,
  });

  const isModalOpen = showCreateTextFileEditor || showRecorder || !!configuringFile || !!previewFile || showTokenModal;
  const isAnyModalOpen = isModalOpen || isHelpModalOpen;
  
  const canSend = (
    (inputText.trim() !== '' || selectedFiles.length > 0 || quoteText.trim() !== '')
    && !isLoading && !isAddingById && !isModalOpen && !isConverting
  );

  // Core Event Handlers
  const handlers = useChatInputHandlers({
    inputText, setInputText, quoteText, setQuoteText, fileIdInput, setFileIdInput, urlInput, setUrlInput,
    selectedFiles, setSelectedFiles, previewFile, setPreviewFile,
    isAddingById, setIsAddingById, isAddingByUrl, setIsAddingByUrl,
    isTranslating, setIsTranslating, isConverting, setIsConverting,
    isLoading, isFullscreen, setIsFullscreen, setIsAnimatingSend, setIsWaitingForUpload,
    isEditing, editMode, editingMessageId, setEditingMessageId,
    showCreateTextFileEditor, showCamera: false, showRecorder, setShowAddByUrlInput, setShowAddByIdInput,
    textareaRef, fileInputRef, imageInputRef, folderInputRef, zipInputRef,
    justInitiatedFileOpRef, isComposingRef,
    appSettings, currentChatSettings, setCurrentChatSettings, setAppFileError,
    slashCommandState, setSlashCommandState, handleCommandSelect, handleSlashCommandExecution, handleSlashInputChange,
    onProcessFiles, onAddFileById, onSendMessage, onMessageSent, onUpdateMessageContent,
    adjustTextareaHeight, clearCurrentDraft, handleToggleFullscreen,
    isMobile, isDesktop, canSend
  });
  
  // Side Effects Hook (Paste, Focus, Auto-Send)
  useChatInputEffects({
      commandedInput,
      setInputText,
      setQuoteText,
      textareaRef,
      prevIsProcessingFileRef,
      isProcessingFile,
      isAddingById,
      justInitiatedFileOpRef,
      isWaitingForUpload,
      selectedFiles,
      clearCurrentDraft,
      inputText,
      quoteText,
      onSendMessage,
      onMessageSent,
      setIsAnimatingSend,
      isFullscreen,
      setIsFullscreen,
      onProcessFiles,
      isModalOpen: isAnyModalOpen
  });

  // Prepare Props for Area Component
  const areaProps = useChatInputAreaProps({
    isImagenModel,
    isGemini3ImageModel,
    aspectRatio,
    setAspectRatio,
    imageSize,
    setImageSize,
    fileError,
    isLoading,
    t,
    generateQuadImages,
    onToggleQuadImages,
    supportedAspectRatios,
    supportedImageSizes,
    selectedFiles,
    onCancelUpload,
    isGemini3,
    isRecording,
    isMicInitializing,
    isTranscribing,
    onStopGenerating,
    isEditing,
    onCancelEdit,
    canSend,
    isWaitingForUpload,
    isGoogleSearchEnabled,
    onToggleGoogleSearch,
    isCodeExecutionEnabled,
    onToggleCodeExecution,
    isUrlContextEnabled,
    onToggleUrlContext,
    isDeepSearchEnabled,
    onToggleDeepSearch,
    editMode,
    fileIdInput,
    setFileIdInput,
    isAddingById,
    showAddByIdInput,
    urlInput,
    setUrlInput,
    isAddingByUrl,
    showAddByUrlInput,
    inputText,
    quoteText,
    setQuoteText,
    isTranslating,
    isFullscreen,
    isPipActive,
    isAnimatingSend,
    isMobile,
    isConverting,
    isModalOpen: isAnyModalOpen,
    slashCommandState,
    textareaRef,
    fileInputRef,
    imageInputRef,
    folderInputRef,
    zipInputRef,
    cameraInputRef,
    handlers,
    setShowAddByIdInput,
    setShowAddByUrlInput,
    setConfiguringFile,
    setPreviewFile,
    setShowTokenModal,
    handleAttachmentAction,
    handleVoiceInputClick,
    handleCancelRecording,
    handleToggleFullscreen,
    showEmptyStateSuggestions,
    onSuggestionClick,
    onOrganizeInfoClick,
  });

  // Assign ref functions to inputProps for Composition
  areaProps.inputProps.onCompositionStart = () => isComposingRef.current = true;
  areaProps.inputProps.onCompositionEnd = () => isComposingRef.current = false;

  const chatInputContent = <ChatInputArea {...areaProps} />;

  return (
    <>
      <ChatInputModals
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
      />
      
      <ChatInputFileModals
        configuringFile={configuringFile}
        setConfiguringFile={setConfiguringFile}
        showTokenModal={showTokenModal}
        setShowTokenModal={setShowTokenModal}
        previewFile={previewFile}
        setPreviewFile={setPreviewFile}
        inputText={inputText}
        selectedFiles={selectedFiles}
        appSettings={appSettings}
        availableModels={availableModels}
        currentModelId={currentChatSettings.modelId}
        t={t}
        isGemini3={isGemini3}
        handlers={{
            handleSaveFileConfig: handlers.handleSaveFileConfig,
            handlePrevImage: handlers.handlePrevImage,
            handleNextImage: handlers.handleNextImage,
            currentImageIndex: handlers.currentImageIndex,
            inputImages: handlers.inputImages
        }}
      />

      {isFullscreen ? createPortal(chatInputContent, targetDocument.body) : chatInputContent}
    </>
  );
};