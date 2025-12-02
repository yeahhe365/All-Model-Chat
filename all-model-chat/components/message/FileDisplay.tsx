
import React, { useState } from 'react';
import { UploadedFile } from '../../types';
import { FileText, ImageIcon, AlertCircle, FileCode2, FileVideo, FileAudio, Check, Copy, Download, Youtube } from 'lucide-react'; 
import { triggerDownload } from '../../utils/exportUtils';
import { getFileTypeCategory, FileCategory } from '../../utils/uiUtils';
import { formatFileSize } from '../../utils/domainUtils';

interface FileDisplayProps {
  file: UploadedFile;
  onFileClick?: (file: UploadedFile) => void;
  isFromMessageList?: boolean;
  isGridView?: boolean;
}

const CATEGORY_STYLES: Record<FileCategory, { Icon: React.ElementType, colorClass: string, bgClass: string }> = {
    image: { Icon: ImageIcon, colorClass: "text-blue-500 dark:text-blue-400", bgClass: "bg-blue-500/10 dark:bg-blue-400/10" },
    audio: { Icon: FileAudio, colorClass: "text-purple-500 dark:text-purple-400", bgClass: "bg-purple-500/10 dark:bg-purple-400/10" },
    video: { Icon: FileVideo, colorClass: "text-pink-500 dark:text-pink-400", bgClass: "bg-pink-500/10 dark:bg-pink-400/10" },
    youtube: { Icon: Youtube, colorClass: "text-red-600 dark:text-red-500", bgClass: "bg-red-600/10 dark:bg-red-500/10" },
    pdf: { Icon: FileText, colorClass: "text-orange-500 dark:text-orange-400", bgClass: "bg-orange-500/10 dark:bg-orange-400/10" },
    code: { Icon: FileCode2, colorClass: "text-emerald-500 dark:text-emerald-400", bgClass: "bg-emerald-500/10 dark:bg-emerald-400/10" },
    error: { Icon: AlertCircle, colorClass: "text-[var(--theme-text-danger)]", bgClass: "bg-[var(--theme-bg-danger)]/10" },
};

export const FileDisplay: React.FC<FileDisplayProps> = ({ file, onFileClick, isFromMessageList, isGridView }) => {
  const [idCopied, setIdCopied] = useState(false);

  const isClickable = file.uploadState === 'active' && !file.error && onFileClick && file.dataUrl;
  const category = getFileTypeCategory(file.type, file.error);

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
  
  const handleDownloadFile = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!file.dataUrl) return;
    
    const filename = file.name || 'download';
    triggerDownload(file.dataUrl, filename, false);
  };

  const handleClick = (e: React.MouseEvent) => {
      if (isClickable) {
          e.stopPropagation();
          onFileClick(file);
      }
  };

  // Render Image Content specifically
  if (category === 'image' && file.dataUrl && !file.error) {
      return (
        <div className={`relative group rounded-xl overflow-hidden border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)] shadow-sm transition-all hover:shadow-md ${isGridView ? '' : 'w-fit max-w-full sm:max-w-md'}`}>
            <img 
                src={file.dataUrl} 
                alt={file.name} 
                className={`block ${isGridView ? 'w-full h-full object-cover aspect-square' : 'w-auto h-auto max-w-full max-h-[60vh] object-contain'} ${isClickable ? 'cursor-pointer hover:opacity-95 transition-opacity' : ''}`}
                aria-label={`Uploaded image: ${file.name}`}
                onClick={handleClick}
            />
            {isFromMessageList && (
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {(file.name.startsWith('generated-image-') || file.name.startsWith('edited-image-')) && (
                        <button
                            type="button"
                            onClick={handleDownloadFile}
                            title="Download Image"
                            className="p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm transition-colors"
                        >
                            <Download size={14} strokeWidth={2} />
                        </button>
                    )}
                    {file.fileApiName && file.uploadState === 'active' && (
                        <button
                            type="button"
                            onClick={handleCopyId}
                            title={idCopied ? "ID Copied!" : "Copy File ID"}
                            className={`p-1.5 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm transition-colors ${idCopied ? 'text-green-400' : 'text-white'}`}
                        >
                            {idCopied ? <Check size={14} strokeWidth={2} /> : <Copy size={14} strokeWidth={2} />}
                        </button>
                    )}
                </div>
            )}
        </div>
      );
  }

  // Render File Card for other types (or error states)
  const { Icon, colorClass, bgClass } = CATEGORY_STYLES[category];

  return (
    <div 
        onClick={handleClick}
        className={`flex items-center gap-3 p-2.5 rounded-xl border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-input)] hover:bg-[var(--theme-bg-tertiary)]/50 transition-all shadow-sm hover:shadow max-w-xs sm:max-w-sm relative group ${file.error ? 'border-[var(--theme-bg-danger)]/50' : ''} ${isClickable ? 'cursor-pointer' : ''}`}
    >
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${bgClass}`}>
            <Icon size={20} className={colorClass} strokeWidth={1.5} />
        </div>
        
        <div className="flex-grow min-w-0">
            <p className="text-sm font-medium text-[var(--theme-text-primary)] truncate" title={file.name}>
                {file.name}
            </p>
            <div className="flex items-center gap-2 text-xs text-[var(--theme-text-tertiary)]">
                <span className="truncate max-w-[100px]">{file.type.split('/').pop()?.toUpperCase() || 'FILE'}</span>
                {file.size > 0 && (
                    <>
                        <span className="w-0.5 h-0.5 rounded-full bg-current"></span>
                        <span>{formatFileSize(file.size)}</span>
                    </>
                )}
                {file.error && <span className="text-[var(--theme-text-danger)] ml-1">Error</span>}
            </div>
        </div>

        {/* Action Buttons for Card View */}
        <div className="flex items-center gap-1">
            {isFromMessageList && !file.fileApiName && file.dataUrl && !file.error && (
                <button
                    type="button"
                    onClick={handleDownloadFile}
                    title="Download"
                    className="p-1.5 rounded-lg hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                >
                    <Download size={16} strokeWidth={2} />
                </button>
            )}

            {isFromMessageList && file.fileApiName && file.uploadState === 'active' && !file.error && (
                <button
                    type="button"
                    onClick={handleCopyId}
                    title={idCopied ? "Copied!" : "Copy File ID"}
                    className={`p-1.5 rounded-lg hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 ${idCopied ? 'text-[var(--theme-text-success)]' : ''}`}
                >
                    {idCopied ? <Check size={16} strokeWidth={2} /> : <Copy size={16} strokeWidth={2} />}
                </button>
            )}
        </div>
    </div>
  );
};
