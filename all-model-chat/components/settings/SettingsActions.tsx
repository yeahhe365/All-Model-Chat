import React from 'react';
import { RotateCcw, Trash2, Ban, Save } from 'lucide-react';

interface SettingsActionsProps {
  onSave: () => void;
  onCancel: () => void;
  onReset: () => void;
  onClearCache: () => void;
  t: (key: string) => string;
}

export const SettingsActions: React.FC<SettingsActionsProps> = ({
  onSave,
  onCancel,
  onReset,
  onClearCache,
  t,
}) => {
  const actionButtonIconSize = window.innerWidth < 640 ? 12 : 14;

  return (
    <div className="mt-4 flex flex-col gap-3 pt-4 border-t border-[var(--theme-border-primary)] flex-shrink-0">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={onReset} type="button"
            className="flex-1 sm:flex-initial px-3 py-1.5 border border-[var(--theme-border-secondary)] hover:border-[var(--theme-border-primary)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-secondary)] flex items-center justify-center gap-1.5 text-sm"
            aria-label="Reset settings to default"
          >
            <RotateCcw size={actionButtonIconSize} />
            <span>{t('settingsReset')}</span>
          </button>
          <button
            onClick={onClearCache} type="button"
            className="flex-1 sm:flex-initial px-3 py-1.5 border border-[var(--theme-bg-danger)] text-[var(--theme-text-danger)] hover:bg-[var(--theme-bg-danger)] hover:bg-opacity-10 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-bg-danger)] flex items-center justify-center gap-1.5 text-sm"
            aria-label="Clear all cached application data"
          >
            <Trash2 size={actionButtonIconSize} />
            <span>{t('settingsClearCache')}</span>
          </button>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={onCancel} type="button"
            className="flex-1 sm:flex-initial px-4 py-1.5 bg-[var(--theme-bg-secondary)] hover:bg-[var(--theme-border-primary)] text-[var(--theme-text-primary)] rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-secondary)] flex items-center justify-center gap-1.5 text-sm"
          >
            <Ban size={actionButtonIconSize} />
            <span>{t('settingsCancel')}</span>
          </button>
          <button
            onClick={onSave} type="button"
            className="flex-1 sm:flex-initial px-4 py-1.5 bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-text-accent)] rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] flex items-center justify-center gap-1.5 text-sm"
          >
            <Save size={actionButtonIconSize} />
            <span>{t('settingsSave')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
