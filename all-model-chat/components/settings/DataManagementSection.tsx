import React from 'react';
import { DatabaseZap, Eraser, Trash2, FileText, DownloadCloud } from 'lucide-react';
import { getResponsiveValue } from '../../utils/appUtils';
import { PwaInstallStatus } from '../SettingsModal';

interface DataManagementSectionProps {
  onClearHistory: () => void;
  onClearCache: () => void;
  onOpenLogViewer: () => void;
  pwaInstallStatus: PwaInstallStatus;
  onInstallPwa: () => void;
  t: (key: string) => string;
}

export const DataManagementSection: React.FC<DataManagementSectionProps> = ({
  onClearHistory,
  onClearCache,
  onOpenLogViewer,
  pwaInstallStatus,
  onInstallPwa,
  t,
}) => {
  const iconSize = getResponsiveValue(14, 16);
  const buttonIconSize = getResponsiveValue(12, 14);

  const baseButtonClass = "px-3 sm:px-4 py-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-secondary)] flex items-center justify-center gap-2 text-sm font-medium w-full sm:w-auto";
  
  const getInstallButtonProps = () => {
    switch (pwaInstallStatus) {
      case 'installable':
        return { disabled: false, title: t('settingsInstallApp_available_title') };
      case 'installed':
        return { disabled: true, title: t('settingsInstallApp_installed_title') };
      case 'not_ready':
        return { disabled: true, title: t('settingsInstallApp_not_ready_title') };
      case 'not_supported':
        return { disabled: true, title: t('settingsInstallApp_not_supported_title') };
      case 'loading':
      default:
        return { disabled: true, title: t('settingsInstallApp_loading_title') };
    }
  };

  const { disabled: isInstallButtonDisabled, title: installButtonTitle } = getInstallButtonProps();

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
          className={`${baseButtonClass} bg-[var(--theme-bg-tertiary)] border border-transparent text-[var(--theme-text-tertiary)] hover:bg-[var(--theme-bg-input)] hover:text-[var(--theme-text-secondary)] focus:ring-[var(--theme-border-secondary)]`}
          title="Open Application Logs (Ctrl+Alt+L)"
          aria-label="Open Application Logs"
        >
          <FileText size={buttonIconSize} />
          <span>View Logs</span>
        </button>
        <button
          onClick={onInstallPwa}
          type="button"
          className={`${baseButtonClass} bg-[var(--theme-bg-tertiary)] border border-transparent text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-accent)] hover:text-[var(--theme-text-accent)] focus:ring-[var(--theme-bg-accent)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[var(--theme-bg-tertiary)] disabled:hover:text-[var(--theme-text-secondary)]`}
          aria-label={t('settingsInstallApp_aria')}
          disabled={isInstallButtonDisabled}
          title={installButtonTitle}
        >
          <DownloadCloud size={buttonIconSize} />
          <span>{t('settingsInstallApp')}</span>
        </button>
      </div>
    </div>
  );
};
