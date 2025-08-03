import React, { useRef, useState, useCallback, useEffect } from 'react';
import { UploadedFile, AppSettings, ModelOption } from '../types';
import { ALL_SUPPORTED_MIME_TYPES, SUPPORTED_IMAGE_MIME_TYPES, SUPPORTED_VIDEO_MIME_TYPES } from '../constants/fileConstants';
import { translations, getResponsiveValue } from '../utils/appUtils';
import { SlashCommandMenu } from './chat/input/SlashCommandMenu';
import { ChatInputToolbar } from './chat/input/ChatInputToolbar';
import { ChatInputActions } from './chat/input/ChatInputActions';
import { ChatInputModals } from './chat/input/ChatInputModals';
import { useChatInputModals } from '../hooks/useChatInputModals';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { useSlashCommands } from '../hooks/useSlashCommands';

interface ChatInputProps {
  appSettings: AppSettings;
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
  aspectRatio?: string;
  setAspectRatio?: (ratio: string) => void;
  isGoogleSearchEnabled: boolean;
  onToggleGoogleSearch: () => void;
  isCodeExecutionEnabled: boolean;
  onToggleCodeExecution: () => void;
  isUrlContextEnabled: boolean;
  onToggleUrlContext: () => void;
  onClearChat: () => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
  onToggleCanvasPrompt: () => void;
  onTogglePinCurrentSession: () => void;
  onRetryLastTurn: () => void;
  onSelectModel: (modelId: string) => void;
  availableModels: ModelOption[];
  onEditLastUserMessage: () => void;
}

const INITIAL_TEXTAREA_HEIGHT_PX = 28;
const MAX_TEXTAREA_HEIGHT_PX = 150; 

export const ChatInput: React.FC<ChatInputProps> = (props) => {
  const {
    appSettings, commandedInput, onMessageSent, selectedFiles, setSelectedFiles, onSendMessage,
    isLoading, isEditing, onStopGenerating, onCancelEdit, onProcessFiles,
    onAddFileById, onCancelUpload, isProcessingFile, fileError, t,
    isImagenModel, aspectRatio, setAspectRatio, onTranscribeAudio,
    isGoogleSearchEnabled, onToggleGoogleSearch,
    isCodeExecutionEnabled, onToggleCodeExecution,
    isUrlContextEnabled, onToggleUrlContext,
    onClearChat, onNewChat, onOpenSettings, onToggleCanvasPrompt, onTogglePinCurrentSession,
    onRetryLastTurn, onSelectModel, availableModels, onEditLastUserMessage
  } = props;

  const [inputText, setInputText] = useState('');
  const [isAnimatingSend, setIsAnimatingSend] = useState(false);
  const [fileIdInput, setFileIdInput] = useState('');
  const [isAddingById, setIsAddingById] = useState(false);
  const [isWaitingForUpload, setIsWaitingForUpload] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const justInitiatedFileOpRef = useRef(false);
  const prevIsProcessingFileRef = useRef(isProcessingFile);
  const isComposingRef = useRef(false);

  const adjustTextareaHeight = useCallback(() => {
    const target = textareaRef.current;
    if (!target) return;
    const currentInitialHeight = getResponsiveValue(24, INITIAL_TEXTAREA_HEIGHT_PX);
    target.style.height = 'auto';
    const scrollHeight = target.scrollHeight;
    const newHeight = Math.max(currentInitialHeight, Math.min(scrollHeight, MAX_TEXTAREA_HEIGHT_PX));
    target.style.height = `${newHeight}px`;
  }, []);

  const {
    showCamera, showRecorder, showCreateTextFileEditor, showAddByIdInput, isHelpModalOpen,
    fileInputRef, imageInputRef, videoInputRef,
    handleAttachmentAction, handleConfirmCreateTextFile, handlePhotoCapture, handleAudioRecord,
    setIsHelpModalOpen, setShowAddByIdInput, setShowCamera, setShowRecorder, setShowCreateTextFileEditor,
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
    t, onToggleGoogleSearch, onToggleCodeExecution, onToggleUrlContext, onClearChat, onNewChat, onOpenSettings,
    onToggleCanvasPrompt, onTogglePinCurrentSession, onRetryLastTurn, onStopGenerating, onAttachmentAction: handleAttachmentAction,
    availableModels, onSelectModel, onMessageSent, setIsHelpModalOpen, textareaRef, onEditLastUserMessage, setInputText,
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

  useEffect(() => { adjustTextareaHeight(); }, [inputText, adjustTextareaHeight]);

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
            onSendMessage(inputText);
            setInputText('');
            onMessageSent();
            setIsWaitingForUpload(false);
            setIsAnimatingSend(true);
            setTimeout(() => setIsAnimatingSend(false), 400);
        }
    }
  }, [isWaitingForUpload, selectedFiles, onSendMessage, inputText, onMessageSent]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) {
      justInitiatedFileOpRef.current = true;
      await onProcessFiles(event.target.files);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  };
  
  const handlePaste = async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const isModalOpen = showCreateTextFileEditor || showCamera || showRecorder;
    const items = event.clipboardData?.items;
    if (!items || isProcessingFile || isAddingById || isModalOpen) return;
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
  const canSend = (inputText.trim() !== '' || selectedFiles.length > 0) && !isLoading && !isAddingById && !isModalOpen;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSend) {
        const filesAreStillProcessing = selectedFiles.some(f => f.isProcessing);
        if (filesAreStillProcessing) {
            setIsWaitingForUpload(true);
        } else {
            onSendMessage(inputText);
            setInputText('');
            onMessageSent();
            setIsAnimatingSend(true);
            setTimeout(() => setIsAnimatingSend(false), 400); 
        }
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

    const isMobile = getResponsiveValue(true, false);
    if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
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
    }
  };

  const removeSelectedFile = (fileIdToRemove: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== fileIdToRemove));
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
      />

      <div
        className={`bg-transparent ${isAnyModalOpen ? 'opacity-30 pointer-events-none' : ''}`}
        aria-hidden={isAnyModalOpen}
      >
        <div className="mx-auto w-full max-w-5xl px-2 sm:px-3 mb-2 sm:mb-3">
            <ChatInputToolbar
              isImagenModel={isImagenModel || false}
              aspectRatio={aspectRatio}
              setAspectRatio={setAspectRatio}
              fileError={fileError}
              selectedFiles={selectedFiles}
              onRemoveFile={removeSelectedFile}
              onCancelUpload={onCancelUpload}
              showAddByIdInput={showAddByIdInput}
              fileIdInput={fileIdInput}
              setFileIdInput={setFileIdInput}
              onAddFileByIdSubmit={handleAddFileByIdSubmit}
              onCancelAddById={() => { setShowAddByIdInput(false); setFileIdInput(''); textareaRef.current?.focus(); }}
              isAddingById={isAddingById}
              isLoading={isLoading}
              t={t}
            />
            
            <form onSubmit={handleSubmit} className={`relative ${isAnimatingSend ? 'form-send-animate' : ''}`}>
                <SlashCommandMenu
                    isOpen={slashCommandState.isOpen}
                    commands={slashCommandState.filteredCommands}
                    onSelect={handleCommandSelect}
                    selectedIndex={slashCommandState.selectedIndex}
                />
                <div className="flex flex-col gap-1 rounded-2xl border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-input)] px-2 py-1 shadow-lg focus-within:border-transparent focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-[var(--theme-bg-secondary)] focus-within:ring-[var(--theme-border-focus)] transition-all duration-200">
                    <textarea
                        ref={textareaRef} value={inputText} onChange={handleInputChange}
                        onKeyDown={handleKeyDown} onPaste={handlePaste}
                        onCompositionStart={() => isComposingRef.current = true}
                        onCompositionEnd={() => isComposingRef.current = false}
                        placeholder={t('chatInputPlaceholder')}
                        className="w-full bg-transparent border-0 resize-none px-1.5 py-1 text-base placeholder:text-[var(--theme-text-tertiary)] focus:ring-0 focus:outline-none custom-scrollbar"
                        style={{ height: `${getResponsiveValue(24, INITIAL_TEXTAREA_HEIGHT_PX)}px` }}
                        aria-label="Chat message input"
                        onFocus={() => adjustTextareaHeight()} disabled={isAnyModalOpen || isTranscribing || isWaitingForUpload || isRecording}
                        rows={1}
                    />
                    <div className="flex items-center justify-between w-full">
                        <ChatInputActions
                            onAttachmentAction={handleAttachmentAction}
                            disabled={isProcessingFile || isAddingById || isModalOpen || isWaitingForUpload}
                            isGoogleSearchEnabled={isGoogleSearchEnabled}
                            onToggleGoogleSearch={() => handleToggleToolAndFocus(onToggleGoogleSearch)}
                            isCodeExecutionEnabled={isCodeExecutionEnabled}
                            onToggleCodeExecution={() => handleToggleToolAndFocus(onToggleCodeExecution)}
                            isUrlContextEnabled={isUrlContextEnabled}
                            onToggleUrlContext={() => handleToggleToolAndFocus(onToggleUrlContext)}
                            onRecordButtonClick={handleVoiceInputClick}
                            onCancelRecording={handleCancelRecording}
                            isRecording={isRecording}
                            isMicInitializing={isMicInitializing}
                            isTranscribing={isTranscribing}
                            isLoading={isLoading}
                            onStopGenerating={onStopGenerating}
                            isEditing={isEditing}
                            onCancelEdit={onCancelEdit}
                            canSend={canSend}
                            isWaitingForUpload={isWaitingForUpload}
                            t={t}
                        />
                         {/* Hidden inputs for file selection, triggered by AttachmentMenu */}
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept={ALL_SUPPORTED_MIME_TYPES.join(',')} className="hidden" aria-hidden="true" multiple />
                        <input type="file" ref={imageInputRef} onChange={handleFileChange} accept={SUPPORTED_IMAGE_MIME_TYPES.join(',')} className="hidden" aria-hidden="true" multiple />
                        <input type="file" ref={videoInputRef} onChange={handleFileChange} accept={SUPPORTED_VIDEO_MIME_TYPES.join(',')} className="hidden" aria-hidden="true" multiple />
                    </div>
                </div>
            </form>
        </div>
      </div>
    </>
  );
};
