import React, { useState, useEffect, useRef } from 'react';
import { UploadedFile } from '../../../types';
import { Ban, X, Loader2, CheckCircle, Copy, Check, Scissors, SlidersHorizontal, Settings2, Edit3 } from 'lucide-react';
import { getFileTypeCategory, CATEGORY_STYLES, getResolutionColor } from '../../../utils/uiUtils';
import { useCopyToClipboard } from '../../../hooks/useCopyToClipboard';
import { SUPPORTED_IMAGE_MIME_TYPES } from '../../../constants/fileConstants';
import { formatFileSize } from '../../../utils/domainUtils';

interface SelectedFileDisplayProps {
  file: UploadedFile;
  onRemove: (fileId: string) => void;
  onCancelUpload: (fileId: string) => void;
  onConfigure?: (file: UploadedFile) => void;
  onPreview?: (file: UploadedFile) => void;
  isGemini3?: boolean;
}

export const SelectedFileDisplay: React.FC<SelectedFileDisplayProps> = ({ file, onRemove, onCancelUpload, onConfigure, onPreview, isGemini3 }) => {
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
  
  const category = getFileTypeCategory(file.type, file.error);
  const { Icon, colorClass, bgClass } = CATEGORY_STYLES[category] || CATEGORY_STYLES['code'];
  
  const isVideo = category === 'video' || category === 'youtube';
  const isImage = category === 'image';
  const isPdf = category === 'pdf';
  const isText = category === 'code'; // Based on getFileTypeCategory logic
  
  // Determine if this file supports configuration (Video Clipping OR Gemini 3 Resolution OR Text Editing)
  const canConfigure = onConfigure && isActive && !file.error && (
      isVideo || (isGemini3 && (isImage || isPdf)) || isText
  );

  const progress = file.progress ?? 0;
  const ErrorIcon = CATEGORY_STYLES['error'].Icon;

  // Icon Selection Logic:
  // If it's a text file, use Edit icon
  // If it's Gemini 3, we support resolution settings. Use Sliders icon.
  // If it's NOT Gemini 3 but is Video, we only support clipping. Use Scissors.
  const ConfigIcon = isText ? Edit3 : (isGemini3 ? SlidersHorizontal : (isVideo ? Scissors : Settings2));

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
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bgClass} transition-colors`}>
                    <Icon size={24} className={colorClass} strokeWidth={1.5} />
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
                <ErrorIcon size={20} className="text-[var(--theme-text-danger)] mb-1" />
            </div>
        )}

        {isNewlyActive && (
             <div className="absolute inset-0 flex items-center justify-center bg-[var(--theme-bg-success)]/20 backdrop-blur-[1px] animate-pulse z-20">
                <CheckCircle size={24} className="text-[var(--theme-text-success)] drop-shadow-md" />
             </div>
        )}

        {canConfigure && (
             <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onConfigure && onConfigure(file); }}
                title={isText ? "Edit File" : "Configure File"}
                className={`absolute bottom-1 left-1 p-1.5 rounded-md bg-black/50 backdrop-blur-md hover:bg-black/70 transition-all z-20 ${getResolutionColor(file.mediaResolution)}`}
             >
                <ConfigIcon size={12} strokeWidth={2} />
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
        <p 
            className={`text-[9px] truncate leading-tight mt-0.5 flex items-center gap-1 ${isFailed ? 'text-[var(--theme-text-danger)] font-medium' : 'text-[var(--theme-text-tertiary)]'}`}
            title={isFailed ? file.error : undefined}
        >
            {file.videoMetadata ? <Scissors size={8} className="text-[var(--theme-text-link)]" /> : null}
            {file.mediaResolution && <SlidersHorizontal size={8} className="text-[var(--theme-text-link)]" />}
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