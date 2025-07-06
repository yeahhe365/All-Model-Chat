import React from 'react';
import { RotateCcw, Save, FileText } from 'lucide-react';

interface SettingsActionsProps {
  onSave: () => void;
  onCancel: () => void;
  onReset: () => void;
  onOpenLogViewer: () => void;
  t: (key: string) => string;
}

export const SettingsActions: React.FC<SettingsActionsProps> = ({
  onSave,
  onCancel,
  onReset,
  onOpenLogViewer,
  t,
}) => {
  const actionButtonIconSize = window.innerWidth < 640 ? 12 : 14;

  const baseButtonClass = "px-3 sm:px-4 py-1.5 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-primary)] flex items-center justify-center gap-1.5 text-sm font-medium";

  return (
    <div className="mt-5 flex-shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[var(--theme-border-primary)]">
      {/* Left side: Destructive/Advanced Actions */}
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <button
          onClick={onReset}
          type="button"
          className={`${baseButtonClass} flex-1 sm:flex-initial border border-transparent text-[var(--theme-text-tertiary)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-secondary)] focus:ring-[var(--theme-border-secondary)]`}
          aria-label="Reset settings to default"
        >
          <RotateCcw size={actionButtonIconSize} />
          <span>{t('settingsReset')}</span>
        </button>
        <button
          onClick={onOpenLogViewer}
          type="button"
          className={`${baseButtonClass} flex-1 sm:flex-initial border border-transparent text-[var(--theme-text-tertiary)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-secondary)] focus:ring-[var(--theme-border-secondary)]`}
          aria-label="Open Application Logs (Ctrl+Alt+L)"
        >
          <FileText size={actionButtonIconSize} />
          <span>Logs</span>
        </button>
      </div>

      {/* Right side: Primary Actions */}
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <button
          onClick={onCancel}
          type="button"
          className={`${baseButtonClass} flex-1 sm:flex-initial bg-[var(--theme-bg-secondary)] hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] border border-[var(--theme-border-secondary)] focus:ring-[var(--theme-border-secondary)]`}
        >
          {/* No icon for Cancel to make it less prominent */}
          <span>{t('settingsCancel')}</span>
        </button>
        <button
          onClick={onSave}
          type="button"
          className={`${baseButtonClass} flex-1 sm:flex-initial bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-text-accent)] focus:ring-[var(--theme-border-focus)] shadow-sm hover:shadow-md`}
        >
          <Save size={actionButtonIconSize} />
          <span>{t('settingsSave')}</span>
        </button>
      </div>
    </div>
  );
};
