import React from 'react';
import type { ApiMode, AppSettings, ModelOption } from '@/types';
import { type SettingsTab } from '@/hooks/features/useSettingsLogic';
import { getDefaultModelOptions } from '@/utils/defaultModelOptions';
import { ApiConfigSection } from './sections/ApiConfigSection';
import { AppearanceSection } from './sections/AppearanceSection';
import { DataManagementSection } from './sections/DataManagementSection';
import { ModelsSection } from './sections/ModelsSection';
import { ShortcutsSection } from './sections/ShortcutsSection';
import { AboutSection } from './sections/AboutSection';
import { type SettingsTransferProps } from './settingsTypes';
import type { LogViewerProps } from '@/components/log-viewer/LogViewer';
import { isOpenAICompatibleApiActive } from '@/utils/openaiCompatibleMode';
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
  onImportSettings: (file: File) => void;
  onExportSettings: () => void;
  onImportHistory: (file: File) => void;
  onExportHistory: () => void;
}

const stripApiMode = (model: ModelOption): ModelOption => {
  const nextModel = { ...model };
  delete nextModel.apiMode;
  return nextModel;
};

const tagModelsWithApiMode = (models: ModelOption[], apiMode: ApiMode): ModelOption[] =>
  models.map((model) => ({
    ...stripApiMode(model),
    apiMode,
  }));

const buildGeminiModelList = (geminiModels: ModelOption[]): ModelOption[] =>
  tagModelsWithApiMode(geminiModels, 'gemini-native');

const getGeminiModelsFromEditedList = (models: ModelOption[]): ModelOption[] =>
  models.filter((model) => model.apiMode !== 'openai-compatible').map(stripApiMode);

const getFallbackModelId = (models: ModelOption[]): string | undefined =>
  models.find((model) => model.isPinned)?.id || models[0]?.id;

const hasModelId = (models: ModelOption[], modelId: string): boolean => models.some((model) => model.id === modelId);

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
}) => {
  const animClass = 'animate-in fade-in duration-200 ease-out';
  const isOpenAICompatibleMode = isOpenAICompatibleApiActive(currentSettings);
  const effectiveModelId = currentSettings.modelId;
  const effectiveAvailableModels = React.useMemo(() => buildGeminiModelList(availableModels), [availableModels]);
  const effectiveDefaultModels = React.useMemo(() => buildGeminiModelList(getDefaultModelOptions()), []);
  const shortcutAvailableModels = React.useMemo(() => {
    if (currentSettings.isOpenAICompatibleApiEnabled !== true) {
      return effectiveAvailableModels;
    }

    return [
      ...effectiveAvailableModels,
      ...tagModelsWithApiMode(currentSettings.openaiCompatibleModels ?? [], 'openai-compatible'),
    ];
  }, [currentSettings.isOpenAICompatibleApiEnabled, currentSettings.openaiCompatibleModels, effectiveAvailableModels]);

  const handleBatchUpdate = (updates: Partial<AppSettings>) => {
    (Object.entries(updates) as Array<[keyof AppSettings, AppSettings[keyof AppSettings]]>).forEach(([key, value]) => {
      updateSetting(key, value);
    });
  };

  const handleEffectiveModelChange = (modelId: string, apiMode?: ApiMode) => {
    if (apiMode === 'openai-compatible') {
      return;
    }

    if (isOpenAICompatibleMode) {
      updateSetting('apiMode', 'gemini-native');
    }
    handleModelChange(modelId);
  };

  const handleAvailableModelsChange = (models: ModelOption[]) => {
    const geminiModels = getGeminiModelsFromEditedList(models);

    setAvailableModels(geminiModels);

    const geminiFallbackModelId = getFallbackModelId(geminiModels);

    if (geminiFallbackModelId && !hasModelId(geminiModels, currentSettings.modelId)) {
      handleModelChange(geminiFallbackModelId);
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full">
      {activeTab === 'models' && (
        <div className={`${animClass} max-w-4xl mx-auto`}>
          <ModelsSection
            modelId={effectiveModelId}
            setModelId={handleEffectiveModelChange}
            availableModels={effectiveAvailableModels}
            setAvailableModels={handleAvailableModelsChange}
            defaultModels={effectiveDefaultModels}
            defaultApiMode="gemini-native"
            isOpenAICompatibleMode={isOpenAICompatibleMode}
            currentSettings={currentSettings}
            onUpdateSettings={handleBatchUpdate}
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
            availableModels={shortcutAvailableModels}
            onUpdateSettings={handleBatchUpdate}
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
