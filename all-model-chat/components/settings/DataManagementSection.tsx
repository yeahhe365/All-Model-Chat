import React, { useRef } from 'react';
import { DatabaseZap, Eraser, Trash2, FileText, DownloadCloud, Upload, Download } from 'lucide-react';
import { getResponsiveValue } from '../../utils/appUtils';

interface DataManagementSectionProps {
  onClearHistory: () => void;
  onClearCache: () => void;
  onOpenLogViewer: () => void;
  isInstallable: boolean;
  onInstallPwa: () => void;
  onImportSettings: (file: File) => void;
  onExportSettings: (includeHistory: boolean) => void;
  t: (key: string) => string;
}

export const DataManagementSection: React.FC<DataManagementSectionProps> = ({
  onClearHistory,
  onClearCache,
  onOpenLogViewer,
  isInstallable,
  onInstallPwa,
  onImportSettings,
  onExportSettings,
  t,
}) => {
  const iconSize = getResponsiveValue(14, 16);
  const buttonIconSize = getResponsiveValue(12, 14);
  const importInputRef = useRef<HTMLInputElement>(null);

  const baseButtonClass = "px-3 sm:px-4 py-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-secondary)] flex items-center justify-center gap-2 text-sm font-medium w-full sm:w-auto";

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
    <div className="space-y-3 p-3 sm:p-4 border border-[var(--theme-border-secondary)] rounded-lg bg-[var(--theme-bg-secondary)]">
      <h3 className="text-sm font-semibold text-[var(--theme-text-primary)] flex items-center mb-2">
        <DatabaseZap size={iconSize} className="mr-2 text-[var(--theme-text-link)] opacity-80" />
        {t('settingsDataManagement')}
      </h3>
      <div className="flex flex-col sm:flex-row flex-wrap gap-3">
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
         <button
          onClick={onOpenLogViewer}
          type="button"
          className={`${baseButtonClass} bg-[var(--theme-bg-tertiary)] border border-transparent text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-input)] hover:text-[var(--theme-text-primary)] focus:ring-[var(--theme-border-secondary)]`}
          title={t('settingsViewLogs_title')}
          aria-label={t('settingsViewLogs_aria')}
        >
          <FileText size={buttonIconSize} />
          <span>{t('settingsViewLogs')}</span>
        </button>
        <button
          onClick={onInstallPwa}
          type="button"
          className={`${baseButtonClass} bg-[var(--theme-bg-tertiary)] border border-transparent text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-accent)] hover:text-[var(--theme-text-accent)] focus:ring-[var(--theme-bg-accent)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[var(--theme-bg-tertiary)] disabled:hover:text-[var(--theme-text-secondary)]`}
          aria-label={t('settingsInstallApp_aria')}
          disabled={!isInstallable}
          title={isInstallable ? t('settingsInstallApp_available_title') : t('settingsInstallApp_unavailable_title')}
        >
          <DownloadCloud size={buttonIconSize} />
          <span>{t('settingsInstallApp')}</span>
        </button>
        <button
          onClick={handleImportClick}
          type="button"
          className={`${baseButtonClass} bg-[var(--theme-bg-tertiary)] border border-transparent text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-input)] hover:text-[var(--theme-text-primary)] focus:ring-[var(--theme-border-secondary)]`}
          aria-label={t('settingsImportConfig_aria')}
        >
          <Upload size={buttonIconSize} />
          <span>{t('settingsImportConfig')}</span>
        </button>
        <input type="file" ref={importInputRef} onChange={handleFileImport} accept=".json" className="hidden" />
        <button
          onClick={() => onExportSettings(false)}
          type="button"
          className={`${baseButtonClass} bg-[var(--theme-bg-tertiary)] border border-transparent text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-input)] hover:text-[var(--theme-text-primary)] focus:ring-[var(--theme-border-secondary)]`}
          aria-label={t('settingsExportSettingsOnly_aria')}
          title={t('settingsExportSettingsOnly_tooltip')}
        >
          <Download size={buttonIconSize} />
          <span>{t('settingsExportSettingsOnly')}</span>
        </button>
        <button
          onClick={() => onExportSettings(true)}
          type="button"
          className={`${baseButtonClass} bg-[var(--theme-bg-tertiary)] border border-transparent text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-input)] hover:text-[var(--theme-text-primary)] focus:ring-[var(--theme-border-secondary)]`}
          aria-label={t('settingsExportAllData_aria')}
          title={t('settingsExportAllData_tooltip')}
        >
          <Download size={buttonIconSize} />
          <span>{t('settingsExportAllData')}</span>
        </button>
      </div>
    </div>
  );
};