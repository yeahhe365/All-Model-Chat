import React from 'react';
import { CornerDownLeft, Trash2 } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { FOCUS_VISIBLE_RING_INPUT_OFFSET_CLASS, SMALL_ICON_DANGER_BUTTON_CLASS } from '@/constants/appConstants';

interface QueuedSubmissionCardProps {
  title: string;
  previewText: string;
  fileCount: number;
  onEdit: () => void;
  onRemove: () => void;
}

export const QueuedSubmissionCard: React.FC<QueuedSubmissionCardProps> = ({
  title,
  previewText,
  fileCount,
  onEdit,
  onRemove,
}) => {
  const { t } = useI18n();
  const attachmentLabel =
    fileCount > 0
      ? `${fileCount} ${t(fileCount > 1 ? 'queuedSubmission_attachments' : 'queuedSubmission_attachment')}`
      : null;

  return (
    <div
      data-queued-submission-card="composer-strip"
      className="flex min-h-14 items-start justify-between gap-2 rounded-[24px] border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)]/85 px-3 pb-4 pt-2 text-sm shadow-[0_4px_14px_rgba(15,23,42,0.08)] backdrop-blur-sm"
    >
      <button
        type="button"
        onClick={onEdit}
        className={`flex min-w-0 flex-1 items-center gap-2 rounded-full px-1.5 py-1 text-left text-[var(--theme-text-secondary)] transition-colors hover:bg-[var(--theme-bg-tertiary)]/55 ${FOCUS_VISIBLE_RING_INPUT_OFFSET_CLASS}`}
        aria-label={`${t('queuedSubmission_edit')}: ${title}`}
        title={t('queuedSubmission_edit')}
      >
        <CornerDownLeft size={13} strokeWidth={2} className="flex-shrink-0 text-[var(--theme-text-tertiary)]" />
        <span data-testid="queued-submission-preview" className="min-w-0 truncate">
          {previewText}
        </span>
        {attachmentLabel ? (
          <span className="hidden flex-shrink-0 rounded-full bg-[var(--theme-bg-tertiary)] px-2 py-0.5 text-xs text-[var(--theme-text-tertiary)] sm:inline">
            {attachmentLabel}
          </span>
        ) : null}
      </button>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onEdit}
          className={`inline-flex h-7 items-center gap-1 rounded-full px-2 text-xs font-medium text-[var(--theme-text-tertiary)] transition-colors hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-primary)] ${FOCUS_VISIBLE_RING_INPUT_OFFSET_CLASS}`}
          aria-label={t('queuedSubmission_edit')}
          title={t('queuedSubmission_edit')}
        >
          <CornerDownLeft size={13} strokeWidth={2} />
          <span>{t('queuedSubmission_action')}</span>
        </button>
        <button
          type="button"
          onClick={onRemove}
          className={`${SMALL_ICON_DANGER_BUTTON_CLASS} rounded-full`}
          aria-label={t('queuedSubmission_remove')}
          title={t('queuedSubmission_remove')}
        >
          <Trash2 size={14} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
};
