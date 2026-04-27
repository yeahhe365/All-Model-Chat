import React, { useState, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import {
  X,
  Check,
  Download,
  ClipboardCopy,
  Loader2,
  FileText,
  ImageIcon,
  FileVideo,
  FileAudio,
  FileCode2,
  Save,
  Edit3,
} from 'lucide-react';
import { UploadedFile } from '../../../types';
import { useI18n } from '../../../contexts/I18nContext';
import { triggerDownload } from '../../../utils/export/core';
import { SUPPORTED_IMAGE_MIME_TYPES } from '../../../constants/fileConstants';
import { copyFileToClipboard, formatFileSize } from '../../../utils/fileHelpers';
import { FloatingToolbar, ToolbarButton, ToolbarDivider } from './FloatingToolbar';

interface FilePreviewHeaderProps {
  file: UploadedFile;
  onClose: () => void;
  isEditable?: boolean;
  onToggleEdit?: () => void;
  onSave?: () => void;
  editedName?: string;
  onNameChange?: (name: string) => void;
}

export interface FilePreviewHeaderHandle {
  showCopyFeedback: () => void;
}

export const FilePreviewHeader = React.forwardRef<FilePreviewHeaderHandle, FilePreviewHeaderProps>(
  ({ file, onClose, isEditable = false, onToggleEdit, onSave, editedName, onNameChange }, ref) => {
    const { t } = useI18n();
    const [isDownloading, setIsDownloading] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const copyFeedbackTimeoutRef = useRef<number | null>(null);

    const isImage = SUPPORTED_IMAGE_MIME_TYPES.includes(file.type) || file.type === 'image/svg+xml';
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');
    const isMermaidDiagram = file.type === 'image/svg+xml';
    const isText = !isImage && !isPdf && !isVideo && !isAudio;

    const FileIcon = isImage ? ImageIcon : isPdf ? FileText : isVideo ? FileVideo : isAudio ? FileAudio : FileCode2;

    const showCopyFeedback = useCallback(() => {
      setIsCopied(true);

      if (copyFeedbackTimeoutRef.current !== null) {
        window.clearTimeout(copyFeedbackTimeoutRef.current);
      }

      copyFeedbackTimeoutRef.current = window.setTimeout(() => {
        setIsCopied(false);
        copyFeedbackTimeoutRef.current = null;
      }, 2000);
    }, []);

    useImperativeHandle(ref, () => ({ showCopyFeedback }), [showCopyFeedback]);

    useEffect(() => {
      return () => {
        if (copyFeedbackTimeoutRef.current !== null) {
          window.clearTimeout(copyFeedbackTimeoutRef.current);
        }
      };
    }, []);

    const handleCopy = useCallback(async () => {
      if (!file.dataUrl || isCopied) return;
      try {
        await copyFileToClipboard(file);
        showCopyFeedback();
      } catch (err) {
        console.error('Failed to copy content:', err);
        alert(t('filePreview_copy_failed'));
      }
    }, [file, isCopied, showCopyFeedback, t]);

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
          console.error('Failed to download SVG:', e);
        } finally {
          setIsDownloading(false);
        }
        return;
      }

      setIsDownloading(true);
      try {
        triggerDownload(file.dataUrl, file.name, false);
      } catch (e) {
        console.error('Failed to initiate download:', e);
      } finally {
        setIsDownloading(false);
      }
    }, [file, isDownloading, isMermaidDiagram]);

    return (
      <div className="absolute top-0 left-0 right-0 p-4 sm:p-6 flex flex-row items-start justify-between gap-3 z-50 pointer-events-none">
        {/* File Info */}
        <FloatingToolbar className="pointer-events-auto pl-2 pr-4 py-1.5 max-w-[calc(100%-140px)] sm:max-w-md group/info">
          <div className="bg-white/10 p-1.5 rounded-full text-white/90 group-hover/info:bg-white/20 transition-colors flex-shrink-0">
            <FileIcon size={16} strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex flex-col justify-center ml-2">
            {isEditable && onNameChange ? (
              <input
                type="text"
                value={editedName}
                onChange={(e) => onNameChange(e.target.value)}
                className="bg-transparent border-b border-white/20 text-xs sm:text-sm font-medium text-white/90 focus:border-white/50 outline-none w-full"
                placeholder={t('filePreview_filename_placeholder')}
                autoFocus
              />
            ) : (
              <span className="text-xs sm:text-sm font-medium text-white/90 truncate leading-tight" title={file.name}>
                {file.name}
              </span>
            )}

            {!isEditable && (
              <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-mono text-white/50 leading-none mt-0.5">
                <span className="truncate max-w-[60px]">{file.type.split('/').pop()?.toUpperCase()}</span>
                <span className="w-0.5 h-0.5 rounded-full bg-white/30 flex-shrink-0"></span>
                <span className="whitespace-nowrap">{formatFileSize(file.size)}</span>
              </div>
            )}
          </div>
        </FloatingToolbar>

        {/* Top Actions */}
        <FloatingToolbar className="pointer-events-auto p-1">
          {isEditable ? (
            <ToolbarButton
              onClick={onSave}
              className="!text-green-400 hover:!bg-green-500/20"
              title={t('filePreview_save_changes')}
            >
              <Save size={18} strokeWidth={2} />
            </ToolbarButton>
          ) : (
            <>
              {isText && onToggleEdit && (
                <ToolbarButton onClick={onToggleEdit} title={t('filePreview_edit_file')}>
                  <Edit3 size={18} strokeWidth={1.5} />
                </ToolbarButton>
              )}
              <ToolbarButton
                onClick={handleCopy}
                disabled={isCopied}
                title={isCopied ? t('copied_button_title') : t('filePreview_copy_content')}
              >
                {isCopied ? (
                  <Check size={18} className="text-green-400" strokeWidth={2} />
                ) : (
                  <ClipboardCopy size={18} strokeWidth={1.5} />
                )}
              </ToolbarButton>
              <ToolbarButton
                onClick={handleDownload}
                disabled={isDownloading}
                title={isMermaidDiagram ? t('filePreview_download_svg') : t('filePreview_download_file')}
              >
                {isDownloading ? (
                  <Loader2 size={18} className="animate-spin" strokeWidth={1.5} />
                ) : (
                  <Download size={18} strokeWidth={1.5} />
                )}
              </ToolbarButton>
            </>
          )}

          <ToolbarDivider />

          <ToolbarButton
            onClick={isEditable && onToggleEdit ? onToggleEdit : onClose}
            danger
            aria-label={isEditable ? t('filePreview_cancel_edit') : t('imageZoom_close_aria')}
            title={isEditable ? t('filePreview_cancel_edit') : t('imageZoom_close_title')}
          >
            <X size={18} strokeWidth={1.5} />
          </ToolbarButton>
        </FloatingToolbar>
      </div>
    );
  },
);

FilePreviewHeader.displayName = 'FilePreviewHeader';
