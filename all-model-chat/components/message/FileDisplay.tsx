
import React, { useState } from 'react';
import { UploadedFile } from '../../types';
import { Check, Copy, Download, SlidersHorizontal, Scissors, Settings2 } from 'lucide-react'; 
import { triggerDownload } from '../../utils/exportUtils';
import { getFileTypeCategory, CATEGORY_STYLES, getResolutionColor } from '../../utils/uiUtils';
import { formatFileSize } from '../../utils/domainUtils';
import { SUPPORTED_IMAGE_MIME_TYPES } from '../../constants/fileConstants';

interface FileDisplayProps {
  file: UploadedFile;
  onFileClick?: (file: UploadedFile) => void;
  isFromMessageList?: boolean;
  isGridView?: boolean;
  onConfigure?: () => void;
  isGemini3?: boolean;
}

const getDisplayType = (mimeType: string, name: string) => {
    // Check extension first as it's often more reliable/familiar
    const ext = name.split('.').pop()?.toUpperCase();
    if (ext && ext.length > 1 && ext.length < 5) return ext;

    if (mimeType.includes('pdf')) return 'PDF';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'DOC';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'XLS';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'PPT';
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'ZIP';
    if (mimeType.includes('csv')) return 'CSV';
    if (mimeType.includes('json')) return 'JSON';
    if (mimeType.includes('html')) return 'HTML';
    if (mimeType.includes('javascript')) return 'JS';
    if (mimeType.includes('python')) return 'PY';
    
    // Fallback
    const subtype = mimeType.split('/').pop()?.toUpperCase() || 'FILE';
    return subtype.length > 8 ? subtype.substring(0, 8) : subtype;
};

export const FileDisplay: React.FC<FileDisplayProps> = ({ file, onFileClick, isFromMessageList, isGridView, onConfigure, isGemini3 }) => {
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

  const isVideo = category === 'video' || category === 'youtube';
  const isImage = category === 'image';
  const isPdf = category === 'pdf';

  // Configuration check logic matches SelectedFileDisplay
  const canConfigure = onConfigure && !file.error && (
      isVideo || (isGemini3 && (isImage || isPdf))
  );

  const ConfigIcon = (isGemini3) ? SlidersHorizontal : (isVideo ? Scissors : Settings2);

  // Render Image Content specifically
  if (category === 'image' && file.dataUrl && !file.error) {
      return (
        <div className={`relative group rounded-xl overflow-hidden border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)] shadow-sm transition-all hover:shadow-md ${isGridView ? '' : 'w-fit max-w-full sm:max-w-sm'}`}>
            <img 
                src={file.dataUrl} 
                alt={file.name} 
                className={`block ${isGridView ? 'w-full h-full object-cover aspect-square' : 'w-auto h-auto max-w-full max-h-80 object-contain'} ${isClickable ? 'cursor-pointer hover:opacity-95 transition-opacity' : ''}`}
                aria-label={`Uploaded image: ${file.name}`}
                onClick={handleClick}
            />
            {isFromMessageList && (
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Resolution / Configuration Control (Merged to prevent duplicates) */}
                    {canConfigure ? (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onConfigure && onConfigure(); }}
                            title={file.mediaResolution ? `Configure (Resolution: ${file.mediaResolution})` : "Configure"}
                            className={`p-1.5 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm transition-colors ${getResolutionColor(file.mediaResolution)}`}
                        >
                            <ConfigIcon size={14} strokeWidth={2} />
                        </button>
                    ) : file.mediaResolution ? (
                        <div className={`p-1.5 rounded-full bg-black/50 backdrop-blur-sm ${getResolutionColor(file.mediaResolution)}`} title={`Resolution: ${file.mediaResolution}`}>
                            <SlidersHorizontal size={14} strokeWidth={2} />
                        </div>
                    ) : null}

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
  const { Icon, colorClass, bgClass } = CATEGORY_STYLES[category] || CATEGORY_STYLES['code'];

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
            <div className="flex items-center gap-1.5 text-xs text-[var(--theme-text-tertiary)]">
                <span className="truncate">{getDisplayType(file.type, file.name)}</span>
                {file.size > 0 && (
                    <>
                        <span className="w-0.5 h-0.5 rounded-full bg-current flex-shrink-0 opacity-50"></span>
                        <span className="flex-shrink-0 whitespace-nowrap">{formatFileSize(file.size)}</span>
                    </>
                )}
                {file.videoMetadata && (
                    <span className="flex items-center gap-0.5 text-[var(--theme-text-link)] ml-1 flex-shrink-0" title="Video Clipped">
                        <Scissors size={10} />
                    </span>
                )}
                {file.mediaResolution && (
                    <span className="flex items-center gap-0.5 text-[var(--theme-text-link)] ml-1 flex-shrink-0" title={`Resolution: ${file.mediaResolution}`}>
                        <SlidersHorizontal size={10} />
                    </span>
                )}
                {file.error && <span className="text-[var(--theme-text-danger)] ml-1 flex-shrink-0">Error</span>}
            </div>
        </div>

        {/* Action Buttons for Card View */}
        <div className="flex items-center gap-1">
            {canConfigure && (
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onConfigure && onConfigure(); }}
                    title="Configure"
                    className="p-1.5 rounded-lg hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                >
                    <ConfigIcon size={16} strokeWidth={2} />
                </button>
            )}

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
