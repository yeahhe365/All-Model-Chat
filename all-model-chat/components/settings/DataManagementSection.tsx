import React from 'react';
import { DatabaseZap, Eraser, Trash2 } from 'lucide-react';
import { getResponsiveValue } from '../../utils/appUtils';

interface DataManagementSectionProps {
  onClearHistory: () => void;
  onClearCache: () => void;
  t: (key: string) => string;
}

export const DataManagementSection: React.FC<DataManagementSectionProps> = ({
  onClearHistory,
  onClearCache,
  t,
}) => {
  const iconSize = getResponsiveValue(14, 16);
  const buttonIconSize = getResponsiveValue(12, 14);

  const baseButtonClass = "px-3 sm:px-4 py-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-secondary)] flex items-center justify-center gap-2 text-sm font-medium w-full sm:w-auto";

  return (
    <div className="space-y-3 p-3 sm:p-4 border border-[var(--theme-border-secondary)] rounded-lg bg-[var(--theme-bg-secondary)]">
      <h3 className="text-sm font-semibold text-[var(--theme-text-primary)] flex items-center mb-2">
        <DatabaseZap size={iconSize} className="mr-2 text-[var(--theme-text-link)] opacity-80" />
        {t('settingsDataManagement')}
      </h3>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onClearHistory}
          type="button"
          className={`${baseButtonClass} bg-[var(--theme-bg-tertiary)] border border-transparent text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-danger)] hover:text-[var(--theme-text-danger)] focus:ring-[var(--theme-bg-danger)]`}
          aria-label={t('settingsClearHistory_aria')}
        >
          <Eraser size={buttonIconSize} />
          <span>{t('settingsClearHistory')}</span>
        </button>
        <button
          onClick={onClearCache}
          type="button"
          className={`${baseButtonClass} bg-[var(--theme-bg-tertiary)] border border-transparent text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-danger)] hover:text-[var(--theme-text-danger)] focus:ring-[var(--theme-bg-danger)]`}
          aria-label={t('settingsClearCache_aria')}
        >
          <Trash2 size={buttonIconSize} />
          <span>{t('settingsClearCache')}</span>
        </button>
      </div>
    </div>
  );
};
