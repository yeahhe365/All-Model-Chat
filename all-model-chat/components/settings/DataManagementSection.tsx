import React, { useRef } from 'react';
import { translations } from '../../utils/appUtils';

interface DataManagementSectionProps {
  onClearHistory: () => void;
  onClearCache: () => void;
  onOpenLogViewer: () => void;
  isInstallable: boolean;
  onInstallPwa: () => void;
  onImportSettings: (file: File) => void;
  onExportSettings: (includeHistory: boolean) => void;
  onReset: () => void;
  t: (key: keyof typeof translations) => string;
}

const ActionRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="flex items-center justify-between py-4 border-b border-[var(--theme-border-primary)] last:border-b-0">
        <span className="text-sm text-[var(--theme-text-primary)]">{label}</span>
        <div className="flex-shrink-0 ml-4">{children}</div>
    </div>
);


export const DataManagementSection: React.FC<DataManagementSectionProps> = ({
  onClearHistory,
  onClearCache,
  onOpenLogViewer,
  isInstallable,
  onInstallPwa,
  onImportSettings,
  onExportSettings,
  onReset,
  t,
}) => {
  const importInputRef = useRef<HTMLInputElement>(null);

  const baseButtonClass = "px-4 py-1.5 text-sm font-medium rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-secondary)] border";

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImportSettings(file);
    }
    if (importInputRef.current) {
      importInputRef.current.value = "";
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-[var(--theme-text-primary)] flex items-center mb-4">
        {t('settingsDataManagement')}
      </h3>
      
      <div className="space-y-0">
          <ActionRow label={t('settingsImportConfig')}>
            <button
              onClick={handleImportClick}
              type="button"
              className={`${baseButtonClass} bg-transparent border-[var(--theme-border-secondary)] text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] hover:border-[var(--theme-bg-tertiary)] focus:ring-[var(--theme-border-secondary)]`}
            >
              {t('import')}
            </button>
            <input type="file" ref={importInputRef} onChange={handleFileImport} accept=".json" className="hidden" />
          </ActionRow>

          <ActionRow label={t('settingsExportSettingsOnly')}>
            <button
              onClick={() => onExportSettings(false)}
              type="button"
              className={`${baseButtonClass} bg-transparent border-[var(--theme-border-secondary)] text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] hover:border-[var(--theme-bg-tertiary)] focus:ring-[var(--theme-border-secondary)]`}
            >
              {t('export')}
            </button>
          </ActionRow>

          <ActionRow label={t('settingsExportAllData')}>
            <button
              onClick={() => onExportSettings(true)}
              type="button"
              className={`${baseButtonClass} bg-transparent border-[var(--theme-border-secondary)] text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] hover:border-[var(--theme-bg-tertiary)] focus:ring-[var(--theme-border-secondary)]`}
            >
              {t('export')}
            </button>
          </ActionRow>

          <ActionRow label={t('settingsViewLogs')}>
            <button
              onClick={onOpenLogViewer}
              type="button"
              className={`${baseButtonClass} bg-transparent border-[var(--theme-border-secondary)] text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] hover:border-[var(--theme-bg-tertiary)] focus:ring-[var(--theme-border-secondary)]`}
            >
              {t('settingsViewLogs')}
            </button>
          </ActionRow>

          <ActionRow label={t('settingsInstallApp')}>
            <button
              onClick={onInstallPwa}
              type="button"
              disabled={!isInstallable}
              className={`${baseButtonClass} bg-transparent border-[var(--theme-border-secondary)] text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] hover:border-[var(--theme-bg-tertiary)] focus:ring-[var(--theme-border-secondary)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent`}
            >
              {t('settingsInstallApp')}
            </button>
          </ActionRow>

           <ActionRow label={t('settingsReset')}>
              <button
                onClick={onReset}
                type="button"
                className={`${baseButtonClass} bg-transparent border-[var(--theme-text-warning)] text-[var(--theme-text-warning)] hover:bg-[var(--theme-text-warning)] hover:text-[var(--theme-bg-primary)] focus:ring-[var(--theme-text-warning)]`}
              >
              {t('settingsReset')}
              </button>
          </ActionRow>

          <ActionRow label={t('settingsClearHistory')}>
              <button
                onClick={onClearHistory}
                type="button"
                className={`${baseButtonClass} bg-transparent border-[var(--theme-bg-danger)] text-[var(--theme-bg-danger)] hover:bg-[var(--theme-bg-danger)] hover:text-[var(--theme-text-accent)] focus:ring-[var(--theme-bg-danger)]`}
              >
              {t('settingsClearHistory')}
              </button>
          </ActionRow>
          
          <ActionRow label={t('settingsClearCache')}>
              <button
                onClick={onClearCache}
                type="button"
                className={`${baseButtonClass} bg-transparent border-[var(--theme-bg-danger)] text-[var(--theme-bg-danger)] hover:bg-[var(--theme-bg-danger)] hover:text-[var(--theme-text-accent)] focus:ring-[var(--theme-bg-danger)]`}
              >
              {t('settingsClearCache')}
              </button>
          </ActionRow>
      </div>
    </div>
  );
};