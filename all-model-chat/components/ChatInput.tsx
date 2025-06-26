
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Send, Loader2, Edit2, Ban, Paperclip, XCircle, FileText, FileVideo, FileAudio, AlertTriangleIcon, CheckCircle, Link2, ClipboardCopy, Check, Plus, X, UploadCloud, FileSignature, Save } from 'lucide-react'; // Added Save icon
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
  onCancelUpload: (fileId: string) => void; // New prop for cancelling upload
  isProcessingFile: boolean; 
  fileError: string | null;    
}

const INITIAL_TEXTAREA_HEIGHT_PX = 44; // approx for p-2.5 and text-base line height
const MAX_TEXTAREA_HEIGHT_PX = (window.innerWidth < 640 ? 40 : INITIAL_TEXTAREA_HEIGHT_PX) * 3; // Smaller base height for mobile for max height calc

const SelectedFileDisplay: React.FC<{
  file: UploadedFile;
  onRemove: (fileId: string) => void;
  onCancelUpload: (fileId: string) => void;
}> = ({ file, onRemove, onCancelUpload }) => {
  const [idCopied, setIdCopied] = useState(false);
  const iconSize = window.innerWidth < 640 ? 28 : 32;

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

  const isCancellable = file.isProcessing && (file.uploadState === 'pending' || file.uploadState === 'uploading' || file.uploadState === 'processing_api');
  const showRemoveButton = !file.isProcessing || file.error || file.uploadState === 'failed' || file.uploadState === 'cancelled';


  return (
    <div className="relative group flex-shrink-0 w-24 text-center">
      {isCancellable && (
        <button
          onClick={() => onCancelUpload(file.id)}
          className="absolute -top-1.5 -right-1.5 p-0.5 bg-[var(--theme-bg-primary)] hover:bg-[var(--theme-bg-danger)] text-[var(--theme-text-danger)] hover:text-[var(--theme-text-accent)] rounded-full opacity-75 group-hover:opacity-100 transition-all z-10"
          aria-label={`Cancel upload for ${file.name}`}
          title={`Cancel Upload`}
        >
          <Ban size={16} />
        </button>
      )}
      {showRemoveButton && !isCancellable && ( 
        <button
          onClick={() => onRemove(file.id)}
          className="absolute -top-1.5 -right-1.5 p-0.5 bg-[var(--theme-bg-primary)] hover:bg-[var(--theme-bg-danger)] text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-accent)] rounded-full opacity-50 group-hover:opacity-100 transition-all z-10"
          aria-label={`Remove ${file.name}`}
          title={`Remove ${file.name}`}
        >
          <XCircle size={16} />
        </button>
      )}
      <div className="h-16 sm:h-20 w-full rounded border border-[var(--theme-border-secondary)] flex flex-col items-center justify-center bg-[var(--theme-bg-tertiary)] overflow-hidden">
        {file.error && file.uploadState !== 'cancelled' ? ( // Don't show error icon if just cancelled
          <AlertTriangleIcon size={iconSize} className="text-[var(--theme-text-danger)]" />
        ) : file.uploadState === 'cancelled' ? (
          <Ban size={iconSize} className="text-[var(--theme-text-tertiary)]" />
        ) : file.dataUrl && SUPPORTED_IMAGE_MIME_TYPES.includes(file.type) ? (
          <img 
            src={file.dataUrl} 
            alt={file.name} 
            className="max-h-full max-w-full h-auto w-auto object-contain" 
          />
        ) : SUPPORTED_VIDEO_MIME_TYPES.includes(file.type) ? (
          <FileVideo size={iconSize} className="text-[var(--theme-text-tertiary)]" />
        ) : SUPPORTED_AUDIO_MIME_TYPES.includes(file.type) ? (
          <FileAudio size={iconSize} className="text-[var(--theme-text-tertiary)]" />
        ) : SUPPORTED_TEXT_MIME_TYPES.includes(file.type) && !SUPPORTED_PDF_MIME_TYPES.includes(file.type) ? (
          <FileText size={iconSize} className="text-[var(--theme-text-tertiary)]" />
        ) : SUPPORTED_PDF_MIME_TYPES.includes(file.type) ? (
          <FileText size={iconSize} className="text-red-500" />
        ) : ( 
          <FileText size={iconSize} className="text-[var(--theme-text-tertiary)]" /> 
        )}
      </div>
      <div className="text-xs text-[var(--theme-text-tertiary)] mt-0.5 truncate w-full" title={file.name}>{file.name}</div>
      
      {file.isProcessing && file.uploadState !== 'uploading' && file.uploadState !== 'cancelled' && typeof file.progress === 'number' && (
        <div className="w-full bg-[var(--theme-border-secondary)] rounded-full h-1 sm:h-1.5 mt-0.5 sm:mt-1">
          <div 
            className="bg-[var(--theme-bg-accent)] h-1 sm:h-1.5 rounded-full transition-all duration-150 ease-linear" 
            style={{ width: `${file.progress}%` }}
          ></div>
        </div>
      )}
      {file.uploadState === 'uploading' && (
          <div className="text-xs text-[var(--theme-text-link)] mt-0.5 flex items-center justify-center">
              <Loader2 size={10} className="animate-spin mr-1" /> Uploading...
          </div>
      )}
      {file.isProcessing && file.uploadState !== 'uploading' && file.uploadState !== 'cancelled' && (
            <div className="text-xs text-[var(--theme-text-link)] mt-0.5">{file.progress ?? 0}% Processing...</div>
      )}
      {file.error && (
        <div className="text-xs text-[var(--theme-text-danger)] mt-0.5 truncate" title={file.error}>{file.error}</div>
      )}
      {!file.isProcessing && !file.error && file.uploadState === 'active' && (
            <div className="text-xs text-green-500 mt-0.5 flex items-center justify-center">
                <CheckCircle size={10} className="mr-1" /> Ready
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
          {idCopied ? <Check size={10} /> : <ClipboardCopy size={10} />}
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
  onCancelUpload,
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

  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const attachButtonRef = useRef<HTMLButtonElement>(null);

  const [showCreateTextFileEditor, setShowCreateTextFileEditor] = useState(false);
  const [createTextContent, setCreateTextContent] = useState('');
  const [customFilename, setCustomFilename] = useState('');
  const createTextEditorTextareaRef = useRef<HTMLTextAreaElement>(null);


  const adjustTextareaHeight = useCallback((target: HTMLTextAreaElement | null) => {
    if (!target) return;
    target.style.height = 'auto'; // Reset height to shrink if needed
    const scrollHeight = target.scrollHeight;
    const currentInitialHeight = window.innerWidth < 640 ? 40 : INITIAL_TEXTAREA_HEIGHT_PX;
    const currentMaxHeight = MAX_TEXTAREA_HEIGHT_PX;
    const newHeight = Math.max(currentInitialHeight, Math.min(scrollHeight, currentMaxHeight));
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (
            attachMenuRef.current &&
            !attachMenuRef.current.contains(event.target as Node) &&
            attachButtonRef.current &&
            !attachButtonRef.current.contains(event.target as Node)
        ) {
            setIsAttachMenuOpen(false);
        }
    };

    if (isAttachMenuOpen) {
        document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAttachMenuOpen]);
  
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
    if (!items || isProcessingFile || isAddingById || showCreateTextFileEditor) return;

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
    if (!saneName.toLowerCase().endsWith('.txt')) {
      saneName += '.txt';
    }
    return saneName;
  };

  const handleConfirmCreateTextFile = async () => {
    if (!createTextContent.trim() || isProcessingFile || isLoading) return;
    justInitiatedFileOpRef.current = true;
    
    let finalFilename = `custom-text-${Date.now()}.txt`;
    if (customFilename.trim()) {
      finalFilename = sanitizeFilename(customFilename);
    }

    const newFile = new File([createTextContent], finalFilename, { type: "text/plain" });
    await onProcessFiles([newFile]); 
    setShowCreateTextFileEditor(false);
    setCreateTextContent('');
    setCustomFilename('');
  };

  const handleCancelCreateTextFile = () => {
    setShowCreateTextFileEditor(false);
    setCreateTextContent('');
    setCustomFilename('');
    textareaRef.current?.focus();
  };

  const openCreateTextFileEditor = () => {
    setShowAddByIdInput(false); 
    setShowCreateTextFileEditor(true);
    setIsAttachMenuOpen(false);
    setTimeout(() => createTextEditorTextareaRef.current?.focus(), 0);
  };
  
  const openAddByIdInput = () => {
    setShowCreateTextFileEditor(false); 
    setShowAddByIdInput(true);
    setIsAttachMenuOpen(false);
  };


  const hasSuccessfullyProcessedFiles = selectedFiles.some(f => !f.error && !f.isProcessing && f.uploadState === 'active');
  const canSend = (inputText.trim() !== '' || hasSuccessfullyProcessedFiles) && !isProcessingFile && !isLoading && !isAddingById && !showCreateTextFileEditor;
  const currentInitialTextareaHeight = window.innerWidth < 640 ? 40 : INITIAL_TEXTAREA_HEIGHT_PX;
  const attachIconSize = window.innerWidth < 640 ? 20 : 22; // Increased
  const sendIconSize = window.innerWidth < 640 ? 20 : 22; // Increased


  return (
    <>
      {showCreateTextFileEditor && (
        <div 
            className="fixed inset-0 bg-[var(--theme-bg-primary)] z-50 flex flex-col p-3 sm:p-4 md:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-text-file-title"
        >
          <div className="flex justify-between items-center mb-3 sm:mb-4">
            <h2 id="create-text-file-title" className="text-lg sm:text-xl font-semibold text-[var(--theme-text-link)]">
              Create New Text File
            </h2>
            <button
              onClick={handleCancelCreateTextFile}
              className="p-1.5 sm:p-2 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-secondary)] rounded-md"
              aria-label="Close text file editor"
            >
              <X size={20} />
            </button>
          </div>

          <input
            type="text"
            value={customFilename}
            onChange={(e) => setCustomFilename(e.target.value)}
            placeholder="Optional: Enter filename (e.g., my_notes.txt)"
            className="w-full p-2 sm:p-2.5 mb-2 sm:mb-3 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-md focus:ring-1 focus:ring-[var(--theme-border-focus)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] text-sm"
            aria-label="Custom filename for text file"
          />
          <textarea
            ref={createTextEditorTextareaRef}
            value={createTextContent}
            onChange={(e) => setCreateTextContent(e.target.value)}
            className="flex-grow w-full p-2 sm:p-3 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-md focus:ring-1 focus:ring-[var(--theme-border-focus)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] text-base resize-none"
            placeholder="Type or paste your text content here..."
            aria-label="Text content for new file"
          />
          <div className="mt-3 sm:mt-4 flex justify-end gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleCancelCreateTextFile}
              className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm bg-[var(--theme-bg-secondary)] hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] rounded-md transition-colors"
              aria-label="Cancel creating text file"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmCreateTextFile}
              disabled={!createTextContent.trim() || isProcessingFile || isLoading}
              className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-text-accent)] rounded-md disabled:bg-[var(--theme-bg-tertiary)] disabled:text-[var(--theme-text-tertiary)] transition-colors flex items-center gap-1 sm:gap-1.5"
              aria-label="Create text file from content"
            >
              <Save size={14} /> Create File
            </button>
          </div>
        </div>
      )}

      <div
        className={`px-1.5 sm:px-2 pt-1.5 sm:pt-2 bg-[var(--theme-bg-primary)] border-t border-[var(--theme-border-primary)] ${showCreateTextFileEditor ? 'opacity-30 pointer-events-none' : ''}`}
        aria-hidden={showCreateTextFileEditor}
      >
        {fileError && ( 
          <div className="mb-1.5 sm:mb-2 p-1.5 sm:p-2 text-xs sm:text-sm text-[var(--theme-text-danger)] bg-[var(--theme-bg-danger)] bg-opacity-20 border border-[var(--theme-bg-danger)] rounded-md">
            {fileError}
          </div>
        )}
        {selectedFiles.length > 0 && (
          <div className="mb-1.5 sm:mb-2 p-1.5 sm:p-2 bg-[var(--theme-bg-secondary)] rounded-md border border-[var(--theme-border-secondary)] overflow-x-auto custom-scrollbar">
            <div className="flex gap-2 sm:gap-3">
              {selectedFiles.map((file) => (
                <SelectedFileDisplay 
                  key={file.id} 
                  file={file} 
                  onRemove={removeSelectedFile}
                  onCancelUpload={onCancelUpload}
                />
              ))}
            </div>
          </div>
        )}
        {showAddByIdInput && (
          <div className="mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 bg-[var(--theme-bg-secondary)] rounded-md border border-[var(--theme-border-secondary)]">
            <input
              type="text"
              value={fileIdInput}
              onChange={(e) => setFileIdInput(e.target.value)}
              placeholder="Paste File ID (e.g., files/xyz123)"
              className="flex-grow p-1.5 sm:p-2 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-md focus:ring-1 focus:ring-[var(--theme-border-focus)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] text-xs sm:text-sm"
              aria-label="File ID input"
              disabled={isAddingById}
            />
            <button
              type="button"
              onClick={handleAddFileByIdSubmit}
              disabled={!fileIdInput.trim() || isAddingById || isLoading}
              className="p-1.5 sm:p-2 bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-icon-send)] rounded-md disabled:bg-[var(--theme-bg-tertiary)] disabled:text-[var(--theme-text-tertiary)] flex items-center gap-1 text-xs sm:text-sm"
              aria-label="Add file by ID"
            >
              {isAddingById ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Add
            </button>
            <button
              type="button"
              onClick={() => {setShowAddByIdInput(false); setFileIdInput(''); textareaRef.current?.focus();}}
              disabled={isAddingById}
              className="p-1.5 sm:p-2 bg-[var(--theme-bg-input)] hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-tertiary)] rounded-md flex items-center gap-1 text-xs sm:text-sm"
              aria-label="Cancel adding file by ID"
            >
              <XCircle size={14} /> Cancel
            </button>
          </div>
        )}
        
        <form
          onSubmit={handleSubmit}
          className="flex items-end gap-1.5 sm:gap-2"
        >
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            onPaste={handlePaste}
            placeholder="询问任何问题"
            className="flex-grow p-2 sm:p-2.5 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-md focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:border-[var(--theme-border-focus)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] overflow-y-auto text-sm sm:text-base"
            rows={1}
            style={{ 
              minHeight: `${currentInitialTextareaHeight}px`, 
              maxHeight: `${MAX_TEXTAREA_HEIGHT_PX}px`,
              resize: 'none' 
            }}
            aria-label="Chat message input"
            onFocus={(e) => adjustTextareaHeight(e.target)} 
            disabled={showCreateTextFileEditor} 
          />
          <div className="flex flex-shrink-0 items-center gap-1.5 sm:gap-2 relative">
              <button
                  ref={attachButtonRef}
                  type="button"
                  onClick={() => setIsAttachMenuOpen(!isAttachMenuOpen)}
                  disabled={isProcessingFile || isAddingById || showCreateTextFileEditor}
                  className={`p-2.5 sm:p-3 rounded-md border border-[var(--theme-border-secondary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:ring-opacity-50 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed
                      ${isAttachMenuOpen ? 'bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)]' : 'bg-[var(--theme-bg-secondary)] hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-icon-attach)]'}
                  `}
                  aria-label="Attach file menu"
                  title="Attach file"
                  aria-haspopup="true"
                  aria-expanded={isAttachMenuOpen}
              >
                  <Paperclip size={attachIconSize} />
              </button>
              {isAttachMenuOpen && (
                  <div
                      ref={attachMenuRef}
                      className="absolute bottom-full right-0 mb-1.5 sm:mb-2 w-52 sm:w-56 bg-[var(--theme-bg-primary)] border border-[var(--theme-border-secondary)] rounded-md shadow-lg z-20 py-1"
                      role="menu"
                  >
                      <button
                          onClick={() => { fileInputRef.current?.click(); setIsAttachMenuOpen(false); }}
                          className="w-full text-left px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] flex items-center gap-1.5 sm:gap-2"
                          role="menuitem"
                      >
                          <UploadCloud size={14} className="text-[var(--theme-icon-attach)]" />
                          Upload from Device
                      </button>
                      <button
                          onClick={openAddByIdInput}
                          className="w-full text-left px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] flex items-center gap-1.5 sm:gap-2"
                          role="menuitem"
                      >
                          <Link2 size={14} className="text-[var(--theme-icon-attach)]" />
                          Add by File ID
                      </button>
                      <button
                          onClick={openCreateTextFileEditor}
                          className="w-full text-left px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] flex items-center gap-1.5 sm:gap-2"
                          role="menuitem"
                      >
                          <FileSignature size={14} className="text-[var(--theme-icon-attach)]" />
                          Create Text File
                      </button>
                  </div>
              )}
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
                  className="p-2.5 sm:p-3 bg-[var(--theme-bg-danger)] hover:bg-[var(--theme-bg-danger-hover)] active:bg-[var(--theme-bg-danger-hover)] text-[var(--theme-icon-stop)] rounded-md shadow-md hover:shadow-lg transition-all duration-150 ease-in-out transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[var(--theme-bg-danger)] focus:ring-opacity-75 flex-shrink-0"
                  aria-label="Stop generating response"
                  title="Stop Generating"
              >
                  <Ban size={sendIconSize} />
              </button>
              ) : isEditing ? (
              <>
                  <button
                      type="button"
                      onClick={onCancelEdit}
                      className="p-2.5 sm:p-3 bg-[var(--theme-bg-secondary)] hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] rounded-md border border-[var(--theme-border-secondary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:ring-opacity-50 flex-shrink-0"
                      aria-label="Cancel editing message"
                      title="Cancel Edit"
                  >
                      <X size={sendIconSize} />
                  </button>
                  <button
                      type="submit"
                      disabled={!canSend}
                      className="p-2.5 sm:p-3 bg-amber-500 hover:bg-amber-600 text-[var(--theme-icon-send)] rounded-md disabled:bg-[var(--theme-bg-tertiary)] disabled:text-[var(--theme-text-tertiary)] disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-opacity-50 flex-shrink-0"
                      aria-label="Update and send message"
                      title="Update & Send"
                  >
                      <Edit2 size={sendIconSize} />
                  </button>
              </>
              ) : (
              <button
                  type="submit"
                  disabled={!canSend}
                  className="p-2.5 sm:p-3 bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-icon-send)] rounded-md disabled:bg-[var(--theme-bg-tertiary)] disabled:text-[var(--theme-text-tertiary)] disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:ring-opacity-50 flex-shrink-0"
                  aria-label="Send message"
                  title="Send"
              >
                  <Send size={sendIconSize} />
              </button>
              )}
          </div>
        </form>
      </div>
    </>
  );
};
