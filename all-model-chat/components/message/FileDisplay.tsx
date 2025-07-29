import React, { useState } from 'react';
import { UploadedFile } from '../../types';
import { 
    SUPPORTED_IMAGE_MIME_TYPES, 
    SUPPORTED_TEXT_MIME_TYPES, 
    SUPPORTED_AUDIO_MIME_TYPES, 
    SUPPORTED_PDF_MIME_TYPES,
    SUPPORTED_VIDEO_MIME_TYPES, 
} from '../../constants/fileConstants';
import { FileText, ImageIcon, AlertCircle, FileCode2, Trash2, FileVideo, FileAudio, X, Maximize, Minimize, RotateCw, ExternalLink, Expand, Sigma, Check, ClipboardCopy, Download } from 'lucide-react'; 
import { getResponsiveValue } from '../../utils/appUtils';

interface FileDisplayProps {
  file: UploadedFile;
  onImageClick?: (file: UploadedFile) => void;
  isFromMessageList?: boolean;
}

const formatFileSize = (sizeInBytes: number): string => {
  if (sizeInBytes < 1024) {
      return `${sizeInBytes} B`;
  }
  const sizeInKb = sizeInBytes / 1024;
  if (sizeInKb < 1024) {
      return `${sizeInKb.toFixed(1)} KB`;
  }
  const sizeInMb = sizeInKb / 1024;
  return `${sizeInMb.toFixed(2)} MB`;
};

export const FileDisplay: React.FC<FileDisplayProps> = ({ file, onImageClick, isFromMessageList }) => {
  const commonClasses = "flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-md bg-[var(--theme-bg-input)] bg-opacity-50 border border-[var(--theme-border-secondary)]";
  const textClasses = "text-xs sm:text-sm";
  const nameClass = "font-medium truncate block";
  const detailsClass = "text-xs text-[var(--theme-text-tertiary)]";
  const [idCopied, setIdCopied] = useState(false);
  const iconSize = getResponsiveValue(20, 24);

  const isClickableImage = SUPPORTED_IMAGE_MIME_TYPES.includes(file.type) && file.dataUrl && !file.error && onImageClick;

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
  
  const handleDownloadImage = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!file.dataUrl) return;
    
    const link = document.createElement('a');
    link.href = file.dataUrl;
    link.download = file.name || 'generated-image.jpeg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const imageElement = (
      <img 
        src={file.dataUrl} 
        alt={file.name} 
        className={`max-w-full min-w-0 max-h-72 sm:max-h-80 rounded-lg object-contain border border-[var(--theme-border-secondary)] ${isClickableImage ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
        aria-label={`Uploaded image: ${file.name}`}
        onClick={isClickableImage ? () => onImageClick && onImageClick(file) : undefined}
        tabIndex={isClickableImage ? 0 : -1} 
        onKeyDown={isClickableImage ? (e) => { if ((e.key === 'Enter' || e.key === ' ') && onImageClick) onImageClick(file); } : undefined}
      />
  );
  
  return (
    <div className={`${commonClasses} ${file.error ? 'border-[var(--theme-bg-danger)]' : ''} relative group`}>
      {SUPPORTED_IMAGE_MIME_TYPES.includes(file.type) && file.dataUrl && !file.error ? (
        imageElement
      ) : SUPPORTED_IMAGE_MIME_TYPES.includes(file.type) && !file.error ? (
        <>
          <ImageIcon size={iconSize} className="text-[var(--theme-text-tertiary)] flex-shrink-0" />
          <div className={textClasses}>
            <span className={nameClass} title={file.name}>{file.name}</span>
            <span className={detailsClass}>{file.type} - {formatFileSize(file.size)}</span>
          </div>
        </>
      ) : SUPPORTED_AUDIO_MIME_TYPES.includes(file.type) && !file.error ? (
        <>
          <FileAudio size={iconSize} className="text-[var(--theme-text-tertiary)] flex-shrink-0" />
          <div className={textClasses}>
            <span className={nameClass} title={file.name}>{file.name}</span>
            <span className={detailsClass}>{file.type} - {formatFileSize(file.size)}</span>
          </div>
        </>
      ) : SUPPORTED_VIDEO_MIME_TYPES.includes(file.type) && !file.error ? (
        <>
          <FileVideo size={iconSize} className="text-purple-400 flex-shrink-0" />
          <div className={textClasses}>
            <span className={nameClass} title={file.name}>{file.name}</span>
            <span className={detailsClass}>{file.type} - {formatFileSize(file.size)}</span>
          </div>
        </>
      ) : SUPPORTED_PDF_MIME_TYPES.includes(file.type) && !file.error ? ( 
        <>
          <FileText size={iconSize} className="text-red-500 flex-shrink-0" /> 
          <div className={textClasses}>
            <span className={nameClass} title={file.name}>{file.name}</span>
            <span className={detailsClass}>{file.type} - {formatFileSize(file.size)}</span>
          </div>
        </>
      ) : SUPPORTED_TEXT_MIME_TYPES.includes(file.type) && !file.error ? (
        <>
          <FileText size={iconSize} className="text-[var(--theme-text-tertiary)] flex-shrink-0" />
          <div className={textClasses}>
            <span className={nameClass} title={file.name}>{file.name}</span>
            <span className={detailsClass}>{file.type} - {formatFileSize(file.size)}</span>
          </div>
        </>
      ) : ( 
        <>
          <AlertCircle size={iconSize} className={`${file.error ? 'text-[var(--theme-text-danger)]' : 'text-[var(--theme-text-tertiary)]'} flex-shrink-0`} />
           <div className={textClasses}>
            <span className={nameClass} title={file.name}>{file.name}</span>
            <span className={detailsClass}>{file.type} - {formatFileSize(file.size)}</span>
          </div>
        </>
      )}
      {file.error && (
        <p className="text-xs text-[var(--theme-text-danger)] ml-auto pl-2 flex-shrink-0" title={file.error}>Error</p>
      )}
      {isFromMessageList && file.dataUrl && file.name.startsWith('generated-image-') && !file.error && (
        <button
            onClick={handleDownloadImage}
            title="Download Image"
            aria-label="Download Image"
            className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/50"
        >
            <Download size={14} />
        </button>
      )}
      {isFromMessageList && file.fileApiName && file.uploadState === 'active' && !file.error && (
        <button
          onClick={handleCopyId}
          title={idCopied ? "File ID Copied!" : "Copy File ID (e.g., files/xyz123)"}
          aria-label={idCopied ? "File ID Copied!" : "Copy File ID"}
          className={`absolute top-0.5 right-0.5 sm:top-1 sm:right-1 p-0.5 rounded-full bg-[var(--theme-bg-secondary)] hover:bg-[var(--theme-bg-tertiary)] transition-all
                      ${idCopied ? 'text-[var(--theme-text-success)]' : 'text-[var(--theme-text-link)]'}
                      opacity-0 group-hover:opacity-100 focus:opacity-100`}
        >
          {idCopied ? <Check size={12} /> : <ClipboardCopy size={12} />}
        </button>
      )}
    </div>
  );
};