import React, { useState } from 'react';
import { UploadedFile } from '../../types';
import { Ban, XCircle, AlertTriangleIcon, Loader2, CheckCircle, ClipboardCopy, Check, FileVideo, FileAudio, FileText } from 'lucide-react';
import { 
  SUPPORTED_IMAGE_MIME_TYPES, 
  SUPPORTED_VIDEO_MIME_TYPES, 
  SUPPORTED_AUDIO_MIME_TYPES, 
  SUPPORTED_TEXT_MIME_TYPES, 
  SUPPORTED_PDF_MIME_TYPES
} from '../../constants/fileConstants';

interface SelectedFileDisplayProps {
  file: UploadedFile;
  onRemove: (fileId: string) => void;
  onCancelUpload: (fileId: string) => void;
}

export const SelectedFileDisplay: React.FC<SelectedFileDisplayProps> = ({ file, onRemove, onCancelUpload }) => {
  const [idCopied, setIdCopied] = useState(false);
  const iconSize = window.innerWidth < 640 ? 28 : 32;
  const [isNewlyActive, setIsNewlyActive] = useState(false);
  const prevUploadState = React.useRef(file.uploadState);

  React.useEffect(() => {
    if (prevUploadState.current !== 'active' && file.uploadState === 'active') {
      setIsNewlyActive(true);
      setTimeout(() => setIsNewlyActive(false), 800); // Match animation duration
    }
    prevUploadState.current = file.uploadState;
  }, [file.uploadState]);


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
    <div className={`relative group flex-shrink-0 w-24 text-center ${isNewlyActive ? 'newly-active-file-animate' : ''}`}>
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
      <div className="file-preview-box h-16 sm:h-20 w-full rounded border border-[var(--theme-border-secondary)] flex flex-col items-center justify-center bg-[var(--theme-bg-tertiary)] overflow-hidden">
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