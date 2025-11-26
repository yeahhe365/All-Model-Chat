
import React, { useState, useEffect, useRef } from 'react';
import { UploadedFile } from '../../types';
import { Ban, X, AlertTriangleIcon, Loader2, CheckCircle, Copy, Check, FileVideo, FileAudio, FileText, ImageIcon, Youtube, FileCode2, Scissors } from 'lucide-react';
import { 
  SUPPORTED_IMAGE_MIME_TYPES, 
  SUPPORTED_AUDIO_MIME_TYPES, 
  SUPPORTED_PDF_MIME_TYPES,
  SUPPORTED_VIDEO_MIME_TYPES
} from '../../constants/fileConstants';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';

interface SelectedFileDisplayProps {
  file: UploadedFile;
  onRemove: (fileId: string) => void;
  onCancelUpload: (fileId: string) => void;
  onConfigure?: (file: UploadedFile) => void;
  onPreview?: (file: UploadedFile) => void;
}

const formatFileSize = (sizeInBytes: number): string => {
  if (!sizeInBytes) return '';
  if (sizeInBytes < 1024) return `${sizeInBytes} B`;
  const sizeInKb = sizeInBytes / 1024;
  if (sizeInKb < 1024) return `${sizeInKb.toFixed(1)} KB`;
  const sizeInMb = sizeInKb / 1024;
  return `${sizeInMb.toFixed(1)} MB`;
};

export const SelectedFileDisplay: React.FC<SelectedFileDisplayProps> = ({ file, onRemove, onCancelUpload, onConfigure, onPreview }) => {
  const [isNewlyActive, setIsNewlyActive] = useState(false);
  const prevUploadState = useRef(file.uploadState);
  const { isCopied: idCopied, copyToClipboard } = useCopyToClipboard();

  useEffect(() => {
    if (prevUploadState.current !== 'active' && file.uploadState === 'active') {
      setIsNewlyActive(true);
      setTimeout(() => setIsNewlyActive(false), 800);
    }
    prevUploadState.current = file.uploadState;
  }, [file.uploadState]);

  const handleCopyId = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (file.fileApiName) {
        copyToClipboard(file.fileApiName);
    }
  };

  const isUploading = file.uploadState === 'uploading';
  const isProcessing = file.uploadState === 'processing_api' || file.isProcessing;
  const isFailed = file.uploadState === 'failed' || !!file.error;
  const isActive = file.uploadState === 'active';
  const isCancelled = file.uploadState === 'cancelled';

  const isCancellable = isUploading || (isProcessing && file.uploadState !== 'processing_api');
  
  // Icon Selection Logic
  let Icon = FileText;
  let iconColorClass = "text-[var(--theme-text-tertiary)]";
  let iconBgClass = "bg-[var(--theme-bg-tertiary)]/50";

  const isVideo = SUPPORTED_VIDEO_MIME_TYPES.includes(file.type) || file.type === 'video/youtube-link';

  if (SUPPORTED_AUDIO_MIME_TYPES.includes(file.type)) {
      Icon = FileAudio;
      iconColorClass = "text-purple-500 dark:text-purple-400";
      iconBgClass = "bg-purple-500/10 dark:bg-purple-400/10";
  } else if (file.type === 'video/youtube-link') {
      Icon = Youtube;
      iconColorClass = "text-red-600 dark:text-red-500";
      iconBgClass = "bg-red-600/10 dark:bg-red-500/10";
  } else if (SUPPORTED_VIDEO_MIME_TYPES.includes(file.type)) {
      Icon = FileVideo;
      iconColorClass = "text-pink-500 dark:text-pink-400";
      iconBgClass = "bg-pink-500/10 dark:bg-pink-400/10";
  } else if (SUPPORTED_PDF_MIME_TYPES.includes(file.type)) {
      Icon = FileText;
      iconColorClass = "text-orange-500 dark:text-orange-400";
      iconBgClass = "bg-orange-500/10 dark:bg-orange-400/10";
  } else if (SUPPORTED_IMAGE_MIME_TYPES.includes(file.type)) {
      Icon = ImageIcon;
      iconColorClass = "text-blue-500 dark:text-blue-400";
      iconBgClass = "bg-blue-500/10 dark:bg-blue-400/10";
  } else {
      Icon = FileCode2;
      iconColorClass = "text-emerald-500 dark:text-emerald-400";
      iconBgClass = "bg-emerald-500/10 dark:bg-emerald-400/10";
  }

  const progress = file.progress ?? 0;

  return (
    <div className={`group relative flex flex-col w-24 flex-shrink-0 ${isNewlyActive ? 'newly-active-file-animate' : ''} select-none`}>
      
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); isCancellable ? onCancelUpload(file.id) : onRemove(file.id); }}
        className="absolute -top-2 -right-2 z-30 p-1 bg-[var(--theme-bg-secondary)] rounded-full shadow-sm border border-[var(--theme-border-secondary)] text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-danger)] hover:border-[var(--theme-text-danger)] transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 scale-90 hover:scale-100"
        title={isCancellable ? "Cancel Upload" : "Remove File"}
        aria-label={isCancellable ? "Cancel Upload" : "Remove File"}
      >
        {isCancellable ? <Ban size={14} /> : <X size={14} />}
      </button>

      <div 
        onClick={() => isActive && onPreview && onPreview(file)}
        className={`relative w-full aspect-square rounded-xl border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-tertiary)]/30 overflow-hidden flex items-center justify-center transition-colors group-hover:border-[var(--theme-border-focus)]/50 ${isActive && onPreview ? 'cursor-pointer hover:opacity-90' : ''}`}
      >
        
        <div className={`w-full h-full flex items-center justify-center p-2 transition-all duration-300 ${isUploading || isProcessing ? 'opacity-30 blur-[1px] scale-95' : 'opacity-100'}`}>
            {file.dataUrl && SUPPORTED_IMAGE_MIME_TYPES.includes(file.type) ? (
                <img 
                    src={file.dataUrl} 
                    alt={file.name} 
                    className="w-full h-full object-cover rounded-lg shadow-sm" 
                />
            ) : (
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBgClass} transition-colors`}>
                    <Icon size={24} className={iconColorClass} strokeWidth={1.5} />
                </div>
            )}
        </div>

        {(isUploading || isProcessing) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                {isUploading ? (
                    <div className="flex flex-col items-center">
                        <div className="relative w-10 h-10 flex items-center justify-center">
                            <svg className="w-full h-full -rotate-90 drop-shadow-md" viewBox="0 0 36 36">
                                <path className="text-[var(--theme-bg-primary)] opacity-50" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                <path className="text-[var(--theme-text-link)] transition-all duration-200 ease-out" strokeDasharray={`${progress}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                            </svg>
                            <span className="absolute text-[9px] font-bold text-[var(--theme-text-primary)]">{Math.round(progress)}%</span>
                        </div>
                        {file.uploadSpeed && (
                            <span className="mt-1 text-[8px] font-medium text-[var(--theme-text-primary)] bg-black/40 px-1 rounded backdrop-blur-[1px] shadow-sm whitespace-nowrap">
                                {file.uploadSpeed}
                            </span>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-1">
                        <Loader2 size={20} className="animate-spin text-[var(--theme-text-link)]" />
                    </div>
                )}
            </div>
        )}

        {isFailed && !isCancelled && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--theme-bg-danger)]/10 backdrop-blur-[1px] z-20">
                <AlertTriangleIcon size={20} className="text-[var(--theme-text-danger)] mb-1" />
            </div>
        )}

        {isNewlyActive && (
             <div className="absolute inset-0 flex items-center justify-center bg-[var(--theme-bg-success)]/20 backdrop-blur-[1px] animate-pulse z-20">
                <CheckCircle size={24} className="text-[var(--theme-text-success)] drop-shadow-md" />
             </div>
        )}

        {isActive && isVideo && onConfigure && !file.error && (
             <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onConfigure(file); }}
                title="Configure Video"
                className="absolute bottom-1 left-1 p-1.5 rounded-md bg-black/50 backdrop-blur-md text-white/80 hover:text-white hover:bg-black/70 transition-all z-20"
             >
                <Scissors size={12} strokeWidth={2} />
             </button>
        )}

        {file.fileApiName && isActive && !file.error && (
            <button
              type="button"
              onClick={handleCopyId}
              title={idCopied ? "ID Copied" : "Copy File ID"}
              className={`absolute bottom-1 right-1 p-1.5 rounded-md bg-black/50 backdrop-blur-md text-white/80 hover:text-white hover:bg-black/70 transition-all opacity-0 group-hover:opacity-100 scale-90 hover:scale-100 z-20 ${idCopied ? '!text-green-400 !opacity-100' : ''}`}
            >
              {idCopied ? <Check size={12} strokeWidth={3} /> : <Copy size={12} strokeWidth={2} />}
            </button>
        )}
      </div>

      <div className="mt-1.5 px-0.5 text-left w-full">
        <p className="text-[11px] font-medium text-[var(--theme-text-primary)] truncate leading-tight" title={file.name}>
            {file.name}
        </p>
        <p className="text-[9px] text-[var(--theme-text-tertiary)] truncate leading-tight mt-0.5 flex items-center gap-1">
            {file.videoMetadata ? <Scissors size={8} className="text-[var(--theme-text-link)]" /> : null}
            {isFailed ? (file.error || 'Error') : 
             isUploading ? 'Uploading...' :
             isProcessing ? 'Processing...' :
             isCancelled ? 'Cancelled' : 
             formatFileSize(file.size)}
        </p>
      </div>
    </div>
  );
};
