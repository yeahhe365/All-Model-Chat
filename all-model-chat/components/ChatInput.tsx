

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Send, Loader2, Edit2, Ban, Paperclip, XCircle, FileText, FileVideo, FileAudio, AlertTriangleIcon, CheckCircle, Link2, ClipboardCopy, Check, Plus, X } from 'lucide-react'; // Added X icon
import { UploadedFile } from '../types';
import { 
  SUPPORTED_IMAGE_MIME_TYPES, 
  SUPPORTED_TEXT_MIME_TYPES,
  SUPPORTED_VIDEO_MIME_TYPES, 
  SUPPORTED_AUDIO_MIME_TYPES, 
  SUPPORTED_PDF_MIME_TYPES,
  ALL_SUPPORTED_MIME_TYPES,
} from '../constants';

interface ChatInputProps {
  inputText: string;
  setInputText: (text: string) => void;
  selectedFiles: UploadedFile[]; 
  setSelectedFiles: (files: UploadedFile[] | ((prevFiles: UploadedFile[]) => UploadedFile[])) => void; 
  onSendMessage: () => void;
  isLoading: boolean; 
  isEditing: boolean;
  onStopGenerating: () => void;
  onCancelEdit: () => void; // New prop for canceling edit
  onProcessFiles: (files: FileList | File[]) => Promise<void>;
  onAddFileById: (fileId: string) => Promise<void>; 
  isProcessingFile: boolean; 
  fileError: string | null;    
}

const INITIAL_TEXTAREA_HEIGHT_PX = 44;
const MAX_TEXTAREA_HEIGHT_PX = INITIAL_TEXTAREA_HEIGHT_PX * 3;

const SelectedFileDisplay: React.FC<{
  file: UploadedFile;
  onRemove: (fileId: string) => void;
}> = ({ file, onRemove }) => {
  const [idCopied, setIdCopied] = useState(false);

  const handleCopyId = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!file.fileApiName) return;
    navigator.clipboard.writeText(file.fileApiName)
      .then(() => {
        setIdCopied(true);
        setTimeout(() => setIdCopied(false), 2000);
      })
      .catch(err => console.error("Failed to copy file ID:", err));
  };

  return (
    <div className="relative group flex-shrink-0 w-28 text-center">
      {(!file.isProcessing || file.uploadState === 'failed' || file.error ) && ( 
        <button
          onClick={() => onRemove(file.id)}
          className="absolute -top-1.5 -right-1.5 p-0.5 bg-[var(--theme-bg-primary)] hover:bg-[var(--theme-bg-danger)] text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-accent)] rounded-full opacity-50 group-hover:opacity-100 transition-all z-10"
          aria-label={`Remove ${file.name}`}
          title={`Remove ${file.name}`}
        >
          <XCircle size={18} />
        </button>
      )}
      <div className="h-20 w-full rounded border border-[var(--theme-border-secondary)] flex flex-col items-center justify-center bg-[var(--theme-bg-tertiary)] overflow-hidden">
        {file.error ? (
          <AlertTriangleIcon size={32} className="text-[var(--theme-text-danger)]" />
        ) : file.dataUrl && SUPPORTED_IMAGE_MIME_TYPES.includes(file.type) ? (
          <img 
            src={file.dataUrl} 
            alt={file.name} 
            className="max-h-full max-w-full h-auto w-auto object-contain" 
          />
        ) : SUPPORTED_VIDEO_MIME_TYPES.includes(file.type) ? (
          <FileVideo size={32} className="text-[var(--theme-text-tertiary)]" />
        ) : SUPPORTED_AUDIO_MIME_TYPES.includes(file.type) ? (
          <FileAudio size={32} className="text-[var(--theme-text-tertiary)]" />
        ) : SUPPORTED_TEXT_MIME_TYPES.includes(file.type) && !SUPPORTED_PDF_MIME_TYPES.includes(file.type) ? (
          <FileText size={32} className="text-[var(--theme-text-tertiary)]" />
        ) : SUPPORTED_PDF_MIME_TYPES.includes(file.type) ? (
          <FileText size={32} className="text-red-500" />
        ) : ( 
          <FileText size={32} className="text-[var(--theme-text-tertiary)]" /> 
        )}
      </div>
      <div className="text-xs text-[var(--theme-text-tertiary)] mt-0.5 truncate w-full" title={file.name}>{file.name}</div>
      
      {file.isProcessing && file.uploadState !== 'uploading' && typeof file.progress === 'number' && (
        <div className="w-full bg-[var(--theme-border-secondary)] rounded-full h-1.5 mt-1">
          <div 
            className="bg-[var(--theme-bg-accent)] h-1.5 rounded-full transition-all duration-150 ease-linear" 
            style={{ width: `${file.progress}%` }}
          ></div>
        </div>
      )}
      {file.uploadState === 'uploading' && (
          <div className="text-xs text-[var(--theme-text-link)] mt-0.5 flex items-center justify-center">
              <Loader2 size={12} className="animate-spin mr-1" /> Uploading...
          </div>
      )}
      {file.isProcessing && file.uploadState !== 'uploading' && (
            <div className="text-xs text-[var(--theme-text-link)] mt-0.5">{file.progress ?? 0}%</div>
      )}
      {file.error && (
        <div className="text-xs text-[var(--theme-text-danger)] mt-0.5 truncate" title={file.error}>Error</div>
      )}
        {!file.isProcessing && !file.error && file.uploadState === 'active' && (
            <div className="text-xs text-green-500 mt-0.5 flex items-center justify-center">
                <CheckCircle size={12} className="mr-1" /> Ready
            </div>
        )}
      {file.fileApiName && file.uploadState === 'active' && !file.error && (
        <button
          onClick={handleCopyId}
          title={idCopied ? "File ID Copied!" : `Copy File ID: ${file.fileApiName}`}
          aria-label={idCopied ? "File ID Copied!" : "Copy File ID"}
          className={`absolute bottom-0 right-0 p-0.5 rounded-full bg-[var(--theme-bg-input)] bg-opacity-70 backdrop-blur-sm
                      hover:bg-[var(--theme-bg-tertiary)] transition-all
                      ${idCopied ? 'text-[var(--theme-text-success)]' : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-link)]'}
                      opacity-0 group-hover:opacity-100 focus:opacity-100`}
        >
          {idCopied ? <Check size={12} /> : <ClipboardCopy size={12} />}
        </button>
      )}
    </div>
  );
};


export const ChatInput: React.FC<ChatInputProps> = ({
  inputText,
  setInputText,
  selectedFiles,
  setSelectedFiles,
  onSendMessage,
  isLoading,
  isEditing,
  onStopGenerating,
  onCancelEdit,
  onProcessFiles,
  onAddFileById,
  isProcessingFile, 
  fileError, 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const justInitiatedFileOpRef = useRef(false);
  const prevIsProcessingFileRef = useRef(isProcessingFile);

  const [showAddByIdInput, setShowAddByIdInput] = useState(false);
  const [fileIdInput, setFileIdInput] = useState('');
  const [isAddingById, setIsAddingById] = useState(false);


  const adjustTextareaHeight = useCallback((target: HTMLTextAreaElement | null) => {
    if (!target) return;
    target.style.height = 'auto';
    const scrollHeight = target.scrollHeight;
    const newHeight = Math.max(INITIAL_TEXTAREA_HEIGHT_PX, Math.min(scrollHeight, MAX_TEXTAREA_HEIGHT_PX));
    target.style.height = `${newHeight}px`;
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      adjustTextareaHeight(textareaRef.current);
    }
  }, [inputText, adjustTextareaHeight]);

  useEffect(() => {
    if (prevIsProcessingFileRef.current && !isProcessingFile && !isAddingById) {
      if (justInitiatedFileOpRef.current) {
        textareaRef.current?.focus();
        justInitiatedFileOpRef.current = false; 
      }
    }
    prevIsProcessingFileRef.current = isProcessingFile;
  }, [isProcessingFile, isAddingById]);
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      justInitiatedFileOpRef.current = true; 
      await onProcessFiles(files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; 
    }
  };

  const handlePaste = async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = event.clipboardData?.items;
    if (!items || isProcessingFile || isAddingById) return;

    const filesToProcess: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file' && ALL_SUPPORTED_MIME_TYPES.includes(item.type)) {
        const file = item.getAsFile();
        if (file) {
          filesToProcess.push(file);
        }
      }
    }

    if (filesToProcess.length > 0) {
      event.preventDefault(); 
      justInitiatedFileOpRef.current = true; 
      await onProcessFiles(filesToProcess);
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    onSendMessage();
    setShowAddByIdInput(false);
    setFileIdInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSend) { 
        handleSubmit(e as unknown as React.FormEvent);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
  };
  
  const removeSelectedFile = (fileIdToRemove: string) => {
    setSelectedFiles(prevFiles => prevFiles.filter(f => f.id !== fileIdToRemove));
  };

  const handleAddFileByIdSubmit = async () => {
    if (!fileIdInput.trim() || isAddingById || isLoading) return;
    setIsAddingById(true);
    await onAddFileById(fileIdInput.trim());
    setIsAddingById(false);
    setFileIdInput('');
    // Optionally focus textarea: textareaRef.current?.focus();
  };

  const hasSuccessfullyProcessedFiles = selectedFiles.some(f => !f.error && !f.isProcessing && f.uploadState === 'active');
  const canSend = (inputText.trim() !== '' || hasSuccessfullyProcessedFiles) && !isProcessingFile && !isLoading && !isAddingById;

  return (
    <div
      className="px-2 pt-2 pb-1 bg-[var(--theme-bg-primary)] border-t border-[var(--theme-border-primary)]"
    >
      {fileError && ( 
        <div className="mb-2 p-2 text-sm text-[var(--theme-text-danger)] bg-[var(--theme-bg-danger)] bg-opacity-20 border border-[var(--theme-bg-danger)] rounded-md">
          {fileError}
        </div>
      )}
      {selectedFiles.length > 0 && (
        <div className="mb-2 p-2 space-y-2 bg-[var(--theme-bg-secondary)] rounded-md border border-[var(--theme-border-secondary)] overflow-x-auto">
          <div className="flex gap-3">
            {selectedFiles.map((file) => (
              <SelectedFileDisplay key={file.id} file={file} onRemove={removeSelectedFile} />
            ))}
          </div>
        </div>
      )}
      {showAddByIdInput && (
        <div className="mb-2 flex items-center gap-2 p-2 bg-[var(--theme-bg-secondary)] rounded-md border border-[var(--theme-border-secondary)]">
          <input
            type="text"
            value={fileIdInput}
            onChange={(e) => setFileIdInput(e.target.value)}
            placeholder="Paste File ID (e.g., files/xyz123)"
            className="flex-grow p-2 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-md focus:ring-1 focus:ring-[var(--theme-border-focus)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] text-sm"
            aria-label="File ID input"
            disabled={isAddingById}
          />
          <button
            type="button"
            onClick={handleAddFileByIdSubmit}
            disabled={!fileIdInput.trim() || isAddingById || isLoading}
            className="p-2 bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-icon-send)] rounded-md disabled:bg-[var(--theme-bg-tertiary)] disabled:text-[var(--theme-text-tertiary)] flex items-center gap-1 text-sm"
            aria-label="Add file by ID"
          >
            {isAddingById ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Add
          </button>
          <button
            type="button"
            onClick={() => {setShowAddByIdInput(false); setFileIdInput('');}}
            disabled={isAddingById}
            className="p-2 bg-[var(--theme-bg-input)] hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-tertiary)] rounded-md flex items-center gap-1 text-sm"
            aria-label="Cancel adding file by ID"
          >
            <XCircle size={16} /> Cancel
          </button>
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-2 sm:gap-3"
      >
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          onPaste={handlePaste}
          placeholder="询问任何问题"
          className="flex-grow p-2.5 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-md focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:border-[var(--theme-border-focus)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] overflow-y-auto text-base"
          rows={1}
          style={{ 
            minHeight: `${INITIAL_TEXTAREA_HEIGHT_PX}px`, 
            maxHeight: `${MAX_TEXTAREA_HEIGHT_PX}px`,
            resize: 'none' 
          }}
          aria-label="Chat message input"
          onFocus={(e) => adjustTextareaHeight(e.target)} 
        />
        <div className="flex flex-shrink-0 items-center gap-2"> {/* Grouping buttons */}
            <button
            type="button"
            onClick={() => setShowAddByIdInput(!showAddByIdInput)}
            disabled={isProcessingFile || isAddingById}
            className={`p-2.5 rounded-md border border-[var(--theme-border-secondary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:ring-opacity-50 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed
                ${showAddByIdInput ? 'bg-[var(--theme-bg-accent)] text-white' : 'bg-[var(--theme-bg-secondary)] hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-icon-attach)]'}
            `}
            aria-label="Add file by ID"
            title="Add file by ID"
            >
            <Link2 size={20} />
            </button>
            <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessingFile || isAddingById} 
            className="p-2.5 bg-[var(--theme-bg-secondary)] hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-icon-attach)] rounded-md border border-[var(--theme-border-secondary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:ring-opacity-50 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Attach file(s) from device"
            title="Attach file(s) from device"
            >
            <Paperclip size={20} />
            </button>
            <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept={ALL_SUPPORTED_MIME_TYPES.join(',')}
            className="hidden"
            aria-hidden="true"
            multiple 
            />
            {isLoading ? ( 
            <button
                type="button"
                onClick={onStopGenerating}
                className="p-2.5 bg-[var(--theme-bg-danger)] hover:bg-[var(--theme-bg-danger-hover)] active:bg-[var(--theme-bg-danger-hover)] text-[var(--theme-icon-stop)] rounded-md shadow-md hover:shadow-lg transition-all duration-150 ease-in-out transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[var(--theme-bg-danger)] focus:ring-opacity-75 flex-shrink-0"
                aria-label="Stop generating response"
                title="Stop Generating"
            >
                <Ban size={20} />
            </button>
            ) : isEditing ? (
            <>
                <button
                    type="button"
                    onClick={onCancelEdit}
                    className="p-2.5 bg-[var(--theme-bg-secondary)] hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] rounded-md border border-[var(--theme-border-secondary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:ring-opacity-50 flex-shrink-0"
                    aria-label="Cancel editing message"
                    title="Cancel Edit"
                >
                    <X size={20} />
                </button>
                <button
                    type="submit"
                    disabled={!canSend}
                    className="p-2.5 bg-amber-500 hover:bg-amber-600 text-[var(--theme-icon-send)] rounded-md disabled:bg-[var(--theme-bg-tertiary)] disabled:text-[var(--theme-text-tertiary)] disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-opacity-50 flex-shrink-0"
                    aria-label="Update and send message"
                    title="Update & Send"
                >
                    <Edit2 size={20} />
                </button>
            </>
            ) : (
            <button
                type="submit"
                disabled={!canSend}
                className="p-2.5 bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-icon-send)] rounded-md disabled:bg-[var(--theme-bg-tertiary)] disabled:text-[var(--theme-text-tertiary)] disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:ring-opacity-50 flex-shrink-0"
                aria-label="Send message"
                title="Send"
            >
                <Send size={20} />
            </button>
            )}
        </div>
      </form>
    </div>
  );
};
