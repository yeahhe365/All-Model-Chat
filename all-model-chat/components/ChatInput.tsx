
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UploadedFile, AppSettings, ModelOption, ChatSettings as IndividualChatSettings } from '../types';
import { ALL_SUPPORTED_MIME_TYPES, SUPPORTED_IMAGE_MIME_TYPES, SUPPORTED_VIDEO_MIME_TYPES } from '../constants/fileConstants';
import { translations, getResponsiveValue, getKeyForRequest } from '../utils/appUtils';
import { geminiServiceInstance } from '../services/geminiService';
import { SlashCommandMenu } from './chat/input/SlashCommandMenu';
import { ChatInputToolbar } from './chat/input/ChatInputToolbar';
import { ChatInputActions } from './chat/input/ChatInputActions';
import { ChatInputModals } from './chat/input/ChatInputModals';
import { useChatInputModals } from '../hooks/useChatInputModals';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { useSlashCommands } from '../hooks/useSlashCommands';
import { useIsMobile, useIsDesktop } from '../hooks/useDevice';

interface ChatInputProps {
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
  onTogglePip: () => void;
  isPipActive?: boolean;
  isHistorySidebarOpen?: boolean;
}

const INITIAL_TEXTAREA_HEIGHT_PX = 28;
const MAX_TEXTAREA_HEIGHT_PX = 150; 

export const ChatInput: React.FC<ChatInputProps> = (props) => {
  const {
    appSettings, currentChatSettings, setAppFileError, activeSessionId, commandedInput, onMessageSent, selectedFiles, setSelectedFiles, onSendMessage,
    isLoading, isEditing, onStopGenerating, onCancelEdit, onProcessFiles,
    onAddFileById, onCancelUpload, isProcessingFile, fileError, t,
    isImagenModel, isImageEditModel, aspectRatio, setAspectRatio, onTranscribeAudio,
    isGoogleSearchEnabled, onToggleGoogleSearch,
    isCodeExecutionEnabled, onToggleCodeExecution,
    isUrlContextEnabled, onToggleUrlContext,
    onClearChat, onNewChat, onOpenSettings, onToggleCanvasPrompt, onTogglePinCurrentSession, onTogglePip,
    onRetryLastTurn, onSelectModel, availableModels, onEditLastUserMessage, isPipActive, isHistorySidebarOpen,
  } = props;

  const [inputText, setInputText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isAnimatingSend, setIsAnimatingSend] = useState(false);
  const [fileIdInput, setFileIdInput] = useState('');
  const [isAddingById, setIsAddingById] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isAddingByUrl, setIsAddingByUrl] = useState(false);
  const [isWaitingForUpload, setIsWaitingForUpload] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const justInitiatedFileOpRef = useRef(false);
  const prevIsProcessingFileRef = useRef(isProcessingFile);
  const isComposingRef = useRef(false);
  
  const isMobile = useIsMobile();
  const isDesktop = useIsDesktop();

  const adjustTextareaHeight = useCallback(() => {
    if (isFullscreen) return; // Do not adjust height in fullscreen mode
    const target = textareaRef.current;
    if (!target) return;
    // Use isMobile hook for reactive resizing instead of one-off calculation
    const currentInitialHeight = isMobile ? 24 : INITIAL_TEXTAREA_HEIGHT_PX;
    target.style.height = 'auto';
    const scrollHeight = target.scrollHeight;
    const newHeight = Math.max(currentInitialHeight, Math.min(scrollHeight, MAX_TEXTAREA_HEIGHT_PX));
    target.style.height = `${newHeight}px`;
  }, [isMobile, isFullscreen]);

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
    t, onToggleGoogleSearch, onToggleCodeExecution, onToggleUrlContext, onClearChat, onNewChat, onOpenSettings,
    onToggleCanvasPrompt, onTogglePinCurrentSession, onRetryLastTurn, onStopGenerating, onAttachmentAction: handleAttachmentAction,
    availableModels, onSelectModel, onMessageSent, setIsHelpModalOpen, textareaRef, onEditLastUserMessage, setInputText,
    onTogglePip,
  });
  
  const clearCurrentDraft = useCallback(() => {
    if (activeSessionId) {
        const draftKey = `chatDraft_${activeSessionId}`;
        localStorage.removeItem(draftKey);
    }
  }, [activeSessionId]);
  
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

  // Load draft from localStorage when session changes
  useEffect(() => {
      if (activeSessionId && !isEditing) {
          const draftKey = `chatDraft_${activeSessionId}`;
          const savedDraft = localStorage.getItem(draftKey);
          setInputText(savedDraft || '');
      }
  }, [activeSessionId, isEditing]);

  // Save draft to localStorage on input change (debounced)
  useEffect(() => {
      if (!activeSessionId) return;
      const handler = setTimeout(() => {
          const draftKey = `chatDraft_${activeSessionId}`;
          if (inputText.trim()) {
              localStorage.setItem(draftKey, inputText);
          } else {
              localStorage.removeItem(draftKey);
          }
      }, 500);
      return () => clearTimeout(handler);
  }, [inputText, activeSessionId]);

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
    if (isProcessingFile || isAddingById || isModalOpen) return;

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
    // Optimization: If it is a desktop device (pointer: fine), we always want Enter to send,
    // even if the window is small (responsive mobile layout).
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

  const handleToggleFullscreen = () => {
      setIsFullscreen(prev => {
          const newState = !prev;
          if (newState) {
              // Entering fullscreen, we want to focus. Height is handled by CSS.
              setTimeout(() => textareaRef.current?.focus(), 50);
          } else {
              // Exiting fullscreen, need to reset height calculation
              setTimeout(() => adjustTextareaHeight(), 0);
          }
          return newState;
      });
  };
  
  // Conditional styles for fullscreen
  const wrapperClass = isFullscreen 
    ? "fixed inset-0 z-[2000] bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)] p-4 sm:p-6 flex flex-col fullscreen-enter-animation" 
    : `bg-transparent ${isAnyModalOpen ? 'opacity-30 pointer-events-none' : ''}`;

  const innerContainerClass = isFullscreen
    ? "w-full max-w-6xl mx-auto flex flex-col h-full"
    : `mx-auto w-full ${!isPipActive ? 'max-w-6xl' : ''} px-2 sm:px-3 pt-1 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)]`;

  const formClass = isFullscreen
    ? "flex-grow flex flex-col relative min-h-0"
    : `relative ${isAnimatingSend ? 'form-send-animate' : ''}`;

  const inputContainerClass = isFullscreen
    ? "flex flex-col gap-1 rounded-2xl border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-input)] px-4 py-3 shadow-none h-full transition-all duration-200"
    : "flex flex-col gap-1 rounded-2xl border border-[color:var(--theme-border-secondary)/0.5] bg-[var(--theme-bg-input)] px-2 py-1 shadow-lg focus-within:border-transparent focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-[var(--theme-bg-secondary)] focus-within:ring-[var(--theme-border-focus)] transition-all duration-200";

  const chatInputContent = (
      <div
        className={wrapperClass}
        aria-hidden={isAnyModalOpen}
      >
        <div className={innerContainerClass}>
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
              showAddByUrlInput={showAddByUrlInput}
              urlInput={urlInput}
              setUrlInput={setUrlInput}
              onAddUrlSubmit={() => handleAddUrl(urlInput)}
              onCancelAddUrl={() => { setShowAddByUrlInput(false); setUrlInput(''); textareaRef.current?.focus(); }}
              isAddingByUrl={isAddingByUrl}
              isLoading={isLoading}
              t={t}
            />
            
            <form onSubmit={handleSubmit} className={formClass}>
                <SlashCommandMenu
                    isOpen={slashCommandState.isOpen}
                    commands={slashCommandState.filteredCommands}
                    onSelect={handleCommandSelect}
                    selectedIndex={slashCommandState.selectedIndex}
                    className={isFullscreen ? "absolute bottom-[60px] left-0 right-0 mb-2 w-full max-w-6xl mx-auto z-20" : undefined}
                />
                <div className={inputContainerClass}>
                    <textarea
                        ref={textareaRef} value={inputText} onChange={handleInputChange}
                        onKeyDown={handleKeyDown} onPaste={handlePaste}
                        onCompositionStart={() => isComposingRef.current = true}
                        onCompositionEnd={() => isComposingRef.current = false}
                        placeholder={t('chatInputPlaceholder')}
                        className="w-full bg-transparent border-0 resize-none px-1.5 py-1 text-base placeholder:text-[var(--theme-text-tertiary)] focus:ring-0 focus:outline-none custom-scrollbar flex-grow"
                        style={{ height: isFullscreen ? '100%' : `${isMobile ? 24 : INITIAL_TEXTAREA_HEIGHT_PX}px` }}
                        aria-label="Chat message input"
                        onFocus={() => adjustTextareaHeight()} disabled={isAnyModalOpen || isTranscribing || isWaitingForUpload || isRecording}
                        rows={1}
                    />
                    <div className="flex items-center justify-between w-full flex-shrink-0 mt-auto pt-2">
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
                            onTranslate={handleTranslate}
                            isTranslating={isTranslating}
                            inputText={inputText}
                            onToggleFullscreen={handleToggleFullscreen}
                            isFullscreen={isFullscreen}
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

      {isFullscreen ? createPortal(chatInputContent, document.body) : chatInputContent}
    </>
  );
};
