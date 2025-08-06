import React, { useRef } from 'react';
import { translations } from '../../utils/appUtils';
import { Settings, MessageSquare, Bot, AlertTriangle } from 'lucide-react';

interface DataManagementSectionProps {
  onClearHistory: () => void;
  onClearCache: () => void;
  onOpenLogViewer: () => void;
  isInstallable: boolean;
  onInstallPwa: () => void;
  onImportSettings: (file: File) => void;
  onExportSettings: () => void;
  onImportHistory: (file: File) => void;
  onExportHistory: () => void;
  onImportScenarios: (file: File) => void;
  onExportScenarios: () => void;
  onReset: () => void;
  t: (key: keyof typeof translations) => string;
}

const ActionRow: React.FC<{ label: string; children: React.ReactNode; labelClassName?: string }> = ({ label, children, labelClassName }) => (
    <div className="flex items-center justify-between py-3">
        <span className={`text-sm ${labelClassName || 'text-[var(--theme-text-primary)]'}`}>{label}</span>
        <div className="flex-shrink-0 ml-4">{children}</div>
    </div>
);

const DataGroup: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="p-3 sm:p-4 rounded-lg bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)]">
        <h4 className="text-sm font-semibold text-[var(--theme-text-primary)] flex items-center mb-1">
            {icon}
            {title}
        </h4>
        <div className="divide-y divide-[var(--theme-border-secondary)]">
            {children}
        </div>
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
  onImportHistory,
  onExportHistory,
  onImportScenarios,
  onExportScenarios,
  onReset,
  t,
}) => {
  const settingsImportRef = useRef<HTMLInputElement>(null);
  const historyImportRef = useRef<HTMLInputElement>(null);
  const scenariosImportRef = useRef<HTMLInputElement>(null);

  const baseButtonClass = "px-4 py-1.5 text-sm font-medium rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-secondary)] border";
  const dangerButtonClass = "px-4 py-1.5 text-sm font-medium rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 border bg-transparent border-white/50 text-white hover:bg-white/20 focus:ring-white focus:ring-offset-[var(--theme-bg-danger)]";

  const handleFileImport = (ref: React.RefObject<HTMLInputElement>, handler: (file: File) => void) => {
    const file = ref.current?.files?.[0];
    if (file) handler(file);
    if (ref.current) ref.current.value = "";
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-[var(--theme-text-primary)] flex items-center mb-4">
        {t('settingsDataManagement')}
      </h3>
      
      <div className="space-y-4">
          <DataGroup title="Settings" icon={<Settings size={14} className="mr-2 text-[var(--theme-text-link)]" />}>
              <ActionRow label={t('settingsImportConfig')}>
                  <button onClick={() => settingsImportRef.current?.click()} type="button" className={`${baseButtonClass} bg-transparent border-[var(--theme-border-secondary)] text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] hover:border-[var(--theme-bg-tertiary)] focus:ring-[var(--theme-border-secondary)]`}>{t('import')}</button>
                  <input type="file" ref={settingsImportRef} onChange={() => handleFileImport(settingsImportRef, onImportSettings)} accept=".json" className="hidden" />
              </ActionRow>
              <ActionRow label={t('settingsExportSettingsOnly')}>
                  <button onClick={onExportSettings} type="button" className={`${baseButtonClass} bg-transparent border-[var(--theme-border-secondary)] text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] hover:border-[var(--theme-bg-tertiary)] focus:ring-[var(--theme-border-secondary)]`}>{t('export')}</button>
              </ActionRow>
          </DataGroup>
          
          <DataGroup title="Chat History" icon={<MessageSquare size={14} className="mr-2 text-[var(--theme-text-link)]" />}>
              <ActionRow label={t('settingsImportHistory')}>
                  <button onClick={() => historyImportRef.current?.click()} type="button" className={`${baseButtonClass} bg-transparent border-[var(--theme-border-secondary)] text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] hover:border-[var(--theme-bg-tertiary)] focus:ring-[var(--theme-border-secondary)]`}>{t('import')}</button>
                  <input type="file" ref={historyImportRef} onChange={() => handleFileImport(historyImportRef, onImportHistory)} accept=".json" className="hidden" />
              </ActionRow>
              <ActionRow label={t('settingsExportHistory')}>
                  <button onClick={onExportHistory} type="button" className={`${baseButtonClass} bg-transparent border-[var(--theme-border-secondary)] text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] hover:border-[var(--theme-bg-tertiary)] focus:ring-[var(--theme-border-secondary)]`}>{t('export')}</button>
              </ActionRow>
          </DataGroup>
          
          <DataGroup title="Scenarios" icon={<Bot size={14} className="mr-2 text-[var(--theme-text-link)]" />}>
              <ActionRow label={t('settingsImportScenarios')}>
                  <button onClick={() => scenariosImportRef.current?.click()} type="button" className={`${baseButtonClass} bg-transparent border-[var(--theme-border-secondary)] text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] hover:border-[var(--theme-bg-tertiary)] focus:ring-[var(--theme-border-secondary)]`}>{t('import')}</button>
                  <input type="file" ref={scenariosImportRef} onChange={() => handleFileImport(scenariosImportRef, onImportScenarios)} accept=".json" className="hidden" />
              </ActionRow>
              <ActionRow label={t('settingsExportScenarios')}>
                  <button onClick={onExportScenarios} type="button" className={`${baseButtonClass} bg-transparent border-[var(--theme-border-secondary)] text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] hover:border-[var(--theme-bg-tertiary)] focus:ring-[var(--theme-border-secondary)]`}>{t('export')}</button>
              </ActionRow>
          </DataGroup>
          
           <DataGroup title="General" icon={<Settings size={14} className="mr-2 text-[var(--theme-text-link)]" />}>
              <ActionRow label={t('settingsViewLogs')}>
                <button onClick={onOpenLogViewer} type="button" className={`${baseButtonClass} bg-transparent border-[var(--theme-border-secondary)] text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] hover:border-[var(--theme-bg-tertiary)] focus:ring-[var(--theme-border-secondary)]`}>{t('settingsViewLogs')}</button>
              </ActionRow>
              <ActionRow label={t('settingsInstallApp')}>
                <button onClick={onInstallPwa} type="button" disabled={!isInstallable} className={`${baseButtonClass} bg-transparent border-[var(--theme-border-secondary)] text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] hover:border-[var(--theme-bg-tertiary)] focus:ring-[var(--theme-border-secondary)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent`}>{t('settingsInstallApp')}</button>
              </ActionRow>
          </DataGroup>

          <div className="p-3 sm:p-4 rounded-lg bg-[var(--theme-bg-danger)]">
              <h4 className="text-sm font-semibold text-white flex items-center mb-1">
                  <AlertTriangle size={14} className="mr-2"/>
                  Danger Zone
              </h4>
              <div className="divide-y divide-white/20">
                  <ActionRow label={t('settingsReset')} labelClassName="text-white">
                      <button onClick={onReset} type="button" className={dangerButtonClass}>{t('settingsReset')}</button>
                  </ActionRow>
                  <ActionRow label={t('settingsClearHistory')} labelClassName="text-white">
                      <button onClick={onClearHistory} type="button" className={dangerButtonClass}>{t('settingsClearHistory')}</button>
                  </ActionRow>
                  <ActionRow label={t('settingsClearCache')} labelClassName="text-white">
                      <button onClick={onClearCache} type="button" className={dangerButtonClass}>{t('settingsClearCache')}</button>
                  </ActionRow>
              </div>
          </div>
      </div>
    </div>
  );
};