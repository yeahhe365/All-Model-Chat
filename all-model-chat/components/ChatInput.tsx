import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Send, Ban, Paperclip, XCircle, Plus, X, Edit2, UploadCloud, FileSignature, Link2, Camera, Mic, Loader2 } from 'lucide-react';
import { UploadedFile } from '../types';
import { ALL_SUPPORTED_MIME_TYPES } from '../constants/fileConstants';
import { translations } from '../utils/appUtils';
import { SelectedFileDisplay } from './chat/SelectedFileDisplay';
import { CreateTextFileEditor } from './chat/CreateTextFileEditor';
import { CameraCapture } from './chat/CameraCapture';
import { AudioRecorder } from './chat/AudioRecorder';
import { geminiServiceInstance } from '../services/geminiService';

interface ChatInputProps {
  inputText: string;
  setInputText: (text: string) => void;
  selectedFiles: UploadedFile[]; 
  setSelectedFiles: (files: UploadedFile[] | ((prevFiles: UploadedFile[]) => UploadedFile[])) => void; 
  onSendMessage: () => void;
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
  isVeoModel?: boolean;
  aspectRatio?: string;
  setAspectRatio?: (ratio: string) => void;
}

const INITIAL_TEXTAREA_HEIGHT_PX = 44;
const MAX_TEXTAREA_HEIGHT_PX = (window.innerWidth < 640 ? 40 : INITIAL_TEXTAREA_HEIGHT_PX) * 3;

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
  inputText, setInputText, selectedFiles, setSelectedFiles, onSendMessage,
  isLoading, isEditing, onStopGenerating, onCancelEdit, onProcessFiles,
  onAddFileById, onCancelUpload, isProcessingFile, fileError, t,
  isImagenModel, isVeoModel, aspectRatio, setAspectRatio,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const justInitiatedFileOpRef = useRef(false);
  const prevIsProcessingFileRef = useRef(isProcessingFile);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [isAnimatingSend, setIsAnimatingSend] = useState(false);
  const [showAddByIdInput, setShowAddByIdInput] = useState(false);
  const [fileIdInput, setFileIdInput] = useState('');
  const [isAddingById, setIsAddingById] = useState(false);
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const attachButtonRef = useRef<HTMLButtonElement>(null);
  const [showCreateTextFileEditor, setShowCreateTextFileEditor] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);


  const adjustTextareaHeight = useCallback((target: HTMLTextAreaElement | null) => {
    if (!target) return;
    target.style.height = 'auto';
    const scrollHeight = target.scrollHeight;
    const currentInitialHeight = window.innerWidth < 640 ? 40 : INITIAL_TEXTAREA_HEIGHT_PX;
    const currentMaxHeight = MAX_TEXTAREA_HEIGHT_PX;
    const newHeight = Math.max(currentInitialHeight, Math.min(scrollHeight, currentMaxHeight));
    target.style.height = `${newHeight}px`;
  }, []);

  useEffect(() => { adjustTextareaHeight(textareaRef.current); }, [inputText, adjustTextareaHeight]);

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
    };
    if (isAttachMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAttachMenuOpen]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) {
      justInitiatedFileOpRef.current = true;
      await onProcessFiles(event.target.files);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  
  const handlePhotoCapture = async (file: File) => {
    justInitiatedFileOpRef.current = true;
    await onProcessFiles([file]);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSend) {
        onSendMessage();
        setIsAnimatingSend(true);
        setTimeout(() => setIsAnimatingSend(false), 400); // Match animation duration
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && canSend) {
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
  };

  const handleStopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const handleStartRecording = useCallback(async () => {
    setTranscriptionError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setTranscriptionError("Audio recording is not supported by your browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsRecording(true);
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `voice-input-${Date.now()}.webm`, { type: 'audio/webm' });
        
        stream.getTracks().forEach(track => track.stop());
        
        setIsTranscribing(true);
        setTranscriptionError(null);
        try {
          const transcribedText = await geminiServiceInstance.transcribeAudio(audioFile);
          setInputText(prev => (prev ? prev.trim() + ' ' : '') + transcribedText);
          textareaRef.current?.focus();
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
  }, [setInputText]);

  const handleToggleRecording = useCallback(() => {
    if (isRecording) {
      handleStopRecording();
    } else {
      handleStartRecording();
    }
  }, [isRecording, handleStartRecording, handleStopRecording]);


  const isModalOpen = showCreateTextFileEditor || showCamera || showRecorder;
  const hasSuccessfullyProcessedFiles = selectedFiles.some(f => !f.error && !f.isProcessing && f.uploadState === 'active');
  const canSend = (inputText.trim() !== '' || hasSuccessfullyProcessedFiles) && !isProcessingFile && !isLoading && !isAddingById && !isModalOpen;
  const currentInitialTextareaHeight = window.innerWidth < 640 ? 40 : INITIAL_TEXTAREA_HEIGHT_PX;
  const attachIconSize = window.innerWidth < 640 ? 20 : 22;
  const sendIconSize = window.innerWidth < 640 ? 20 : 22;
  const showAspectRatio = isImagenModel || isVeoModel;

  return (
    <>
      {showCamera && (
        <CameraCapture 
          onCapture={handlePhotoCapture}
          onCancel={() => { setShowCamera(false); textareaRef.current?.focus(); }}
        />
      )}
      {showRecorder && (
        <AudioRecorder 
          onRecord={handleAudioRecord}
          onCancel={() => { setShowRecorder(false); textareaRef.current?.focus(); }}
        />
      )}
      {showCreateTextFileEditor && (
        <CreateTextFileEditor 
          onConfirm={handleConfirmCreateTextFile}
          onCancel={handleCancelCreateTextFile}
          isProcessing={isProcessingFile}
          isLoading={isLoading}
        />
      )}

      <div
        className={`bg-[var(--theme-bg-primary)] border-t border-[var(--theme-border-primary)] ${isModalOpen ? 'opacity-30 pointer-events-none' : ''}`}
        aria-hidden={isModalOpen}
      >
        <div className="px-1.5 sm:px-2 pt-1.5 sm:pt-2">
            {showAspectRatio && setAspectRatio && aspectRatio && (
                <div className="mb-2">
                    <div className="flex items-center gap-x-2 sm:gap-x-3 gap-y-2 flex-wrap">
                        {aspectRatios.map(ratioValue => {
                            const isSelected = aspectRatio === ratioValue;
                            return (
                                <button
                                    key={ratioValue}
                                    onClick={() => setAspectRatio(ratioValue)}
                                    className={`p-2 rounded-lg flex flex-col items-center justify-center min-w-[50px] text-xs font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-primary)] focus:ring-[var(--theme-border-focus)]
                                    ${
                                        isSelected
                                            ? 'bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)]'
                                            : 'text-[var(--theme-text-tertiary)] hover:bg-[var(--theme-bg-secondary)]/50'
                                    }`}
                                    title={`Aspect Ratio ${ratioValue}`}
                                >
                                    <AspectRatioIcon ratio={ratioValue} />
                                    <span>{ratioValue}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
            {fileError && ( 
              <div className="mb-1.5 sm:mb-2 p-1.5 sm:p-2 text-xs sm:text-sm text-[var(--theme-text-danger)] bg-[var(--theme-bg-danger)] bg-opacity-20 border border-[var(--theme-bg-danger)] rounded-md">
                {fileError}
              </div>
            )}
            {transcriptionError && ( 
                <div className="mb-1.5 sm:mb-2 p-1.5 sm:p-2 text-xs sm:text-sm text-[var(--theme-text-danger)] bg-[var(--theme-bg-danger)] bg-opacity-20 border border-[var(--theme-bg-danger)] rounded-md">
                    {transcriptionError}
                </div>
            )}
            {selectedFiles.length > 0 && (
              <div className="mb-1.5 sm:mb-2 p-1.5 sm:p-2 bg-[var(--theme-bg-secondary)] rounded-md border border-[var(--theme-border-secondary)] overflow-x-auto custom-scrollbar">
                <div className="flex gap-2 sm:gap-3">
                  {selectedFiles.map(file => (
                    <SelectedFileDisplay key={file.id} file={file} onRemove={removeSelectedFile} onCancelUpload={onCancelUpload} />
                  ))}
                </div>
              </div>
            )}
            {showAddByIdInput && (
              <div className="mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 bg-[var(--theme-bg-secondary)] rounded-md border border-[var(--theme-border-secondary)]">
                <input
                  type="text" value={fileIdInput} onChange={(e) => setFileIdInput(e.target.value)}
                  placeholder="Paste File ID (e.g., files/xyz123)"
                  className="flex-grow p-1.5 sm:p-2 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-md focus:ring-1 focus:ring-[var(--theme-border-focus)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] text-xs sm:text-sm"
                  aria-label="File ID input" disabled={isAddingById}
                />
                <button type="button" onClick={handleAddFileByIdSubmit} disabled={!fileIdInput.trim() || isAddingById || isLoading} className="p-1.5 sm:p-2 bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-icon-send)] rounded-md disabled:bg-[var(--theme-bg-tertiary)] disabled:text-[var(--theme-text-tertiary)] flex items-center gap-1 text-xs sm:text-sm transition-transform active:scale-95" aria-label="Add file by ID">
                  <Plus size={14} /> Add
                </button>
                <button type="button" onClick={() => { setShowAddByIdInput(false); setFileIdInput(''); textareaRef.current?.focus(); }} disabled={isAddingById} className="p-1.5 sm:p-2 bg-[var(--theme-bg-input)] hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-tertiary)] rounded-md flex items-center gap-1 text-xs sm:text-sm transition-transform active:scale-95" aria-label="Cancel adding file by ID">
                  <XCircle size={14} /> Cancel
                </button>
              </div>
            )}
        </div>
        
        <form onSubmit={handleSubmit} className={`flex items-end gap-2 sm:gap-3 px-1.5 sm:px-2 pb-1.5 sm:pb-2 ${isAnimatingSend ? 'form-send-animate' : ''}`}>
          <div className="relative flex-grow">
            <textarea
              ref={textareaRef} value={inputText} onChange={e => setInputText(e.target.value)}
              onKeyPress={handleKeyPress} onPaste={handlePaste}
              placeholder={t('chatInputPlaceholder')}
              className="flex-grow w-full p-2 sm:p-2.5 pr-12 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-md text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] overflow-y-auto text-sm sm:text-base resize-none custom-scrollbar chat-textarea-glow"
              rows={1}
              style={{ minHeight: `${currentInitialTextareaHeight}px`, maxHeight: `${MAX_TEXTAREA_HEIGHT_PX}px` }}
              aria-label="Chat message input"
              onFocus={(e) => adjustTextareaHeight(e.target)} disabled={isModalOpen || isRecording || isTranscribing} 
            />
            <div className="absolute right-2.5 bottom-2.5 flex items-center justify-center">
              <button
                type="button"
                onClick={handleToggleRecording}
                disabled={isLoading || isProcessingFile || isAddingById || isModalOpen || isTranscribing}
                className={`p-1.5 rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isRecording ? 'mic-recording-animate' : 
                    'bg-transparent text-[var(--theme-text-tertiary)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-primary)]'
                }`}
                aria-label={isRecording ? 'Stop recording' : (isTranscribing ? 'Transcribing...' : 'Start voice input')}
                title={isRecording ? 'Stop recording' : (isTranscribing ? 'Transcribing...' : 'Start voice input')}
              >
                  {isTranscribing 
                      ? <Loader2 size={20} className="animate-spin text-[var(--theme-text-link)]" /> 
                      : <Mic size={20} />
                  }
              </button>
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-1.5 sm:gap-2 relative">
            <button
              ref={attachButtonRef} type="button" onClick={() => setIsAttachMenuOpen(!isAttachMenuOpen)}
              disabled={isProcessingFile || isAddingById || isModalOpen}
              className={`p-2.5 sm:p-3 rounded-md border border-[var(--theme-border-secondary)] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:ring-opacity-50 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 ${isAttachMenuOpen ? 'bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)]' : 'bg-[var(--theme-bg-secondary)] hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-icon-attach)]'}`}
              aria-label="Attach file menu" title="Attach file" aria-haspopup="true" aria-expanded={isAttachMenuOpen}
            >
              <Paperclip size={attachIconSize} />
            </button>
            {isAttachMenuOpen && (
              <div ref={attachMenuRef} className="absolute bottom-full right-0 mb-1.5 sm:mb-2 w-52 sm:w-56 bg-[var(--theme-bg-primary)] border border-[var(--theme-border-secondary)] rounded-md shadow-lg z-20 py-1" role="menu">
                <button onClick={() => { fileInputRef.current?.click(); setIsAttachMenuOpen(false); }} className="w-full text-left px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] flex items-center gap-1.5 sm:gap-2" role="menuitem">
                  <UploadCloud size={14} className="text-[var(--theme-icon-attach)]" /> Upload from Device
                </button>
                <button onClick={() => openActionModal('camera')} className="w-full text-left px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] flex items-center gap-1.5 sm:gap-2" role="menuitem">
                  <Camera size={14} className="text-[var(--theme-icon-attach)]" /> Take Photo
                </button>
                 <button onClick={() => openActionModal('recorder')} className="w-full text-left px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] flex items-center gap-1.5 sm:gap-2" role="menuitem">
                  <Mic size={14} className="text-[var(--theme-icon-attach)]" /> Record Audio
                </button>
                <button onClick={() => openActionModal('id')} className="w-full text-left px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] flex items-center gap-1.5 sm:gap-2" role="menuitem">
                  <Link2 size={14} className="text-[var(--theme-icon-attach)]" /> Add by File ID
                </button>
                <button onClick={() => openActionModal('text')} className="w-full text-left px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] flex items-center gap-1.5 sm:gap-2" role="menuitem">
                  <FileSignature size={14} className="text-[var(--theme-icon-attach)]" /> Create Text File
                </button>
              </div>
            )}
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept={ALL_SUPPORTED_MIME_TYPES.join(',')} className="hidden" aria-hidden="true" multiple />
            
            {isLoading ? ( 
              <button type="button" onClick={onStopGenerating} className="p-2.5 sm:p-3 bg-[var(--theme-bg-danger)] hover:bg-[var(--theme-bg-danger-hover)] text-[var(--theme-icon-stop)] rounded-md shadow-md transition-all duration-300 ease-in-out active:scale-95" aria-label="Stop generating response" title="Stop Generating">
                <Ban size={sendIconSize} />
              </button>
            ) : isEditing ? (
              <>
                <button type="button" onClick={onCancelEdit} className="p-2.5 sm:p-3 bg-[var(--theme-bg-secondary)] hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] rounded-md border border-[var(--theme-border-secondary)] transition-transform active:scale-95" aria-label="Cancel editing" title="Cancel Edit">
                  <X size={sendIconSize} />
                </button>
                <button type="submit" disabled={!canSend} className="p-2.5 sm:p-3 bg-amber-500 hover:bg-amber-600 text-[var(--theme-icon-send)] rounded-md disabled:bg-[var(--theme-bg-tertiary)] disabled:text-[var(--theme-text-tertiary)] transition-transform active:scale-95" aria-label="Update message" title="Update & Send">
                  <Edit2 size={sendIconSize} />
                </button>
              </>
            ) : (
              <button type="submit" disabled={!canSend} className="p-2.5 sm:p-3 bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-icon-send)] rounded-md disabled:bg-[var(--theme-bg-tertiary)] disabled:text-[var(--theme-text-tertiary)] transition-all duration-300 ease-in-out active:scale-95" aria-label="Send message" title="Send">
                <Send size={sendIconSize} />
              </button>
            )}
          </div>
        </form>
      </div>
    </>
  );
};