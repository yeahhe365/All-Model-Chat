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
import { ContextMenu, ContextMenuItem } from './shared/ContextMenu';

interface ChatInputProps {
  appSettings: AppSettings;
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
}

const INITIAL_TEXTAREA_HEIGHT_PX = 28;
const MAX_TEXTAREA_HEIGHT_PX = 150; 

export const ChatInput: React.FC<ChatInputProps> = (props) => {
  const {
    appSettings, activeSessionId, commandedInput, onMessageSent, selectedFiles, setSelectedFiles, onSendMessage,
    isLoading, isEditing, onStopGenerating, onCancelEdit, onProcessFiles,
    onAddFileById, onCancelUpload, isProcessingFile, fileError, t,
    isImagenModel, isImageEditModel, aspectRatio, setAspectRatio, onTranscribeAudio,
    isGoogleSearchEnabled, onToggleGoogleSearch,
    isCodeExecutionEnabled, onToggleCodeExecution,
    isUrlContextEnabled, onToggleUrlContext,
    onClearChat, onNewChat, onOpenSettings, onToggleCanvasPrompt, onTogglePinCurrentSession, onTogglePip,
    onRetryLastTurn, onSelectModel, availableModels, onEditLastUserMessage, isPipActive,
  } = props;

  const [inputText, setInputText] = useState('');
  const [isAnimatingSend, setIsAnimatingSend] = useState(false);
  const [fileIdInput, setFileIdInput] = useState('');
  const [isAddingById, setIsAddingById] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isAddingByUrl, setIsAddingByUrl] = useState(false);
  const [isWaitingForUpload, setIsWaitingForUpload] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ isOpen: boolean; x: number; y: number; items: ContextMenuItem[] } | null>(null);

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
        }
    }
  }, [isWaitingForUpload, selectedFiles, onSendMessage, inputText, onMessageSent, clearCurrentDraft]);

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
        props.fileError = "Invalid YouTube URL provided.";
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
  }, [setSelectedFiles, setShowAddByUrlInput]);

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

  const handleTextareaContextMenu = useCallback((e: React.MouseEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const textarea = textareaRef.current;
    if (!textarea) return;

    const selectedText = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
    let items: ContextMenuItem[] = [];

    if (selectedText) {
        items.push({
            label: t('copy'),
            icon: 'ClipboardCopy',
            onClick: () => {
                navigator.clipboard.writeText(selectedText);
            },
        });
        items.push({
            label: t('cut'),
            icon: 'Scissors',
            onClick: () => {
                navigator.clipboard.writeText(selectedText);
                const { selectionStart, selectionEnd, value } = textarea;
                const newValue = value.slice(0, selectionStart) + value.slice(selectionEnd);
                handleInputChange({ target: { value: newValue } } as any);
                textarea.focus();
                requestAnimationFrame(() => {
                    textarea.selectionStart = textarea.selectionEnd = selectionStart;
                });
            },
        });
    } else {
        items.push({
            label: t('paste'),
            icon: 'ClipboardPaste',
            onClick: async () => {
                try {
                    const clipboardText = await navigator.clipboard.readText();
                    if (!clipboardText) return;
                    const { selectionStart, selectionEnd, value } = textarea;
                    const newValue = value.slice(0, selectionStart) + clipboardText + value.slice(selectionEnd);
                    handleInputChange({ target: { value: newValue } } as any);
                    textarea.focus();
                    requestAnimationFrame(() => {
                        textarea.selectionStart = textarea.selectionEnd = selectionStart + clipboardText.length;
                    });
                } catch (err) {
                    console.error('Failed to paste text: ', err);
                }
            },
        });
    }

    if (items.length > 0) {
        setContextMenu({
            isOpen: true,
            x: e.pageX,
            y: e.pageY,
            items,
        });
    }
  }, [t, handleInputChange]);

  const handleCloseContextMenu = () => {
    setContextMenu(null);
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
        <div className={`mx-auto w-full ${!isPipActive ? 'max-w-6xl' : ''} px-2 sm:px-3 pt-1 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)]`}>
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
            
            <form onSubmit={handleSubmit} className={`relative ${isAnimatingSend ? 'form-send-animate' : ''}`}>
                <SlashCommandMenu
                    isOpen={slashCommandState.isOpen}
                    commands={slashCommandState.filteredCommands}
                    onSelect={handleCommandSelect}
                    selectedIndex={slashCommandState.selectedIndex}
                />
                <div className="flex flex-col gap-1 rounded-2xl border border-[color:var(--theme-border-secondary)/0.5] bg-[var(--theme-bg-input)] px-2 py-1 shadow-lg focus-within:border-transparent focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-[var(--theme-bg-secondary)] focus-within:ring-[var(--theme-border-focus)] transition-all duration-200">
                    <textarea
                        ref={textareaRef} value={inputText} onChange={handleInputChange}
                        onKeyDown={handleKeyDown} onPaste={handlePaste}
                        onCompositionStart={() => isComposingRef.current = true}
                        onCompositionEnd={() => isComposingRef.current = false}
                        onContextMenu={handleTextareaContextMenu}
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
      {contextMenu && (
        <ContextMenu 
            isOpen={contextMenu.isOpen}
            position={{ x: contextMenu.x, y: contextMenu.y }}
            onClose={handleCloseContextMenu}
            items={contextMenu.items}
        />
      )}
    </>
  );
};