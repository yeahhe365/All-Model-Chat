import React, { useRef } from 'react';
import { translations } from '../../utils/appUtils';
import { Settings, MessageSquare, Bot, AlertTriangle, Upload, Download, Trash2, Database } from 'lucide-react';

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

const ActionRow: React.FC<{ label: string; children: React.ReactNode; description?: string; icon?: React.ReactNode }> = ({ label, children, description, icon }) => (
    <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
        <div className="flex items-start gap-3">
            {icon && <div className="mt-0.5 text-[var(--theme-text-tertiary)]">{icon}</div>}
            <div>
                <span className="text-sm font-medium text-[var(--theme-text-primary)]">{label}</span>
                {description && <p className="text-xs text-[var(--theme-text-tertiary)] mt-0.5">{description}</p>}
            </div>
        </div>
        <div className="flex items-center gap-2 ml-4">{children}</div>
    </div>
);

const DataCard: React.FC<{ title: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, icon, children, className }) => (
    <div className={`p-4 sm:p-5 rounded-xl border ${className || 'bg-[var(--theme-bg-tertiary)]/30 border-[var(--theme-border-secondary)]'}`}>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)] mb-4 flex items-center gap-2">
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

  const btnClass = "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-secondary)] border flex items-center gap-1.5";
  const outlineBtnClass = `${btnClass} bg-transparent border-[var(--theme-border-secondary)] text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-primary)]`;
  const dangerBtnClass = `${btnClass} bg-[var(--theme-bg-danger)]/10 border-[var(--theme-bg-danger)]/20 text-[var(--theme-text-danger)] hover:bg-[var(--theme-bg-danger)]/20`;
  const whiteDangerBtnClass = `${btnClass} border-white/30 bg-white/10 text-white hover:bg-white/20 focus:ring-white/50`;

  const handleFileImport = (ref: React.RefObject<HTMLInputElement>, handler: (file: File) => void) => {
    const file = ref.current?.files?.[0];
    if (file) handler(file);
    if (ref.current) ref.current.value = "";
  };

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
              <ActionRow label={t('settingsViewLogs')}>
                <button onClick={onOpenLogViewer} className={outlineBtnClass}>{t('settingsViewLogs')}</button>
              </ActionRow>
              <ActionRow label={t('settingsInstallApp')} description={!isInstallable ? t('settingsInstallApp_unavailable_title') : undefined}>
                <button onClick={onInstallPwa} disabled={!isInstallable} className={`${outlineBtnClass} disabled:opacity-50 disabled:cursor-not-allowed`}>{t('settingsInstallApp')}</button>
              </ActionRow>
          </DataCard>

          <div className="p-5 rounded-xl bg-[var(--theme-bg-danger)] text-white shadow-lg">
              <h4 className="text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2 text-white/90">
                  <AlertTriangle size={14} strokeWidth={1.5} />
                  Danger Zone
              </h4>
              <div className="divide-y divide-white/10">
                  <ActionRow label={t('settingsReset')} labelClassName="text-white">
                      <button onClick={onReset} className={whiteDangerBtnClass}>{t('settingsReset')}</button>
                  </ActionRow>
                  <ActionRow label={t('settingsClearHistory')} labelClassName="text-white">
                      <button onClick={onClearHistory} className={whiteDangerBtnClass}><Trash2 size={12} strokeWidth={1.5} /> {t('settingsClearHistory')}</button>
                  </ActionRow>
                  <ActionRow label={t('settingsClearCache')} labelClassName="text-white">
                      <button onClick={onClearCache} className={whiteDangerBtnClass}><Database size={12} strokeWidth={1.5} /> {t('settingsClearCache')}</button>
                  </ActionRow>
              </div>
          </div>
    </div>
  );
};