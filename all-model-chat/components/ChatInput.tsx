
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Send, Loader2, Edit2, Ban, Paperclip, XCircle, FileText, FileVideo, FileAudio, AlertTriangleIcon } from 'lucide-react'; // Added FileVideo, FileAudio, AlertTriangleIcon
import { UploadedFile } from '../types';
import { 
  SUPPORTED_IMAGE_MIME_TYPES, 
  SUPPORTED_TEXT_MIME_TYPES,
  SUPPORTED_VIDEO_MIME_TYPES, 
  SUPPORTED_AUDIO_MIME_TYPES, 
  ALL_SUPPORTED_MIME_TYPES,
} from '../constants';

interface ChatInputProps {
  inputText: string;
  setInputText: (text: string) => void;
  selectedFiles: UploadedFile[]; 
  setSelectedFiles: (files: UploadedFile[] | ((prevFiles: UploadedFile[]) => UploadedFile[])) => void; 
  onSendMessage: () => void;
  isLoading: boolean; // For API call loading
  isEditing: boolean;
  onStopGenerating: () => void;
  onProcessFiles: (files: FileList | File[]) => Promise<void>;
  isProcessingFile: boolean; // Global: true if ANY file is being processed by FileReader
  fileError: string | null;    // Global app-level file error (e.g. "too many files")
}

const INITIAL_TEXTAREA_HEIGHT_PX = 44;
const MAX_TEXTAREA_HEIGHT_PX = INITIAL_TEXTAREA_HEIGHT_PX * 3;

export const ChatInput: React.FC<ChatInputProps> = ({
  inputText,
  setInputText,
  selectedFiles,
  setSelectedFiles,
  onSendMessage,
  isLoading,
  isEditing,
  onStopGenerating,
  onProcessFiles,
  isProcessingFile, // True if any file is actively being read by FileReader
  fileError, // General app-level file error
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const justInitiatedFileOpRef = useRef(false);
  const prevIsProcessingFileRef = useRef(isProcessingFile);

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
    if (prevIsProcessingFileRef.current && !isProcessingFile) {
      if (justInitiatedFileOpRef.current) {
        textareaRef.current?.focus();
        justInitiatedFileOpRef.current = false; 
      }
    }
    prevIsProcessingFileRef.current = isProcessingFile;
  }, [isProcessingFile]);
  
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
    if (!items || isProcessingFile) return;

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

  const hasSuccessfullyProcessedFiles = selectedFiles.some(f => !f.isProcessing && !f.error);
  const canSend = (inputText.trim() !== '' || hasSuccessfullyProcessedFiles) && !isProcessingFile && !isLoading;

  return (
    <div
      className="px-2 pt-2 pb-1 bg-[var(--theme-bg-primary)] border-t border-[var(--theme-border-primary)]"
    >
      {fileError && ( // Display general app-level file error
        <div className="mb-2 p-2 text-sm text-[var(--theme-text-danger)] bg-[var(--theme-bg-danger)] bg-opacity-20 border border-[var(--theme-bg-danger)] rounded-md">
          {fileError}
        </div>
      )}
      {/* Container for selected file previews and their individual statuses */}
      {selectedFiles.length > 0 && (
        <div className="mb-2 p-2 space-y-2 bg-[var(--theme-bg-secondary)] rounded-md border border-[var(--theme-border-secondary)] overflow-x-auto">
          <div className="flex gap-3">
            {selectedFiles.map((file) => (
              <div key={file.id} className="relative group flex-shrink-0 w-28 text-center">
                {!file.isProcessing && ( // Show remove button only if not actively processing this specific file
                  <button
                    onClick={() => removeSelectedFile(file.id)}
                    className="absolute -top-1.5 -right-1.5 p-0.5 bg-[var(--theme-bg-primary)] hover:bg-[var(--theme-bg-danger)] text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-accent)] rounded-full opacity-50 group-hover:opacity-100 transition-all z-10"
                    aria-label={`Remove ${file.name}`}
                    title={`Remove ${file.name}`}
                  >
                    <XCircle size={18} />
                  </button>
                )}
                {/* File Preview Area */}
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
                  ) : SUPPORTED_TEXT_MIME_TYPES.includes(file.type) ? (
                    <FileText size={32} className="text-[var(--theme-text-tertiary)]" />
                  ) : ( 
                    <FileText size={32} className="text-[var(--theme-text-tertiary)]" /> // Fallback for unsupported (but added) types
                  )}
                </div>
                {/* File Name */}
                <div className="text-xs text-[var(--theme-text-tertiary)] mt-0.5 truncate w-full" title={file.name}>{file.name}</div>
                
                {/* Progress Bar and Status */}
                {file.isProcessing && typeof file.progress === 'number' && (
                  <div className="w-full bg-[var(--theme-border-secondary)] rounded-full h-1.5 mt-1">
                    <div 
                      className="bg-[var(--theme-bg-accent)] h-1.5 rounded-full transition-all duration-150 ease-linear" 
                      style={{ width: `${file.progress}%` }}
                    ></div>
                  </div>
                )}
                {file.isProcessing && (
                     <div className="text-xs text-[var(--theme-text-link)] mt-0.5">{file.progress ?? 0}%</div>
                )}
                {file.error && (
                  <div className="text-xs text-[var(--theme-text-danger)] mt-0.5 truncate" title={file.error}>Error</div>
                )}
                 {!file.isProcessing && !file.error && file.progress === 100 && (
                     <div className="text-xs text-green-500 mt-0.5">Ready</div>
                 )}
              </div>
            ))}
          </div>
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 sm:gap-3"
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
          disabled={isProcessingFile} // Disable textarea if any file is globally processing
          aria-label="Chat message input"
          onFocus={(e) => adjustTextareaHeight(e.target)} 
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessingFile} // Disable if any file is being globally processed
          className="p-2.5 bg-[var(--theme-bg-secondary)] hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-icon-attach)] rounded-md border border-[var(--theme-border-secondary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:ring-opacity-50 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Attach file(s)"
          title="Attach file(s)"
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
        {isLoading ? ( // API loading
          <button
            type="button"
            onClick={onStopGenerating}
            className="p-2.5 bg-[var(--theme-bg-danger)] hover:bg-[var(--theme-bg-danger-hover)] active:bg-[var(--theme-bg-danger-hover)] text-[var(--theme-icon-stop)] rounded-md shadow-md hover:shadow-lg transition-all duration-150 ease-in-out transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[var(--theme-bg-danger)] focus:ring-opacity-75 flex-shrink-0"
            aria-label="Stop generating response"
            title="Stop Generating"
          >
            <Ban size={20} />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSend}
            className={`p-2.5 ${isEditing ? 'bg-amber-500 hover:bg-amber-600' : 'bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)]'} text-[var(--theme-icon-send)] rounded-md disabled:bg-[var(--theme-bg-tertiary)] disabled:text-[var(--theme-text-tertiary)] disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 ${isEditing ? 'focus:ring-amber-400' : 'focus:ring-[var(--theme-border-focus)]'} focus:ring-opacity-50 flex-shrink-0`}
            aria-label={isEditing ? "Update and send message" : "Send message"}
            title={isEditing ? "Update & Send" : "Send"}
          >
            {isEditing ? (
              <Edit2 size={20} />
            ) : (
              <Send size={20} />
            )}
          </button>
        )}
      </form>
    </div>
  );
};
