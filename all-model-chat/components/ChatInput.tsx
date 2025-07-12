import React, { useRef, useState, useCallback, useEffect } from 'react';
import { ArrowUp, Ban, Paperclip, XCircle, Plus, X, Edit2, UploadCloud, FileSignature, Link2, Camera, Mic, Loader2, StopCircle, Image, SlidersHorizontal, Globe, Check, Terminal } from 'lucide-react';
import { UploadedFile, AppSettings } from '../types';
import { ALL_SUPPORTED_MIME_TYPES, SUPPORTED_IMAGE_MIME_TYPES } from '../constants/fileConstants';
import { translations, getActiveApiConfig, getResponsiveValue } from '../utils/appUtils';
import { SelectedFileDisplay } from './chat/SelectedFileDisplay';
import { geminiServiceInstance } from '../services/geminiService';
import { CreateTextFileEditor } from './chat/CreateTextFileEditor';
import { CameraCapture } from './chat/CameraCapture';
import { AudioRecorder } from './chat/AudioRecorder';

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
  isProcessingFile: boolean; 
  fileError: string | null;
  t: (key: keyof typeof translations) => string;
  isImagenModel?: boolean;
  aspectRatio?: string;
  setAspectRatio?: (ratio: string) => void;
  transcriptionModelId?: string;
  isTranscriptionThinkingEnabled?: boolean;
  isGoogleSearchEnabled: boolean;
  onToggleGoogleSearch: () => void;
  isCodeExecutionEnabled: boolean;
  onToggleCodeExecution: () => void;
}

const INITIAL_TEXTAREA_HEIGHT_PX = 28;
const MAX_TEXTAREA_HEIGHT_PX = 150; 

const AspectRatioIcon = ({ ratio }: { ratio: string }) => {
    let styles = {};
    switch (ratio) {
        case '1:1': styles = { width: '20px', height: '20px' }; break;
        case '9:16': styles = { width: '12px', height: '21px' }; break;
        case '16:9': styles = { width: '24px', height: '13.5px' }; break;
        case '4:3': styles = { width: '20px', height: '15px' }; break;
        case '3:4': styles = { width: '15px', height: '20px' }; break;
    }
    return <div style={styles} className="border-2 border-current rounded-sm mb-1"></div>;
};

const aspectRatios = ['1:1', '9:16', '16:9', '4:3', '3:4'];

export const ChatInput: React.FC<ChatInputProps> = ({
  appSettings, commandedInput, onMessageSent, selectedFiles, setSelectedFiles, onSendMessage,
  isLoading, isEditing, onStopGenerating, onCancelEdit, onProcessFiles,
  onAddFileById, onCancelUpload, isProcessingFile, fileError, t,
  isImagenModel, aspectRatio, setAspectRatio,
  transcriptionModelId, isTranscriptionThinkingEnabled,
  isGoogleSearchEnabled, onToggleGoogleSearch,
  isCodeExecutionEnabled, onToggleCodeExecution,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const justInitiatedFileOpRef = useRef(false);
  const prevIsProcessingFileRef = useRef(isProcessingFile);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingCancelledRef = useRef(false);

  const [inputText, setInputText] = useState('');
  const [isAnimatingSend, setIsAnimatingSend] = useState(false);
  const [showAddByIdInput, setShowAddByIdInput] = useState(false);
  const [fileIdInput, setFileIdInput] = useState('');
  const [isAddingById, setIsAddingById] = useState(false);
  
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const attachButtonRef = useRef<HTMLButtonElement>(null);
  
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const toolsMenuRef = useRef<HTMLDivElement>(null);
  const toolsButtonRef = useRef<HTMLButtonElement>(null);

  const [showCreateTextFileEditor, setShowCreateTextFileEditor] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [isWaitingForUpload, setIsWaitingForUpload] = useState(false);

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
    target.style.height = 'auto'; // Reset height to get the actual scroll height
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
    const handleClickOutside = (event: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(event.target as Node) &&
          attachButtonRef.current && !attachButtonRef.current.contains(event.target as Node)) {
        setIsAttachMenuOpen(false);
      }
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node) &&
          toolsButtonRef.current && !toolsButtonRef.current.contains(event.target as Node)) {
        setIsToolsMenuOpen(false);
      }
    };
    if (isAttachMenuOpen || isToolsMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAttachMenuOpen, isToolsMenuOpen]);

  useEffect(() => {
    if (isWaitingForUpload) {
        const filesAreStillProcessing = selectedFiles.some(f => f.isProcessing);
        if (!filesAreStillProcessing) {
            // All uploads finished, now send the message
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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isMobile = getResponsiveValue(true, false);
    if (e.key === 'Enter' && !e.shiftKey && !isMobile && canSend) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
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

  const sanitizeFilename = (name: string): string => {
    let saneName = name.trim().replace(/[<>:"/\\|?*]+/g, '_');
    if (!saneName.toLowerCase().endsWith('.txt')) saneName += '.txt';
    return saneName;
  };
  
  const handleConfirmCreateTextFile = async (content: string, filename: string) => {
    justInitiatedFileOpRef.current = true;
    const finalFilename = filename.trim() ? sanitizeFilename(filename) : `custom-text-${Date.now()}.txt`;
    const newFile = new File([content], finalFilename, { type: "text/plain" });
    await onProcessFiles([newFile]);
    setShowCreateTextFileEditor(false);
  };

  const handleCancelCreateTextFile = () => {
    setShowCreateTextFileEditor(false);
    textareaRef.current?.focus();
  };

  const openActionModal = (modal: 'camera' | 'recorder' | 'text' | 'id' | null) => {
    setShowCamera(modal === 'camera');
    setShowRecorder(modal === 'recorder');
    setShowCreateTextFileEditor(modal === 'text');
    setShowAddByIdInput(modal === 'id');
    setIsAttachMenuOpen(false);
    setIsToolsMenuOpen(false);
  };

    const handleStartRecording = useCallback(async () => {
    if (isRecording) return;
    recordingCancelledRef.current = false;

    setTranscriptionError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setTranscriptionError("Audio recording is not supported by your browser.");
      return;
    }

    setIsRecording(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => audioChunks.push(event.data);
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());

        if (recordingCancelledRef.current) {
            return; 
        }

        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `voice-input-${Date.now()}.webm`, { type: 'audio/webm' });
        
        setIsTranscribing(true);
        setTranscriptionError(null);
        try {
          const { apiKeysString } = getActiveApiConfig(appSettings);
          if (!apiKeysString) {
            throw new Error("API Key not configured.");
          }
          const availableKeys = apiKeysString.split('\n').map(k => k.trim()).filter(Boolean);
          if(availableKeys.length === 0) {
            throw new Error("No valid API keys found.");
          }
          const keyToUse = availableKeys[Math.floor(Math.random() * availableKeys.length)];

          const modelToUse = transcriptionModelId || 'gemini-2.5-flash';
          
          const transcribedText = await geminiServiceInstance.transcribeAudio(
            keyToUse,
            audioFile,
            modelToUse,
            isTranscriptionThinkingEnabled ?? false,
          );
          const textarea = textareaRef.current;
          if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const currentText = textarea.value;
            const newText = currentText.substring(0, start) + transcribedText + currentText.substring(end);
            setInputText(newText);
            
            requestAnimationFrame(() => {
              if (textareaRef.current) {
                const newCursorPos = start + transcribedText.length;
                textareaRef.current.focus();
                textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
              }
            });
          } else {
            setInputText((inputText ? inputText.trim() + ' ' : '') + transcribedText);
            textareaRef.current?.focus();
          }
        } catch (error) {
          console.error('Transcription error:', error);
          const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
          setTranscriptionError(`Transcription failed: ${errorMessage}`);
        } finally {
          setIsTranscribing(false);
        }
      };
      mediaRecorder.start();
    } catch (err) {
      console.error("Error starting recording:", err);
      setTranscriptionError("Could not access microphone. Please grant permission.");
      setIsRecording(false);
    }
  }, [isRecording, setInputText, transcriptionModelId, isTranscriptionThinkingEnabled, inputText, appSettings]);

  const handleStopRecording = useCallback(() => {
    if (isRecording && mediaRecorderRef.current) {
      recordingCancelledRef.current = false;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const handleCancelRecording = useCallback(() => {
    if (isRecording && mediaRecorderRef.current) {
      recordingCancelledRef.current = true;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const attachIconSize = 18;
  const micIconSize = 18;
  const sendIconSize = 18;

  const buttonBaseClass = "h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-input)]";
  
  const attachMenuItems = [
    { label: t('attachMenu_upload'), icon: <UploadCloud size={16}/>, action: () => { fileInputRef.current?.click(); setIsAttachMenuOpen(false); } },
    { label: t('attachMenu_gallery'), icon: <Image size={16}/>, action: () => { imageInputRef.current?.click(); setIsAttachMenuOpen(false); } },
    { label: t('attachMenu_takePhoto'), icon: <Camera size={16}/>, action: () => openActionModal('camera') },
    { label: t('attachMenu_recordAudio'), icon: <Mic size={16}/>, action: () => openActionModal('recorder') },
    { label: t('attachMenu_addById'), icon: <Link2 size={16}/>, action: () => openActionModal('id') },
    { label: t('attachMenu_createText'), icon: <FileSignature size={16}/>, action: () => openActionModal('text') }
  ];

  return (
    <>
      {showCamera && ( <CameraCapture onCapture={handlePhotoCapture} onCancel={() => { setShowCamera(false); textareaRef.current?.focus(); }} /> )}
      {showRecorder && ( <AudioRecorder onRecord={handleAudioRecord} onCancel={() => { setShowRecorder(false); textareaRef.current?.focus(); }} /> )}
      {showCreateTextFileEditor && ( <CreateTextFileEditor onConfirm={handleConfirmCreateTextFile} onCancel={handleCancelCreateTextFile} isProcessing={isProcessingFile} isLoading={isLoading} /> )}

      <div
        className={`bg-transparent ${isModalOpen ? 'opacity-30 pointer-events-none' : ''}`}
        aria-hidden={isModalOpen}
      >
        <div className="mx-auto w-full max-w-7xl px-2 sm:px-3 mb-2 sm:mb-3">
            <div>
                {isImagenModel && setAspectRatio && aspectRatio && (
                    <div className="mb-2">
                        <div className="flex items-center gap-x-2 sm:gap-x-3 gap-y-2 flex-wrap">
                            {aspectRatios.map(ratioValue => {
                                const isSelected = aspectRatio === ratioValue;
                                return ( <button key={ratioValue} onClick={() => setAspectRatio(ratioValue)} className={`p-2 rounded-lg flex flex-col items-center justify-center min-w-[50px] text-xs font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-primary)] focus:ring-[var(--theme-border-focus)] ${isSelected ? 'bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)]' : 'text-[var(--theme-text-tertiary)] hover:bg-[var(--theme-bg-secondary)]/50' }`} title={`${t('aspectRatio_title')} ${ratioValue}`}> <AspectRatioIcon ratio={ratioValue} /> <span>{ratioValue}</span> </button> );
                            })}
                        </div>
                    </div>
                )}
                {fileError && <div className="mb-2 p-2 text-sm text-[var(--theme-text-danger)] bg-[var(--theme-bg-danger)] bg-opacity-20 border border-[var(--theme-bg-danger)] rounded-md">{fileError}</div>}
                {transcriptionError && <div className="mb-2 p-2 text-sm text-[var(--theme-text-danger)] bg-[var(--theme-bg-danger)] bg-opacity-20 border border-[var(--theme-bg-danger)] rounded-md">{transcriptionError}</div>}
                {selectedFiles.length > 0 && <div className="mb-2 p-2 bg-[var(--theme-bg-secondary)] rounded-lg border border-[var(--theme-border-secondary)] overflow-x-auto custom-scrollbar"> <div className="flex gap-3"> {selectedFiles.map(file => ( <SelectedFileDisplay key={file.id} file={file} onRemove={removeSelectedFile} onCancelUpload={onCancelUpload} /> ))} </div> </div>}
                {showAddByIdInput && <div className="mb-2 flex items-center gap-2 p-2 bg-[var(--theme-bg-secondary)] rounded-lg border border-[var(--theme-border-secondary)]"> <input type="text" value={fileIdInput} onChange={(e) => setFileIdInput(e.target.value)} placeholder={t('addById_placeholder')} className="flex-grow p-2 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-md focus:ring-1 focus:ring-[var(--theme-border-focus)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] text-sm" aria-label={t('addById_aria')} disabled={isAddingById} /> <button type="button" onClick={handleAddFileByIdSubmit} disabled={!fileIdInput.trim() || isAddingById || isLoading} className="p-2 bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-icon-send)] rounded-md disabled:bg-[var(--theme-bg-tertiary)] disabled:text-[var(--theme-text-tertiary)] flex items-center gap-1.5 text-sm" aria-label={t('addById_button_aria')}> <Plus size={16} /> {t('add_button')} </button> <button type="button" onClick={() => { setShowAddByIdInput(false); setFileIdInput(''); textareaRef.current?.focus(); }} disabled={isAddingById} className="p-2 bg-[var(--theme-bg-input)] hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-tertiary)] rounded-md flex items-center gap-1.5 text-sm" aria-label={t('cancelAddById_button_aria')}> <XCircle size={16} /> {t('cancel_button')} </button> </div>}
            </div>
            
            <form onSubmit={handleSubmit} className={`relative ${isAnimatingSend ? 'form-send-animate' : ''}`}>
                <div className="flex flex-col gap-1 rounded-2xl border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-input)] px-2 py-1 shadow-lg focus-within:border-transparent focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-[var(--theme-bg-secondary)] focus-within:ring-[var(--theme-border-focus)] transition-all duration-200">
                    <textarea
                        ref={textareaRef} value={inputText} onChange={e => setInputText(e.target.value)}
                        onKeyPress={handleKeyPress} onPaste={handlePaste}
                        placeholder={t('chatInputPlaceholder')}
                        className="w-full bg-transparent border-0 resize-none px-1.5 py-1 text-base placeholder:text-[var(--theme-text-tertiary)] focus:ring-0 focus:outline-none custom-scrollbar"
                        style={{ height: `${getResponsiveValue(24, INITIAL_TEXTAREA_HEIGHT_PX)}px` }}
                        aria-label="Chat message input"
                        onFocus={() => adjustTextareaHeight()} disabled={isModalOpen || isRecording || isTranscribing || isWaitingForUpload}
                        rows={1}
                    />
                    <div className="flex items-center justify-between w-full">
                        {/* Left-side buttons */}
                        <div className="flex items-center gap-1">
                             <div className="relative">
                                <button ref={attachButtonRef} type="button" onClick={() => setIsAttachMenuOpen(!isAttachMenuOpen)} disabled={isProcessingFile || isAddingById || isModalOpen || isWaitingForUpload} className={`${buttonBaseClass} text-[var(--theme-icon-attach)] ${isAttachMenuOpen ? 'bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)]' : 'bg-transparent hover:bg-[var(--theme-bg-tertiary)]'}`} aria-label={t('attachMenu_aria')} title={t('attachMenu_title')} aria-haspopup="true" aria-expanded={isAttachMenuOpen}>
                                    <Plus size={attachIconSize} />
                                </button>
                                {isAttachMenuOpen && (
                                    <div ref={attachMenuRef} className="absolute bottom-full left-0 mb-2 w-56 bg-[var(--theme-bg-primary)] border border-[var(--theme-border-secondary)] rounded-lg shadow-premium z-20 py-1" role="menu">
                                        {attachMenuItems.map(item => (
                                            <button key={item.label} onClick={item.action} className="w-full text-left px-3 py-2 text-sm text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] flex items-center gap-3" role="menuitem">
                                                {item.icon} <span>{item.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept={ALL_SUPPORTED_MIME_TYPES.join(',')} className="hidden" aria-hidden="true" multiple />
                                <input type="file" ref={imageInputRef} onChange={handleFileChange} accept={SUPPORTED_IMAGE_MIME_TYPES.join(',')} className="hidden" aria-hidden="true" multiple />
                            </div>
                            <div className="flex items-center">
                                <div className="relative">
                                    <button
                                        ref={toolsButtonRef}
                                        type="button"
                                        onClick={() => setIsToolsMenuOpen(p => !p)}
                                        disabled={isProcessingFile || isAddingById || isModalOpen || isWaitingForUpload}
                                        className={
                                            (isGoogleSearchEnabled || isCodeExecutionEnabled)
                                            ? `${buttonBaseClass.replace('rounded-full', 'rounded-lg')} text-[var(--theme-icon-attach)] ${isToolsMenuOpen ? 'bg-[var(--theme-bg-tertiary)]' : 'bg-transparent hover:bg-[var(--theme-bg-tertiary)]'}`
                                            : `h-7 sm:h-8 px-2.5 rounded-full flex items-center justify-center gap-1.5 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-input)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] ${isToolsMenuOpen ? 'bg-[var(--theme-bg-tertiary)]' : 'bg-transparent hover:bg-[var(--theme-bg-tertiary)]'}`
                                        }
                                        aria-label={t('tools_button')}
                                        title={t('tools_button')}
                                        aria-haspopup="true"
                                        aria-expanded={isToolsMenuOpen}
                                    >
                                        <SlidersHorizontal size={16} />
                                        {!(isGoogleSearchEnabled || isCodeExecutionEnabled) && (
                                            <span className="text-sm font-medium">{t('tools_button')}</span>
                                        )}
                                    </button>
                                    {isToolsMenuOpen && (
                                        <div ref={toolsMenuRef} className="absolute bottom-full left-0 mb-2 w-56 bg-[var(--theme-bg-primary)] border border-[var(--theme-border-secondary)] rounded-lg shadow-premium z-20 py-1" role="menu">
                                            <button onClick={() => { onToggleGoogleSearch(); setIsToolsMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] flex items-center justify-between" role="menuitem">
                                                <span className="flex items-center gap-3">
                                                    <Globe size={16}/> {t('web_search_label')}
                                                </span>
                                                {isGoogleSearchEnabled && <Check size={16} className="text-[var(--theme-text-link)]" />}
                                            </button>
                                            <button onClick={() => { onToggleCodeExecution(); setIsToolsMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] flex items-center justify-between" role="menuitem">
                                                <span className="flex items-center gap-3">
                                                    <Terminal size={16}/> {t('code_execution_label')}
                                                </span>
                                                {isCodeExecutionEnabled && <Check size={16} className="text-[var(--theme-text-link)]" />}
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {isGoogleSearchEnabled && (
                                    <>
                                        <div className="h-4 w-px bg-[var(--theme-border-secondary)] mx-1.5"></div>
                                        <div 
                                            className="flex items-center gap-1.5 bg-[var(--theme-bg-info)] text-[var(--theme-text-link)] text-sm px-2.5 py-1 rounded-full transition-all"
                                            style={{ animation: `fadeInUp 0.3s ease-out both` }}
                                        >
                                            <Globe size={14} />
                                            <span className="font-medium">
                                                {t('web_search_label')}
                                            </span>
                                            <button 
                                                onClick={onToggleGoogleSearch} 
                                                className="text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] p-0.5 rounded-full hover:bg-[var(--theme-bg-tertiary)] transition-colors"
                                                aria-label="Disable Web Search"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </>
                                )}
                                 {isCodeExecutionEnabled && (
                                    <>
                                        <div className="h-4 w-px bg-[var(--theme-border-secondary)] mx-1.5"></div>
                                        <div 
                                            className="flex items-center gap-1.5 bg-[var(--theme-bg-info)] text-[var(--theme-text-link)] text-sm px-2.5 py-1 rounded-full transition-all"
                                            style={{ animation: `fadeInUp 0.3s ease-out both` }}
                                        >
                                            <Terminal size={14} />
                                            <span className="font-medium">
                                                {t('code_execution_label')}
                                            </span>
                                            <button 
                                                onClick={onToggleCodeExecution} 
                                                className="text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] p-0.5 rounded-full hover:bg-[var(--theme-bg-tertiary)] transition-colors"
                                                aria-label="Disable Code Execution"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Right-side buttons */}
                        <div className="flex flex-shrink-0 items-center gap-1.5 sm:gap-2">
                            {isRecording ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleStopRecording}
                                        className={`${buttonBaseClass} mic-recording-animate !bg-[var(--theme-bg-danger)] text-[var(--theme-icon-stop)]`}
                                        aria-label={t('voiceInput_stop_aria')}
                                        title={t('voiceInput_stop_aria')}
                                    >
                                        <Mic size={micIconSize} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCancelRecording}
                                        className={`${buttonBaseClass} bg-transparent text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)]`}
                                        aria-label={t('cancelRecording_aria')}
                                        title={t('cancelRecording_aria')}
                                    >
                                        <X size={micIconSize} />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleStartRecording}
                                        disabled={isLoading || isEditing || isAddingById || isModalOpen || isTranscribing || isWaitingForUpload}
                                        className={`${buttonBaseClass} bg-transparent text-[var(--theme-text-tertiary)] hover:bg-[var(--theme-bg-tertiary)]`}
                                        aria-label={isTranscribing ? t('voiceInput_transcribing_aria') : t('voiceInput_start_aria')}
                                        title={isTranscribing ? t('voiceInput_transcribing_aria') : t('voiceInput_start_aria')}
                                    >
                                        {isTranscribing ? (
                                            <Loader2 size={micIconSize} className="animate-spin text-[var(--theme-text-link)]" />
                                        ) : (
                                            <Mic size={micIconSize} />
                                        )}
                                    </button>

                                    {isLoading ? ( 
                                        <button type="button" onClick={onStopGenerating} className={`${buttonBaseClass} bg-[var(--theme-bg-danger)] hover:bg-[var(--theme-bg-danger-hover)] text-[var(--theme-icon-stop)]`} aria-label={t('stopGenerating_aria')} title={t('stopGenerating_title')}><Ban size={sendIconSize} /></button>
                                    ) : isEditing ? (
                                        <>
                                            <button type="button" onClick={onCancelEdit} className={`${buttonBaseClass} bg-transparent hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)]`} aria-label={t('cancelEdit_aria')} title={t('cancelEdit_title')}><X size={sendIconSize} /></button>
                                            <button type="submit" disabled={!canSend} className={`${buttonBaseClass} bg-amber-500 hover:bg-amber-600 text-white disabled:bg-[var(--theme-bg-tertiary)] disabled:text-[var(--theme-text-tertiary)]`} aria-label={t('updateMessage_aria')} title={t('updateMessage_title')}><Edit2 size={sendIconSize} /></button>
                                        </>
                                    ) : (
                                        <button 
                                            type="submit" 
                                            disabled={!canSend || isWaitingForUpload} 
                                            className={`${buttonBaseClass} bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-text-accent)] disabled:bg-[var(--theme-bg-tertiary)] disabled:text-[var(--theme-text-tertiary)]`} 
                                            aria-label={isWaitingForUpload ? "Waiting for upload..." : t('sendMessage_aria')} 
                                            title={isWaitingForUpload ? "Waiting for upload to complete before sending" : t('sendMessage_title')}
                                        >
                                            {isWaitingForUpload ? (
                                                <Loader2 size={sendIconSize} className="animate-spin" />
                                            ) : (
                                                <ArrowUp size={sendIconSize} />
                                            )}
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </form>
        </div>
      </div>
    </>
  );
};