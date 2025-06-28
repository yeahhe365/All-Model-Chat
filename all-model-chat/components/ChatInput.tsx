

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
  transcriptionModelId?: string;
  isTranscriptionThinkingEnabled?: boolean;
}

const INITIAL_TEXTAREA_HEIGHT_PX = 40;
const MAX_TEXTAREA_HEIGHT_PX = 256; 

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
  transcriptionModelId, isTranscriptionThinkingEnabled,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const justInitiatedFileOpRef = useRef(false);
  const prevIsProcessingFileRef = useRef(isProcessingFile);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

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


  const adjustTextareaHeight = useCallback(() => {
    const target = textareaRef.current;
    if (!target) return;
    const currentInitialHeight = window.innerWidth < 640 ? 36 : INITIAL_TEXTAREA_HEIGHT_PX;
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
        setTimeout(() => setIsAnimatingSend(false), 400); 
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

  const handleToggleRecording = useCallback(async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

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
      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => audioChunks.push(event.data);
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `voice-input-${Date.now()}.webm`, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        setIsTranscribing(true);
        setTranscriptionError(null);
        try {
          const modelToUse = transcriptionModelId || 'gemini-2.5-flash';
          const transcribedText = await geminiServiceInstance.transcribeAudio(audioFile, modelToUse, isTranscriptionThinkingEnabled ?? false);
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
  }, [isRecording, setInputText, transcriptionModelId, isTranscriptionThinkingEnabled]);

  const isModalOpen = showCreateTextFileEditor || showCamera || showRecorder;
  const hasSuccessfullyProcessedFiles = selectedFiles.some(f => !f.error && !f.isProcessing && f.uploadState === 'active');
  const canSend = (inputText.trim() !== '' || hasSuccessfullyProcessedFiles) && !isProcessingFile && !isLoading && !isAddingById && !isModalOpen;
  
  const attachIconSize = 22;
  const micIconSize = 22;
  const sendIconSize = 22;

  const buttonBaseClass = "h-9 w-9 sm:h-10 sm:w-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-primary)]";
  
  return (
    <>
      {showCamera && ( <CameraCapture onCapture={handlePhotoCapture} onCancel={() => { setShowCamera(false); textareaRef.current?.focus(); }} /> )}
      {showRecorder && ( <AudioRecorder onRecord={handleAudioRecord} onCancel={() => { setShowRecorder(false); textareaRef.current?.focus(); }} /> )}
      {showCreateTextFileEditor && ( <CreateTextFileEditor onConfirm={handleConfirmCreateTextFile} onCancel={handleCancelCreateTextFile} isProcessing={isProcessingFile} isLoading={isLoading} /> )}

      <div
        className={`bg-[var(--theme-bg-primary)] border-t border-[var(--theme-border-primary)] ${isModalOpen ? 'opacity-30 pointer-events-none' : ''}`}
        aria-hidden={isModalOpen}
      >
        <div className="mx-auto w-full max-w-4xl px-2 sm:px-3">
            <div className="pt-1.5">
                {(isImagenModel || isVeoModel) && setAspectRatio && aspectRatio && (
                    <div className="mb-2">
                        <div className="flex items-center gap-x-2 sm:gap-x-3 gap-y-2 flex-wrap">
                            {aspectRatios.map(ratioValue => {
                                const isSelected = aspectRatio === ratioValue;
                                return ( <button key={ratioValue} onClick={() => setAspectRatio(ratioValue)} className={`p-2 rounded-lg flex flex-col items-center justify-center min-w-[50px] text-xs font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-primary)] focus:ring-[var(--theme-border-focus)] ${isSelected ? 'bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)]' : 'text-[var(--theme-text-tertiary)] hover:bg-[var(--theme-bg-secondary)]/50' }`} title={`Aspect Ratio ${ratioValue}`}> <AspectRatioIcon ratio={ratioValue} /> <span>{ratioValue}</span> </button> );
                            })}
                        </div>
                    </div>
                )}
                {fileError && <div className="mb-2 p-2 text-sm text-[var(--theme-text-danger)] bg-[var(--theme-bg-danger)] bg-opacity-20 border border-[var(--theme-bg-danger)] rounded-md">{fileError}</div>}
                {transcriptionError && <div className="mb-2 p-2 text-sm text-[var(--theme-text-danger)] bg-[var(--theme-bg-danger)] bg-opacity-20 border border-[var(--theme-bg-danger)] rounded-md">{transcriptionError}</div>}
                {selectedFiles.length > 0 && <div className="mb-2 p-2 bg-[var(--theme-bg-secondary)] rounded-lg border border-[var(--theme-border-secondary)] overflow-x-auto custom-scrollbar"> <div className="flex gap-3"> {selectedFiles.map(file => ( <SelectedFileDisplay key={file.id} file={file} onRemove={removeSelectedFile} onCancelUpload={onCancelUpload} /> ))} </div> </div>}
                {showAddByIdInput && <div className="mb-2 flex items-center gap-2 p-2 bg-[var(--theme-bg-secondary)] rounded-lg border border-[var(--theme-border-secondary)]"> <input type="text" value={fileIdInput} onChange={(e) => setFileIdInput(e.target.value)} placeholder="Paste File ID (e.g., files/xyz123)" className="flex-grow p-2 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-md focus:ring-1 focus:ring-[var(--theme-border-focus)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] text-sm" aria-label="File ID input" disabled={isAddingById} /> <button type="button" onClick={handleAddFileByIdSubmit} disabled={!fileIdInput.trim() || isAddingById || isLoading} className="p-2 bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-icon-send)] rounded-md disabled:bg-[var(--theme-bg-tertiary)] disabled:text-[var(--theme-text-tertiary)] flex items-center gap-1.5 text-sm" aria-label="Add file by ID"> <Plus size={16} /> Add </button> <button type="button" onClick={() => { setShowAddByIdInput(false); setFileIdInput(''); textareaRef.current?.focus(); }} disabled={isAddingById} className="p-2 bg-[var(--theme-bg-input)] hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-tertiary)] rounded-md flex items-center gap-1.5 text-sm" aria-label="Cancel adding file by ID"> <XCircle size={16} /> Cancel </button> </div>}
            </div>
            
            <form onSubmit={handleSubmit} className={`relative py-1.5 sm:py-2 ${isAnimatingSend ? 'form-send-animate' : ''}`}>
                <div className="flex items-center gap-2 rounded-2xl border border-[var(--theme-border-primary)] bg-[var(--theme-bg-secondary)] p-1.5 sm:p-2 shadow-sm focus-within:border-transparent focus-within:ring-2 focus-within:ring-[var(--theme-border-focus)]/50 transition-all duration-200">
                    <div className="relative">
                        <button ref={attachButtonRef} type="button" onClick={() => setIsAttachMenuOpen(!isAttachMenuOpen)} disabled={isProcessingFile || isAddingById || isModalOpen} className={`${buttonBaseClass} text-[var(--theme-icon-attach)] ${isAttachMenuOpen ? 'bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)]' : 'bg-transparent hover:bg-[var(--theme-bg-tertiary)]'}`} aria-label="Attach file menu" title="Attach file" aria-haspopup="true" aria-expanded={isAttachMenuOpen}>
                            <Paperclip size={attachIconSize} />
                        </button>
                        {isAttachMenuOpen && (
                            <div ref={attachMenuRef} className="absolute bottom-full left-0 mb-2 w-56 bg-[var(--theme-bg-primary)] border border-[var(--theme-border-secondary)] rounded-lg shadow-xl z-20 py-1" role="menu">
                                {['Upload from Device', 'Take Photo', 'Record Audio', 'Add by File ID', 'Create Text File'].map((item, index) => {
                                    const icons = [<UploadCloud size={16}/>, <Camera size={16}/>, <Mic size={16}/>, <Link2 size={16}/>, <FileSignature size={16}/>];
                                    const actions = [() => { fileInputRef.current?.click(); setIsAttachMenuOpen(false); }, () => openActionModal('camera'), () => openActionModal('recorder'), () => openActionModal('id'), () => openActionModal('text')];
                                    return <button key={item} onClick={actions[index]} className="w-full text-left px-3 py-2 text-sm text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] flex items-center gap-3" role="menuitem"> {icons[index]} <span>{item}</span> </button>
                                })}
                            </div>
                        )}
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept={ALL_SUPPORTED_MIME_TYPES.join(',')} className="hidden" aria-hidden="true" multiple />
                    </div>

                    <textarea
                        ref={textareaRef} value={inputText} onChange={e => setInputText(e.target.value)}
                        onKeyPress={handleKeyPress} onPaste={handlePaste}
                        placeholder={t('chatInputPlaceholder')}
                        className="flex-grow w-full bg-transparent border-0 resize-none px-1 py-1.5 sm:py-2 text-base placeholder:text-[var(--theme-text-tertiary)] focus:ring-0 focus:outline-none custom-scrollbar"
                        style={{ height: `${window.innerWidth < 640 ? 36 : INITIAL_TEXTAREA_HEIGHT_PX}px` }}
                        aria-label="Chat message input"
                        onFocus={() => adjustTextareaHeight()} disabled={isModalOpen || isRecording || isTranscribing}
                        rows={1}
                    />

                    <div className="flex flex-shrink-0 items-center gap-1.5 sm:gap-2">
                         <button type="button" onClick={handleToggleRecording} disabled={isLoading || isProcessingFile || isAddingById || isModalOpen || isTranscribing} className={`${buttonBaseClass} bg-transparent text-[var(--theme-text-tertiary)] hover:bg-[var(--theme-bg-tertiary)] ${isRecording ? 'mic-recording-animate !bg-[var(--theme-bg-danger)] !text-[var(--theme-text-danger)]' : ''}`} aria-label={isRecording ? 'Stop recording' : (isTranscribing ? 'Transcribing...' : 'Start voice input')} title={isRecording ? 'Stop recording' : (isTranscribing ? 'Transcribing...' : 'Start voice input')}>
                             {isTranscribing ? <Loader2 size={micIconSize} className="animate-spin text-[var(--theme-text-link)]" /> : <Mic size={micIconSize} />}
                         </button>
                        
                        {isLoading ? ( 
                            <button type="button" onClick={onStopGenerating} className={`${buttonBaseClass} bg-[var(--theme-bg-danger)] hover:bg-[var(--theme-bg-danger-hover)] text-[var(--theme-icon-stop)]`} aria-label="Stop generating response" title="Stop Generating"><Ban size={sendIconSize} /></button>
                        ) : isEditing ? (
                            <>
                                <button type="button" onClick={onCancelEdit} className={`${buttonBaseClass} bg-transparent hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)]`} aria-label="Cancel editing" title="Cancel Edit"><X size={sendIconSize} /></button>
                                <button type="submit" disabled={!canSend} className={`${buttonBaseClass} bg-amber-500 hover:bg-amber-600 text-white disabled:bg-[var(--theme-bg-tertiary)] disabled:text-[var(--theme-text-tertiary)]`} aria-label="Update message" title="Update & Send"><Edit2 size={sendIconSize} /></button>
                            </>
                        ) : (
                            <button type="submit" disabled={!canSend} className={`${buttonBaseClass} bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-text-accent)] disabled:bg-[var(--theme-bg-tertiary)] disabled:text-[var(--theme-text-tertiary)]`} aria-label="Send message" title="Send"><Send size={sendIconSize} /></button>
                        )}
                    </div>
                </div>
            </form>
        </div>
      </div>
    </>
  );
};