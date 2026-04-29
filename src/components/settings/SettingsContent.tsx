import React from 'react';
import { AppSettings, ModelOption } from '../../types';
import { SettingsTab } from '../../hooks/features/useSettingsLogic';
import { ApiConfigSection } from './sections/ApiConfigSection';
import { AppearanceSection } from './sections/AppearanceSection';
import { DataManagementSection } from './sections/DataManagementSection';
import { ModelsSection } from './sections/ModelsSection';
import { ShortcutsSection } from './sections/ShortcutsSection';
import { AboutSection } from './sections/AboutSection';
import { SettingsTransferProps } from './settingsTypes';
import type { LogViewerProps } from '../log-viewer/LogViewer';
interface SettingsContentProps extends SettingsTransferProps {
  activeTab: SettingsTab;
  currentSettings: AppSettings;
  availableModels: ModelOption[];
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  handleModelChange: (modelId: string) => void;
  setAvailableModels: (models: ModelOption[]) => void;
  onClearHistory: () => void;
  onClearCache: () => void;
  onOpenLogViewer: (state?: Pick<LogViewerProps, 'initialTab' | 'initialUsageTab'>) => void;
  onClearLogs: () => void;
  onReset: () => void;
}

export const SettingsContent: React.FC<SettingsContentProps> = ({
  activeTab,
  currentSettings,
  availableModels,
  updateSetting,
  handleModelChange,
  setAvailableModels,
  onClearHistory,
  onClearCache,
  onOpenLogViewer,
  onClearLogs,
  onReset,
  onInstallPwa,
  installState,
  onImportSettings,
  onExportSettings,
  onImportHistory,
  onExportHistory,
  onImportScenarios,
  onExportScenarios,
  t,
}) => {
  const animClass = 'animate-in fade-in duration-200 ease-out';

  const handleBatchUpdate = (updates: Partial<AppSettings>) => {
    (Object.entries(updates) as Array<[keyof AppSettings, AppSettings[keyof AppSettings]]>).forEach(([key, value]) => {
      updateSetting(key, value);
    });
  };

  const handleAvailableModelsChange = (models: ModelOption[]) => {
    setAvailableModels(models);

    if (models.length === 0 || models.some((model) => model.id === currentSettings.modelId)) {
      return;
    }

    const fallbackModelId = models.find((model) => model.isPinned)?.id || models[0]?.id;
    if (fallbackModelId) {
      handleModelChange(fallbackModelId);
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full">
      {activeTab === 'models' && (
        <div className={`${animClass} max-w-4xl mx-auto`}>
          <ModelsSection
            modelId={currentSettings.modelId}
            setModelId={handleModelChange}
            availableModels={availableModels}
            setAvailableModels={handleAvailableModelsChange}
            currentSettings={currentSettings}
            onUpdateSettings={handleBatchUpdate}
            t={t}
          />
        </div>
      )}

      {activeTab === 'interface' && (
        <div className={animClass}>
          <AppearanceSection settings={currentSettings} onUpdate={updateSetting} />
        </div>
      )}

      {activeTab === 'api' && (
        <div className={animClass}>
          <ApiConfigSection
            useCustomApiConfig={currentSettings.useCustomApiConfig}
            setUseCustomApiConfig={(val) => updateSetting('useCustomApiConfig', val)}
            apiKey={currentSettings.apiKey}
            setApiKey={(val) => updateSetting('apiKey', val)}
            apiProxyUrl={currentSettings.apiProxyUrl}
            setApiProxyUrl={(val) => updateSetting('apiProxyUrl', val)}
            useApiProxy={currentSettings.useApiProxy ?? false}
            setUseApiProxy={(val) => updateSetting('useApiProxy', val)}
            serverManagedApi={currentSettings.serverManagedApi ?? false}
            settings={currentSettings}
            onUpdate={updateSetting}
          />
        </div>
      )}

      {activeTab === 'data' && (
        <div className={animClass}>
          <DataManagementSection
            onClearHistory={onClearHistory}
            onClearCache={onClearCache}
            onOpenLogViewer={onOpenLogViewer}
            onClearLogs={onClearLogs}
            onInstallPwa={onInstallPwa}
            installState={installState}
            onImportSettings={onImportSettings}
            onExportSettings={onExportSettings}
            onImportHistory={onImportHistory}
            onExportHistory={onExportHistory}
            onImportScenarios={onImportScenarios}
            onExportScenarios={onExportScenarios}
            onReset={onReset}
          />
        </div>
      )}

      {activeTab === 'shortcuts' && (
        <div className={animClass}>
          <ShortcutsSection
            currentSettings={currentSettings}
            availableModels={availableModels}
            onUpdateSettings={handleBatchUpdate}
            t={t}
          />
        </div>
      )}

      {activeTab === 'about' && (
        <div className={animClass}>
          <AboutSection />
        </div>
      )}
    </div>
  );
};
