
import React, { useState, useCallback } from 'react';
import { X, Check, Download, ClipboardCopy, Loader2, FileText, ImageIcon, FileVideo, FileAudio, FileCode2, Save, Edit3 } from 'lucide-react';
import { UploadedFile } from '../../../types';
import { triggerDownload } from '../../../utils/exportUtils';
import { SUPPORTED_IMAGE_MIME_TYPES } from '../../../constants/fileConstants';
import { formatFileSize } from '../../../utils/domainUtils';

interface FilePreviewHeaderProps {
    file: UploadedFile;
    onClose: () => void;
    t: (key: string) => string;
    isEditable?: boolean;
    onToggleEdit?: () => void;
    onSave?: () => void;
    editedName?: string;
    onNameChange?: (name: string) => void;
}

export const FilePreviewHeader: React.FC<FilePreviewHeaderProps> = ({ 
    file, 
    onClose, 
    t,
    isEditable = false,
    onToggleEdit,
    onSave,
    editedName,
    onNameChange
}) => {
    const [isDownloading, setIsDownloading] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const isImage = SUPPORTED_IMAGE_MIME_TYPES.includes(file.type) || file.type === 'image/svg+xml';
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');
    const isMermaidDiagram = file.type === 'image/svg+xml';
    const isText = !isImage && !isPdf && !isVideo && !isAudio;

    const FileIcon = isImage ? ImageIcon : isPdf ? FileText : isVideo ? FileVideo : isAudio ? FileAudio : FileCode2;

    const handleCopy = useCallback(async () => {
        if (!file.dataUrl || isCopied) return;
        try {
            // Fetch content to copy
            const response = await fetch(file.dataUrl);
            const blob = await response.blob();
            
            if (file.type.startsWith('text/') || file.type === 'application/json' || file.type.includes('javascript') || file.type.includes('xml')) {
                const text = await blob.text();
                await navigator.clipboard.writeText(text);
            } else {
                if (!navigator.clipboard || !navigator.clipboard.write) {
                    throw new Error("Clipboard API not available.");
                }
                await navigator.clipboard.write([
                    new ClipboardItem({
                        [blob.type]: blob
                    })
                ]);
            }
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy content:', err);
            alert('Failed to copy to clipboard. Your browser might not support this feature or require permissions.');
        }
    }, [file, isCopied]);

    const handleDownload = useCallback(async () => {
        if (!file.dataUrl || isDownloading) return;
        
        if (isMermaidDiagram) {
            setIsDownloading(true);
            try {
                const base64Content = file.dataUrl.split(',')[1];
                const svgContent = decodeURIComponent(escape(atob(base64Content)));
                const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const filename = `${file.name.split('.')[0] || 'diagram'}.svg`;
                triggerDownload(url, filename, true);
            } catch (e) {
                console.error("Failed to download SVG:", e);
            } finally {
                setIsDownloading(false);
            }
            return;
        }

        setIsDownloading(true);
        try {
            triggerDownload(file.dataUrl, file.name, false);
        } catch (e) {
            console.error("Failed to initiate download:", e);
        } finally {
            setIsDownloading(false);
        }
    }, [file, isDownloading, isMermaidDiagram]);

    const floatingBarBase = "bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl transition-all duration-200";
    const actionButtonClass = "p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-40 disabled:cursor-not-allowed";

    return (
        <div className="absolute top-0 left-0 right-0 p-4 sm:p-6 flex flex-row items-start justify-between gap-3 z-50 pointer-events-none">
            {/* File Info */}
            <div className={`pointer-events-auto ${floatingBarBase} rounded-full pl-2 pr-4 py-1.5 flex items-center gap-3 min-w-0 max-w-[calc(100%-140px)] sm:max-w-md group/info`}>
                <div className="bg-white/10 p-1.5 rounded-full text-white/90 group-hover/info:bg-white/20 transition-colors flex-shrink-0">
                    <FileIcon size={16} strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex flex-col justify-center">
                    {isEditable && onNameChange ? (
                        <input 
                            type="text"
                            value={editedName}
                            onChange={(e) => onNameChange(e.target.value)}
                            className="bg-transparent border-b border-white/20 text-xs sm:text-sm font-medium text-white/90 focus:border-white/50 outline-none w-full"
                            placeholder="Filename"
                            autoFocus
                        />
                    ) : (
                        <span className="text-xs sm:text-sm font-medium text-white/90 truncate leading-tight" title={file.name}>{file.name}</span>
                    )}
                    
                    {!isEditable && (
                        <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-mono text-white/50 leading-none mt-0.5">
                            <span className="truncate max-w-[60px]">{file.type.split('/').pop()?.toUpperCase()}</span>
                            <span className="w-0.5 h-0.5 rounded-full bg-white/30 flex-shrink-0"></span>
                            <span className="whitespace-nowrap">{formatFileSize(file.size)}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Top Actions */}
            <div className={`pointer-events-auto ${floatingBarBase} rounded-full p-1 flex items-center gap-1 flex-shrink-0`}>
                {isEditable ? (
                    <button onClick={onSave} className={`${actionButtonClass} !text-green-400 hover:!bg-green-500/20`} title="Save Changes">
                        <Save size={18} strokeWidth={2} />
                    </button>
                ) : (
                    <>
                        {isText && onToggleEdit && (
                            <button onClick={onToggleEdit} className={actionButtonClass} title="Edit File">
                                <Edit3 size={18} strokeWidth={1.5} />
                            </button>
                        )}
                        <button onClick={handleCopy} disabled={isCopied} className={actionButtonClass} title={isCopied ? "Copied!" : "Copy Content"}>
                            {isCopied ? <Check size={18} className="text-green-400" strokeWidth={2} /> : <ClipboardCopy size={18} strokeWidth={1.5} />}
                        </button>
                        <button onClick={handleDownload} disabled={isDownloading} className={actionButtonClass} title={isMermaidDiagram ? "Download SVG" : "Download File"}>
                            {isDownloading ? <Loader2 size={18} className="animate-spin" strokeWidth={1.5}/> : <Download size={18} strokeWidth={1.5} />}
                        </button>
                    </>
                )}
                
                <div className="w-px h-5 bg-white/10 mx-1"></div>
                
                <button
                    onClick={isEditable && onToggleEdit ? onToggleEdit : onClose}
                    className={`${actionButtonClass} hover:bg-red-500/20 hover:text-red-400`}
                    aria-label={isEditable ? "Cancel Edit" : t('imageZoom_close_aria')}
                    title={isEditable ? "Cancel Edit" : t('imageZoom_close_title')}
                >
                    <X size={18} strokeWidth={1.5} />
                </button>
            </div>
        </div>
    );
};
