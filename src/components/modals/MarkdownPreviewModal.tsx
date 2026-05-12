import { logService } from '@/services/logService';
import React, { useCallback, useState } from 'react';
import { Check, ClipboardCopy, Download, Edit3, FileText, Save, X } from 'lucide-react';
import { type UploadedFile } from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import { Modal } from '@/components/shared/Modal';
import { MarkdownFileViewer } from '@/components/shared/file-preview/MarkdownFileViewer';
import { useSettingsStore } from '@/stores/settingsStore';
import { createManagedObjectUrl } from '@/services/objectUrlManager';
import { triggerDownload } from '@/utils/export/core';

interface MarkdownPreviewModalProps {
  file: UploadedFile | null;
  onClose: () => void;
  onSaveText?: (fileId: string, content: string, newName: string) => void;
  initialEditMode?: boolean;
}

const getDownloadUrl = (file: UploadedFile, content: string) => {
  if (file.dataUrl) return file.dataUrl;
  return createManagedObjectUrl(new Blob([content], { type: file.type || 'text/markdown' }));
};

export const MarkdownPreviewModal: React.FC<MarkdownPreviewModalProps> = ({
  file,
  onClose,
  onSaveText,
  initialEditMode = false,
}) => {
  const { t } = useI18n();
  const themeId = useSettingsStore((state) => state.currentTheme.id);
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [editedContent, setEditedContent] = useState(file?.textContent ?? '');
  const [loadedContent, setLoadedContent] = useState(file?.textContent ?? '');
  const [editedName, setEditedName] = useState(file?.name ?? '');
  const [isCopied, setIsCopied] = useState(false);

  const contentForActions = isEditing ? editedContent : loadedContent || file?.textContent || '';
  const savedContent = loadedContent || file?.textContent || '';
  const savedName = file?.name || '';
  const hasUnsavedChanges = isEditing && (editedContent !== savedContent || editedName !== savedName);

  const confirmDiscardChanges = useCallback(() => {
    if (!hasUnsavedChanges) return true;
    return window.confirm(t('filePreview_discard_unsaved_changes'));
  }, [hasUnsavedChanges, t]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(contentForActions);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 1500);
    } catch (error) {
      logService.error('Failed to copy markdown content:', error);
    }
  }, [contentForActions]);

  const handleDownload = useCallback(() => {
    if (!file) return;

    const url = getDownloadUrl(file, contentForActions);
    triggerDownload(url, isEditing ? editedName : file.name, !file.dataUrl);
  }, [contentForActions, editedName, file, isEditing]);

  const handleSave = useCallback(() => {
    if (!file || !onSaveText) return;

    onSaveText(file.id, editedContent, editedName);
    setLoadedContent(editedContent);
    setIsEditing(false);
  }, [editedContent, editedName, file, onSaveText]);

  const handleToggleEdit = useCallback(() => {
    if (!file) return;

    if (isEditing) {
      if (!confirmDiscardChanges()) return;
      setEditedName(file.name);
      setEditedContent(loadedContent || file.textContent || '');
      setIsEditing(false);
      return;
    }

    setEditedContent(loadedContent || file.textContent || '');
    setEditedName(file.name);
    setIsEditing(true);
  }, [confirmDiscardChanges, file, isEditing, loadedContent]);

  const handleClose = useCallback(() => {
    if (!confirmDiscardChanges()) return;
    onClose();
  }, [confirmDiscardChanges, onClose]);

  if (!file) return null;

  return (
    <Modal
      isOpen={true}
      onClose={handleClose}
      noPadding
      backdropClassName="bg-black/45 backdrop-blur-sm"
      contentClassName="w-[min(1200px,96vw)] h-[min(900px,94vh)]"
    >
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)] shadow-2xl">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)] px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--theme-bg-accent)]/10 text-[var(--theme-text-accent)]">
              <FileText size={20} />
            </div>
            <div className="min-w-0">
              {isEditing ? (
                <input
                  value={editedName}
                  onChange={(event) => setEditedName(event.target.value)}
                  className="w-full rounded-lg border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-secondary)] px-2 py-1 text-sm font-semibold outline-none focus:border-[var(--theme-border-focus)]"
                  placeholder={t('filePreview_filename_placeholder')}
                />
              ) : (
                <h2 className="truncate text-sm font-semibold sm:text-base">{file.name}</h2>
              )}
              <p className="text-xs text-[var(--theme-text-tertiary)]">{t('markdownPreview_document')}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {isEditing && onSaveText ? (
              <button
                type="button"
                onClick={handleSave}
                className="rounded-lg bg-[var(--theme-bg-accent)] px-3 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                <Save size={16} className="mr-1.5 inline" /> {t('filePreview_save_changes')}
              </button>
            ) : onSaveText ? (
              <button
                type="button"
                onClick={handleToggleEdit}
                className="rounded-lg border border-[var(--theme-border-secondary)] px-3 py-2 text-sm text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"
              >
                <Edit3 size={16} className="mr-1.5 inline" /> {t('filePreview_edit_file')}
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-lg border border-[var(--theme-border-secondary)] p-2 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"
              title={t('filePreview_copy_content')}
            >
              {isCopied ? <Check size={18} className="text-green-500" /> : <ClipboardCopy size={18} />}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="rounded-lg border border-[var(--theme-border-secondary)] p-2 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"
              title={t('filePreview_download_file')}
            >
              <Download size={18} />
            </button>
            <button
              type="button"
              onClick={isEditing ? handleToggleEdit : handleClose}
              className="rounded-lg border border-[var(--theme-border-secondary)] p-2 text-[var(--theme-text-secondary)] hover:border-red-400/60 hover:text-red-500"
              title={isEditing ? t('filePreview_cancel_edit') : t('imageZoom_close_title')}
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1">
          <MarkdownFileViewer
            file={file}
            content={isEditing ? editedContent : undefined}
            themeId={themeId}
            isEditable={isEditing}
            onChange={setEditedContent}
            onLoad={(content) => {
              setLoadedContent(content);
              if (!editedContent) setEditedContent(content);
            }}
          />
        </div>
      </div>
    </Modal>
  );
};
