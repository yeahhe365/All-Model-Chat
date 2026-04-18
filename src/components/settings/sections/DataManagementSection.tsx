
import React, { useRef } from 'react';
import { useI18n } from '../../../contexts/I18nContext';
import { Settings, MessageSquare, Bot, AlertTriangle, Upload, Download, Trash2, Database, RefreshCw } from 'lucide-react';
import type { LogViewerProps } from '../../log-viewer/LogViewer';
import type { PwaInstallState } from '../../../pwa/install';

interface DataManagementSectionProps {
  onClearHistory: () => void;
  onClearCache: () => void;
  onOpenLogViewer: (state?: Pick<LogViewerProps, 'initialTab' | 'initialUsageTab'>) => void;
  onClearLogs: () => void;
  installState: PwaInstallState;
  onInstallPwa: () => void;
  onImportSettings: (file: File) => void;
  onExportSettings: () => void;
  onImportHistory: (file: File) => void;
  onExportHistory: () => void;
  onImportScenarios: (file: File) => void;
  onExportScenarios: () => void;
  onReset: () => void;
}

const ActionRow: React.FC<{ 
    label: string; 
    children: React.ReactNode; 
    description?: string; 
    icon?: React.ReactNode;
    labelClassName?: string;
    className?: string;
}> = ({ label, children, description, icon, labelClassName, className }) => (
    <div className={`flex items-center justify-between py-3 ${className || ''}`}>
        <div className="flex items-center gap-3">
            {icon && <div className={`flex-shrink-0 ${labelClassName ? 'opacity-90' : 'text-[var(--theme-text-tertiary)]'}`}>{icon}</div>}
            <div className="flex flex-col">
                <span className={`text-sm font-medium ${labelClassName || 'text-[var(--theme-text-primary)]'}`}>{label}</span>
                {description && <p className={`text-xs mt-0.5 ${labelClassName ? 'opacity-75' : 'text-[var(--theme-text-tertiary)]'}`}>{description}</p>}
            </div>
        </div>
        <div className="flex items-center gap-2 ml-4 flex-shrink-0">{children}</div>
    </div>
);

const DataCard: React.FC<{ title: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, icon, children, className }) => (
    <div className={`py-2 ${className || ''}`}>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)] mb-2 flex items-center gap-2">
            {icon}
            {title}
        </h4>
        <div className="divide-y divide-[var(--theme-border-primary)]/50">
            {children}
        </div>
    </div>
);

export const DataManagementSection: React.FC<DataManagementSectionProps> = ({
  onClearHistory,
  onClearCache,
  onOpenLogViewer,
  onClearLogs,
  installState,
  onInstallPwa,
  onImportSettings,
  onExportSettings,
  onImportHistory,
  onExportHistory,
  onImportScenarios,
  onExportScenarios,
  onReset,
}) => {
  const { t } = useI18n();
  const settingsImportRef = useRef<HTMLInputElement>(null);
  const historyImportRef = useRef<HTMLInputElement>(null);
  const scenariosImportRef = useRef<HTMLInputElement>(null);

  const btnClass = "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-secondary)] border flex items-center gap-1.5";
  const outlineBtnClass = `${btnClass} bg-transparent border-[var(--theme-border-secondary)] text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-primary)]`;
  // Updated white button class for Danger Zone
  const whiteDangerBtnClass = `${btnClass} border-white/30 bg-white/10 text-white hover:bg-white/20 focus:ring-white/50 focus:ring-offset-red-600`;
  const isInstallDisabled = installState === 'installed';
  const installDescription =
    installState === 'installed'
      ? t('settingsInstallApp_unavailable_title')
      : installState === 'manual'
        ? t('settingsInstallApp_manual_title')
        : undefined;

  return (
    <div className="space-y-6">
          <DataCard title="Application Data" icon={<Database size={14} strokeWidth={1.5} />}>
             <ActionRow label="Settings" icon={<Settings size={16} strokeWidth={1.5} />}>
                  <button onClick={onExportSettings} className={outlineBtnClass}><Download size={12} strokeWidth={1.5} /> {t('export')}</button>
                  <button onClick={() => settingsImportRef.current?.click()} className={outlineBtnClass}><Upload size={12} strokeWidth={1.5} /> {t('import')}</button>
                  <input type="file" ref={settingsImportRef} onChange={() => handleFileImport(settingsImportRef, onImportSettings)} accept=".json" className="hidden" />
              </ActionRow>
              <ActionRow label="Chat History" icon={<MessageSquare size={16} strokeWidth={1.5} />}>
                  <button onClick={onExportHistory} className={outlineBtnClass}><Download size={12} strokeWidth={1.5} /> {t('export')}</button>
                  <button onClick={() => historyImportRef.current?.click()} className={outlineBtnClass}><Upload size={12} strokeWidth={1.5} /> {t('import')}</button>
                  <input type="file" ref={historyImportRef} onChange={() => handleFileImport(historyImportRef, onImportHistory)} accept=".json" className="hidden" />
              </ActionRow>
               <ActionRow label="Scenarios" icon={<Bot size={16} strokeWidth={1.5} />}>
                  <button onClick={onExportScenarios} className={outlineBtnClass}><Download size={12} strokeWidth={1.5} /> {t('export')}</button>
                  <button onClick={() => scenariosImportRef.current?.click()} className={outlineBtnClass}><Upload size={12} strokeWidth={1.5} /> {t('import')}</button>
                  <input type="file" ref={scenariosImportRef} onChange={() => handleFileImport(scenariosImportRef, onImportScenarios)} accept=".json" className="hidden" />
              </ActionRow>
          </DataCard>
          
          <DataCard title="System & Logs" icon={<Settings size={14} strokeWidth={1.5} />}>
              <ActionRow label={t('settingsViewLogsAndUsage')}>
                <button onClick={() => onOpenLogViewer({ initialTab: 'usage', initialUsageTab: 'overview' })} className={outlineBtnClass}>{t('settingsViewLogsAndUsage')}</button>
                <button onClick={onClearLogs} className={`${outlineBtnClass} text-[var(--theme-text-danger)] hover:bg-[var(--theme-bg-danger)]/10 hover:text-[var(--theme-text-danger)] border-[var(--theme-bg-danger)]/30`}>
                    <Trash2 size={12} strokeWidth={1.5} /> {t('settingsClearLogs')}
                </button>
              </ActionRow>
              <ActionRow label={t('settingsInstallApp')} description={installDescription}>
                <button
                  onClick={onInstallPwa}
                  disabled={isInstallDisabled}
                  aria-label={t('settingsInstallApp_aria')}
                  className={`${outlineBtnClass} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {t('settingsInstallApp')}
                </button>
              </ActionRow>
          </DataCard>

          {/* DANGER ZONE */}
          <div className="p-5 rounded-xl bg-gradient-to-br from-red-600 to-red-700 text-white shadow-lg border border-red-800/50">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/10">
                  <AlertTriangle size={16} strokeWidth={2} className="text-white" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                      Danger Zone
                  </h4>
              </div>
              
              <div className="divide-y divide-white/10">
                  <ActionRow label={t('settingsReset')} labelClassName="text-white">
                      <button onClick={onReset} className={whiteDangerBtnClass}>
                          <RefreshCw size={12} strokeWidth={1.5} /> {t('settingsReset')}
                      </button>
                  </ActionRow>
                  
                  <ActionRow label={t('settingsClearHistory')} labelClassName="text-white">
                      <button onClick={onClearHistory} className={whiteDangerBtnClass}>
                          <Trash2 size={12} strokeWidth={1.5} /> {t('settingsClearHistory')}
                      </button>
                  </ActionRow>
                  
                  <ActionRow label={t('settingsClearCache')} labelClassName="text-white">
                      <button onClick={onClearCache} className={whiteDangerBtnClass}>
                          <Database size={12} strokeWidth={1.5} /> {t('settingsClearCache')}
                      </button>
                  </ActionRow>
              </div>
          </div>
    </div>
  );

  function handleFileImport(ref: React.RefObject<HTMLInputElement>, handler: (file: File) => void) {
    const file = ref.current?.files?.[0];
    if (file) handler(file);
    if (ref.current) ref.current.value = "";
  }
};
