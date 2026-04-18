import React from 'react';
import { Clock3, PencilLine, Trash2 } from 'lucide-react';

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
  const attachmentLabel =
    fileCount > 0 ? `${fileCount} attachment${fileCount > 1 ? 's' : ''}` : null;

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
          className="rounded-full p-1.5 text-[var(--theme-text-tertiary)] transition-colors hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-primary)]"
          aria-label="Edit queued message"
          title="Edit queued message"
        >
          <PencilLine size={14} strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-full p-1.5 text-[var(--theme-text-tertiary)] transition-colors hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-danger)]"
          aria-label="Remove queued message"
          title="Remove queued message"
        >
          <Trash2 size={14} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
};
