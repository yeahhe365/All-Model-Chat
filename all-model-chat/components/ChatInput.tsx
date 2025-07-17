import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { HelpCircle, UploadCloud, Trash2, FilePlus2, Settings, Wand2, Globe, Terminal, Link, Pin, RotateCw, Bot, ImageIcon } from 'lucide-react';
import { UploadedFile, AppSettings, ModelOption } from '../types';
import { ALL_SUPPORTED_MIME_TYPES, SUPPORTED_IMAGE_MIME_TYPES, SUPPORTED_VIDEO_MIME_TYPES } from '../constants/fileConstants';
import { translations, getResponsiveValue } from '../utils/appUtils';
import { AttachmentAction } from './chat/input/AttachmentMenu';
import { SlashCommandMenu } from './chat/input/SlashCommandMenu';
import type { Command } from './chat/input/SlashCommandMenu';
import { ChatInputToolbar } from './chat/input/ChatInputToolbar';
import { ChatInputActions } from './chat/input/ChatInputActions';
import { ChatInputModals } from './chat/input/ChatInputModals';

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
}

const INITIAL_TEXTAREA_HEIGHT_PX = 28;
const MAX_TEXTAREA_HEIGHT_PX = 150; 

export const ChatInput: React.FC<ChatInputProps> = ({
  appSettings, commandedInput, onMessageSent, selectedFiles, setSelectedFiles, onSendMessage,
  isLoading, isEditing, onStopGenerating, onCancelEdit, onProcessFiles,
  onAddFileById, onCancelUpload, isProcessingFile, fileError, t,
  isImagenModel, aspectRatio, setAspectRatio, onTranscribeAudio,
  isGoogleSearchEnabled, onToggleGoogleSearch,
  isCodeExecutionEnabled, onToggleCodeExecution,
  isUrlContextEnabled, onToggleUrlContext,
  onClearChat, onNewChat, onOpenSettings, onToggleCanvasPrompt, onTogglePinCurrentSession,
  onRetryLastTurn, onSelectModel, availableModels
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const justInitiatedFileOpRef = useRef(false);
  const prevIsProcessingFileRef = useRef(isProcessingFile);

  const [inputText, setInputText] = useState('');
  const [isAnimatingSend, setIsAnimatingSend] = useState(false);
  const [showAddByIdInput, setShowAddByIdInput] = useState(false);
  const [fileIdInput, setFileIdInput] = useState('');
  const [isAddingById, setIsAddingById] = useState(false);
  
  const [showCreateTextFileEditor, setShowCreateTextFileEditor] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isWaitingForUpload, setIsWaitingForUpload] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  const [slashCommandState, setSlashCommandState] = useState<{
    isOpen: boolean;
    query: string;
    filteredCommands: Command[];
    selectedIndex: number;
  }>({
    isOpen: false,
    query: '',
    filteredCommands: [],
    selectedIndex: 0,
  });

  const commands = useMemo<Command[]>(() => [
    { name: 'model', description: t('help_cmd_model'), icon: <Bot size={16} />, action: () => {
        setInputText('/model ');
        setTimeout(() => {
            const textarea = textareaRef.current;
            if (textarea) {
                textarea.focus();
                const textLength = textarea.value.length;
                textarea.setSelectionRange(textLength, textLength);
            }
        }, 0);
    } },
    { name: 'help', description: t('help_cmd_help'), icon: <HelpCircle size={16} />, action: () => setIsHelpModalOpen(true) },
    { name: 'pin', description: t('help_cmd_pin'), icon: <Pin size={16} />, action: onTogglePinCurrentSession },
    { name: 'retry', description: t('help_cmd_retry'), icon: <RotateCw size={16} />, action: onRetryLastTurn },
    { name: 'search', description: t('help_cmd_search'), icon: <Globe size={16} />, action: onToggleGoogleSearch },
    { name: 'code', description: t('help_cmd_code'), icon: <Terminal size={16} />, action: onToggleCodeExecution },
    { name: 'url', description: t('help_cmd_url'), icon: <Link size={16} />, action: onToggleUrlContext },
    { name: 'file', description: t('help_cmd_file'), icon: <UploadCloud size={16} />, action: () => handleAttachmentAction('upload') },
    { name: 'clear', description: t('help_cmd_clear'), icon: <Trash2 size={16} />, action: onClearChat },
    { name: 'new', description: t('help_cmd_new'), icon: <FilePlus2 size={16} />, action: onNewChat },
    { name: 'settings', description: t('help_cmd_settings'), icon: <Settings size={16} />, action: onOpenSettings },
    { name: 'canvas', description: t('help_cmd_canvas'), icon: <Wand2 size={16} />, action: onToggleCanvasPrompt },
  ], [t, onToggleGoogleSearch, onToggleCodeExecution, onToggleUrlContext, onClearChat, onNewChat, onOpenSettings, onToggleCanvasPrompt, onTogglePinCurrentSession, onRetryLastTurn]);
  
  const allCommandsForHelp = useMemo(() => [
    ...commands.map(c => ({ name: `/${c.name}`, description: c.description })),
  ], [commands, t]);

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

  const adjustTextareaHeight = useCallback(() => {
    const target = textareaRef.current;
    if (!target) return;
    const currentInitialHeight = getResponsiveValue(24, INITIAL_TEXTAREA_HEIGHT_PX);
    target.style.height = 'auto';
    const scrollHeight = target.scrollHeight;
    const newHeight = Math.max(currentInitialHeight, Math.min(scrollHeight, MAX_TEXTAREA_HEIGHT_PX));
    target.style.height = `${newHeight}px`;
  }, []);

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

  const handleCommandSelect = useCallback((command: Command) => {
    if (!command) return;
    command.action();
    setSlashCommandState({ isOpen: false, query: '', filteredCommands: [], selectedIndex: 0 });
    
    // After performing the action, clear the input field.
    // The 'model' command's purpose is to insert '/model ' into the input,
    // so we don't clear it in that specific case. Other commands are one-shot actions.
    if (command.name !== 'model') {
        setInputText('');
        onMessageSent();
    }
  }, [onMessageSent]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputText(value);
  
    if (!value.startsWith('/')) {
      setSlashCommandState(prev => ({ ...prev, isOpen: false }));
      return;
    }
  
    const [commandPart, ...args] = value.split(' ');
    const commandName = commandPart.substring(1).toLowerCase();
  
    // Check for immediate execution on space for no-argument commands.
    if (value.endsWith(' ') && value.trim() === `/${commandName}`) {
      const matchedCommand = commands.find(cmd => cmd.name === commandName);
      if (matchedCommand && matchedCommand.name !== 'model') {
        matchedCommand.action();
        setInputText('');
        onMessageSent();
        setSlashCommandState({ isOpen: false, query: '', filteredCommands: [], selectedIndex: 0 });
        return; // Action taken, no need to show menu.
      }
    }
  
    // Handle command suggestions.
    if (commandName === 'model') {
      const keyword = args.join(' ').toLowerCase();
      const filteredModels = availableModels.filter(m => m.name.toLowerCase().includes(keyword));
      const modelCommands: Command[] = filteredModels.map(model => ({
        name: model.name,
        description: model.isPinned ? `Pinned Model` : `ID: ${model.id}`,
        icon: model.id.includes('imagen') ? <ImageIcon size={16} /> : (model.isPinned ? <Pin size={16} /> : <Bot size={16} />),
        action: () => {
          onSelectModel(model.id);
          setInputText('');
          onMessageSent();
        },
      }));
  
      setSlashCommandState({
        isOpen: modelCommands.length > 0 || !keyword.trim(),
        query: 'model',
        filteredCommands: modelCommands,
        selectedIndex: 0,
      });
    } else {
      // For other commands, show suggestions only if there's no space yet.
      const query = commandPart.substring(1).toLowerCase();
      const filtered = commands.filter(cmd => cmd.name.toLowerCase().startsWith(query));
      setSlashCommandState({
        isOpen: filtered.length > 0 && !value.includes(' '),
        query: query,
        filteredCommands: filtered,
        selectedIndex: 0,
      });
    }
  };
  
  const handleSlashCommand = (text: string) => {
    const [commandWithSlash, ...args] = text.split(' ');
    const keyword = args.join(' ').toLowerCase();
    const commandName = commandWithSlash.substring(1);

    if (commandName === 'model' && keyword) {
        const model = availableModels.find(m => m.name.toLowerCase().includes(keyword));
        if (model) {
            onSelectModel(model.id);
            setInputText('');
            onMessageSent();
        }
        return;
    }

    const command = commands.find(cmd => cmd.name === commandName);
    if (command && !keyword) {
        command.action();
        setInputText('');
        onMessageSent();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (slashCommandState.isOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashCommandState(prev => ({
          ...prev,
          selectedIndex: (prev.selectedIndex + 1) % prev.filteredCommands.length,
        }));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashCommandState(prev => ({
          ...prev,
          selectedIndex: (prev.selectedIndex - 1 + prev.filteredCommands.length) % prev.filteredCommands.length,
        }));
      } else if (e.key === 'Enter') {
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
            handleSlashCommand(trimmedInput);
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

  const openActionModal = (modal: 'camera' | 'recorder' | 'text' | 'id' | null) => {
    setShowCamera(modal === 'camera');
    setShowRecorder(modal === 'recorder');
    setShowCreateTextFileEditor(modal === 'text');
    setShowAddByIdInput(modal === 'id');
  };

  const handleAttachmentAction = (action: AttachmentAction) => {
      switch(action) {
          case 'upload': fileInputRef.current?.click(); break;
          case 'gallery': imageInputRef.current?.click(); break;
          case 'video': videoInputRef.current?.click(); break;
          case 'camera': openActionModal('camera'); break;
          case 'recorder': openActionModal('recorder'); break;
          case 'id': openActionModal('id'); break;
          case 'text': openActionModal('text'); break;
      }
  };

  const handleConfirmCreateTextFile = async (content: string, filename: string) => {
    justInitiatedFileOpRef.current = true;
    const sanitizeFilename = (name: string): string => {
        let saneName = name.trim().replace(/[<>:"/\\|?*]+/g, '_');
        if (!saneName.toLowerCase().endsWith('.txt')) saneName += '.txt';
        return saneName;
    };
    const finalFilename = filename.trim() ? sanitizeFilename(filename) : `custom-text-${Date.now()}.txt`;
    const newFile = new File([content], finalFilename, { type: "text/plain" });
    await onProcessFiles([newFile]);
    setShowCreateTextFileEditor(false);
  };
  
  const handlePhotoCapture = (file: File) => {
    justInitiatedFileOpRef.current = true;
    onProcessFiles([file]);
    setShowCamera(false);
    textareaRef.current?.focus();
  };

  const handleAudioRecord = async (file: File) => {
    justInitiatedFileOpRef.current = true;
    await onProcessFiles([file]);
    setShowRecorder(false);
    textareaRef.current?.focus();
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
        <div className="mx-auto w-full max-w-7xl px-2 sm:px-3 mb-2 sm:mb-3">
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
                        placeholder={t('chatInputPlaceholder')}
                        className="w-full bg-transparent border-0 resize-none px-1.5 py-1 text-base placeholder:text-[var(--theme-text-tertiary)] focus:ring-0 focus:outline-none custom-scrollbar"
                        style={{ height: `${getResponsiveValue(24, INITIAL_TEXTAREA_HEIGHT_PX)}px` }}
                        aria-label="Chat message input"
                        onFocus={() => adjustTextareaHeight()} disabled={isAnyModalOpen || isTranscribing || isWaitingForUpload}
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
                            onRecordButtonClick={() => openActionModal('recorder')}
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