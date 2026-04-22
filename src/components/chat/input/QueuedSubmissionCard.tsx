import React from 'react';
import { Clock3, PencilLine, Trash2 } from 'lucide-react';
import { useI18n } from '../../../contexts/I18nContext';
import { SMALL_ICON_BUTTON_ROUND_CLASS, SMALL_ICON_DANGER_BUTTON_CLASS } from '../../../constants/appConstants';

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
    fileCount > 0 ? `${fileCount} ${t(fileCount > 1 ? 'queuedSubmission_attachments' : 'queuedSubmission_attachment')}` : null;

  return (
    <div className="flex items-start justify-between gap-3 rounded-[20px] border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-secondary)]/70 px-3 py-2.5 shadow-sm">
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2 text-xs font-medium text-[var(--theme-text-tertiary)]">
          <Clock3 size={12} strokeWidth={2} />
          <span>{title}</span>
        </div>
        <p className="line-clamp-2 whitespace-pre-wrap break-words text-sm text-[var(--theme-text-primary)]">
          {previewText}
        </p>
        {attachmentLabel ? (
          <div className="mt-1 text-xs text-[var(--theme-text-tertiary)]">{attachmentLabel}</div>
        ) : null}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onEdit}
          className={SMALL_ICON_BUTTON_ROUND_CLASS}
          aria-label={t('queuedSubmission_edit')}
          title={t('queuedSubmission_edit')}
        >
          <PencilLine size={14} strokeWidth={2} />
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
