
import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { UploadedFile, AppSettings, ModelOption, ChatSettings as IndividualChatSettings } from '../../types';
import { ALL_SUPPORTED_MIME_TYPES } from '../../constants/fileConstants';
import { translations, getKeyForRequest } from '../../utils/appUtils';
import { geminiServiceInstance } from '../../services/geminiService';
import { ChatInputModals } from './input/ChatInputModals';
import { ChatInputArea } from './input/ChatInputArea';
import { useChatInputModals } from '../../hooks/useChatInputModals';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import { useSlashCommands } from '../../hooks/useSlashCommands';
import { useIsDesktop } from '../../hooks/useDevice';
import { useWindowContext } from '../../contexts/WindowContext';
import { useChatInputState, INITIAL_TEXTAREA_HEIGHT_PX } from '../../hooks/useChatInputState';

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
    generateQuadImages, onToggleQuadImages
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

  const {
    showCamera, showRecorder, showCreateTextFileEditor, showAddByIdInput, showAddByUrlInput, isHelpModalOpen,
    fileInputRef, imageInputRef, videoInputRef,
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
                setIsFullscreen(false); // Close fullscreen on send
            }
        }
    }
  }, [isWaitingForUpload, selectedFiles, onSendMessage, inputText, onMessageSent, clearCurrentDraft, isFullscreen]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) {
      justInitiatedFileOpRef.current = true;
      await onProcessFiles(event.target.files);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  };
  
  const handleAddUrl = useCallback(async (url: string) => {
    const youtubeRegex = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})(?:\S+)?$/;
    if (!youtubeRegex.test(url)) {
        setAppFileError("Invalid YouTube URL provided.");
        return;
    }
    justInitiatedFileOpRef.current = true;
    const newUrlFile: UploadedFile = {
      id: `url-${Date.now()}`,
      name: url.length > 30 ? `${url.substring(0, 27)}...` : url,
      type: 'video/youtube-link',
      size: 0,
      fileUri: url,
      uploadState: 'active',
      isProcessing: false,
    };
    setSelectedFiles(prev => [...prev, newUrlFile]);
    setUrlInput('');
    setShowAddByUrlInput(false);
    textareaRef.current?.focus();
  }, [setSelectedFiles, setShowAddByUrlInput, setAppFileError]);

  const handlePaste = async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const isModalOpen = showCreateTextFileEditor || showCamera || showRecorder;
    if (isAddingById || isModalOpen) return;

    const pastedText = event.clipboardData?.getData('text');
    const youtubeRegex = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})(?:\S+)?$/;
    if (pastedText && youtubeRegex.test(pastedText)) {
      event.preventDefault();
      await handleAddUrl(pastedText.trim());
      return;
    }

    const items = event.clipboardData?.items;
    if (!items) return;

    const filesToProcess = Array.from(items)
      .filter(item => item.kind === 'file' && ALL_SUPPORTED_MIME_TYPES.includes(item.type))
      .map(item => item.getAsFile()).filter((f): f is File => f !== null);

    if (filesToProcess.length > 0) {
      event.preventDefault();
      justInitiatedFileOpRef.current = true;
      await onProcessFiles(filesToProcess);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleSlashInputChange(e.target.value);
  };

  const isModalOpen = showCreateTextFileEditor || showCamera || showRecorder;
  const isAnyModalOpen = isModalOpen || isHelpModalOpen;
  
  const canSend = (
    (inputText.trim() !== '' || selectedFiles.length > 0)
    && !isLoading && !isAddingById && !isModalOpen
  );


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSend) {
        const filesAreStillProcessing = selectedFiles.some(f => f.isProcessing);
        if (filesAreStillProcessing) {
            setIsWaitingForUpload(true);
        } else {
            clearCurrentDraft();
            onSendMessage(inputText);
            setInputText('');
            onMessageSent();
            setIsAnimatingSend(true);
            setTimeout(() => setIsAnimatingSend(false), 400);
            if (isFullscreen) {
                setIsFullscreen(false);
            }
        }
    }
  };
  
  const handleTranslate = async () => {
    if (!inputText.trim() || isTranslating) return;

    setIsTranslating(true);
    setAppFileError(null);

    // Use skipIncrement: true for translation tool to avoid burning through rotation keys
    const keyResult = getKeyForRequest(appSettings, currentChatSettings, { skipIncrement: true });
    if ('error' in keyResult) {
        setAppFileError(keyResult.error);
        setIsTranslating(false);
        return;
    }

    try {
        const translatedText = await geminiServiceInstance.translateText(keyResult.key, inputText);
        setInputText(translatedText);
        setTimeout(() => adjustTextareaHeight(), 0);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Translation failed.";
        setAppFileError(errorMessage);
    } finally {
        setIsTranslating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isComposingRef.current) return;

    if (slashCommandState.isOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashCommandState(prev => ({ ...prev, selectedIndex: (prev.selectedIndex + 1) % prev.filteredCommands.length, }));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashCommandState(prev => ({ ...prev, selectedIndex: (prev.selectedIndex - 1 + prev.filteredCommands.length) % prev.filteredCommands.length, }));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        handleCommandSelect(slashCommandState.filteredCommands[slashCommandState.selectedIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setSlashCommandState(prev => ({ ...prev, isOpen: false }));
      }
      return;
    }

    // On mobile (small screens), Enter usually creates a new line.
    // On desktop, Enter sends message, Shift+Enter creates a new line.
    if (e.key === 'Enter' && !e.shiftKey && (!isMobile || isDesktop)) {
        const trimmedInput = inputText.trim();
        if (trimmedInput.startsWith('/')) {
            e.preventDefault();
            handleSlashCommandExecution(trimmedInput);
            return;
        }
        if (canSend) {
            e.preventDefault();
            handleSubmit(e as unknown as React.FormEvent);
        }
    } else if (e.key === 'Escape' && isFullscreen) {
        e.preventDefault();
        handleToggleFullscreen();
    }
  };

  const removeSelectedFile = (fileIdToRemove: string) => {
    setSelectedFiles(prev => {
        const fileToRemove = prev.find(f => f.id === fileIdToRemove);
        if (fileToRemove && fileToRemove.dataUrl && fileToRemove.dataUrl.startsWith('blob:')) {
            URL.revokeObjectURL(fileToRemove.dataUrl);
        }
        return prev.filter(f => f.id !== fileIdToRemove);
    });
  };

  const handleAddFileByIdSubmit = async () => {
    if (!fileIdInput.trim() || isAddingById || isLoading) return;
    setIsAddingById(true);
    justInitiatedFileOpRef.current = true;
    await onAddFileById(fileIdInput.trim());
    setIsAddingById(false);
    setFileIdInput('');
  };

  const handleToggleToolAndFocus = (toggleFunc: () => void) => {
    toggleFunc();
    setTimeout(() => textareaRef.current?.focus(), 0);
  };
  
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
            onAddFileByIdSubmit: handleAddFileByIdSubmit,
            onCancelAddById: () => { setShowAddByIdInput(false); setFileIdInput(''); textareaRef.current?.focus(); },
            isAddingById,
            showAddByUrlInput,
            urlInput,
            setUrlInput,
            onAddUrlSubmit: () => handleAddUrl(urlInput),
            onCancelAddUrl: () => { setShowAddByUrlInput(false); setUrlInput(''); textareaRef.current?.focus(); },
            isAddingByUrl,
            isLoading,
            t,
            generateQuadImages,
            onToggleQuadImages,
        }}
        actionsProps={{
            onAttachmentAction: handleAttachmentAction,
            disabled: isAddingById || isModalOpen || isWaitingForUpload,
            isGoogleSearchEnabled,
            onToggleGoogleSearch: () => handleToggleToolAndFocus(onToggleGoogleSearch),
            isCodeExecutionEnabled,
            onToggleCodeExecution: () => handleToggleToolAndFocus(onToggleCodeExecution),
            isUrlContextEnabled,
            onToggleUrlContext: () => handleToggleToolAndFocus(onToggleUrlContext),
            isDeepSearchEnabled,
            onToggleDeepSearch: () => handleToggleToolAndFocus(onToggleDeepSearch),
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
            onTranslate: handleTranslate,
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
            onRemove: removeSelectedFile,
            onCancelUpload,
        }}
        inputProps={{
            value: inputText,
            onChange: handleInputChange,
            onKeyDown: handleKeyDown,
            onPaste: handlePaste,
            textareaRef,
            placeholder: t('chatInputPlaceholder'),
            disabled: isAnyModalOpen || isTranscribing || isWaitingForUpload || isRecording,
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
        }}
        fileInputRefs={{
            fileInputRef,
            imageInputRef,
            videoInputRef,
            handleFileChange,
        }}
        formProps={{
            onSubmit: handleSubmit,
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

      {isFullscreen ? createPortal(chatInputContent, targetDocument.body) : chatInputContent}
    </>
  );
};
