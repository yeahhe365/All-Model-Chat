import React from 'react';
import type { ApiMode, AppSettings, ModelOption } from '../../types';
import { DEFAULT_OPENAI_COMPATIBLE_MODELS } from '../../constants/appConstants';
import { SettingsTab } from '../../hooks/features/useSettingsLogic';
import { getDefaultModelOptions } from '../../utils/defaultModelOptions';
import { ApiConfigSection } from './sections/ApiConfigSection';
import { AppearanceSection } from './sections/AppearanceSection';
import { DataManagementSection } from './sections/DataManagementSection';
import { ModelsSection } from './sections/ModelsSection';
import { ShortcutsSection } from './sections/ShortcutsSection';
import { AboutSection } from './sections/AboutSection';
import { SettingsTransferProps } from './settingsTypes';
import type { LogViewerProps } from '../log-viewer/LogViewer';
import { isOpenAICompatibleApiActive } from '../../utils/openaiCompatibleMode';
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

const buildProviderModelList = (geminiModels: ModelOption[], openAICompatibleModels: ModelOption[]): ModelOption[] => [
  ...tagModelsWithApiMode(geminiModels, 'gemini-native'),
  ...tagModelsWithApiMode(openAICompatibleModels, 'openai-compatible'),
];

const splitProviderModelList = (
  models: ModelOption[],
  fallbackApiMode: ApiMode,
): { geminiModels: ModelOption[]; openAICompatibleModels: ModelOption[] } => {
  return models.reduce(
    (lists, model) => {
      const targetApiMode = model.apiMode || fallbackApiMode;
      const modelWithoutApiMode = stripApiMode(model);

      if (targetApiMode === 'openai-compatible') {
        lists.openAICompatibleModels.push(modelWithoutApiMode);
        return lists;
      }

      lists.geminiModels.push(modelWithoutApiMode);
      return lists;
    },
    { geminiModels: [] as ModelOption[], openAICompatibleModels: [] as ModelOption[] },
  );
};

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
  const isOpenAICompatibleApiEnabled = currentSettings.isOpenAICompatibleApiEnabled === true;
  const isOpenAICompatibleMode = isOpenAICompatibleApiActive(currentSettings);
  const effectiveModelId = isOpenAICompatibleMode ? currentSettings.openaiCompatibleModelId : currentSettings.modelId;
  const effectiveAvailableModels = React.useMemo(
    () =>
      buildProviderModelList(
        availableModels,
        isOpenAICompatibleApiEnabled ? currentSettings.openaiCompatibleModels : [],
      ),
    [availableModels, currentSettings.openaiCompatibleModels, isOpenAICompatibleApiEnabled],
  );
  const effectiveDefaultModels = React.useMemo(
    () =>
      buildProviderModelList(
        getDefaultModelOptions(),
        isOpenAICompatibleApiEnabled ? DEFAULT_OPENAI_COMPATIBLE_MODELS : [],
      ),
    [isOpenAICompatibleApiEnabled],
  );
  const geminiModelIds = React.useMemo(() => new Set(availableModels.map((model) => model.id)), [availableModels]);
  const openAICompatibleModelIds = React.useMemo(
    () =>
      new Set(
        isOpenAICompatibleApiEnabled ? currentSettings.openaiCompatibleModels.map((model) => model.id) : [],
      ),
    [currentSettings.openaiCompatibleModels, isOpenAICompatibleApiEnabled],
  );

  const handleBatchUpdate = (updates: Partial<AppSettings>) => {
    (Object.entries(updates) as Array<[keyof AppSettings, AppSettings[keyof AppSettings]]>).forEach(([key, value]) => {
      updateSetting(key, value);
    });
  };

  const handleEffectiveModelChange = (modelId: string, apiMode?: ApiMode) => {
    const targetApiMode =
      apiMode ||
      (openAICompatibleModelIds.has(modelId) && (!geminiModelIds.has(modelId) || isOpenAICompatibleMode)
        ? 'openai-compatible'
        : 'gemini-native');

    if (isOpenAICompatibleApiEnabled && targetApiMode === 'openai-compatible') {
      if (!isOpenAICompatibleMode) {
        updateSetting('apiMode', 'openai-compatible');
      }
      updateSetting('openaiCompatibleModelId', modelId);
      return;
    }

    if (isOpenAICompatibleMode) {
      updateSetting('apiMode', 'gemini-native');
    }
    handleModelChange(modelId);
  };

  const handleAvailableModelsChange = (models: ModelOption[]) => {
    const { geminiModels, openAICompatibleModels } = splitProviderModelList(models, currentSettings.apiMode);

    setAvailableModels(geminiModels);

    if (!isOpenAICompatibleApiEnabled) {
      const geminiFallbackModelId = getFallbackModelId(geminiModels);

      if (geminiFallbackModelId && !hasModelId(geminiModels, currentSettings.modelId)) {
        handleModelChange(geminiFallbackModelId);
      }

      return;
    }

    updateSetting('openaiCompatibleModels', openAICompatibleModels);

    const geminiFallbackModelId = getFallbackModelId(geminiModels);
    const openAICompatibleFallbackModelId = getFallbackModelId(openAICompatibleModels);

    if (geminiFallbackModelId && !hasModelId(geminiModels, currentSettings.modelId)) {
      handleModelChange(geminiFallbackModelId);
    }

    if (
      openAICompatibleFallbackModelId &&
      !hasModelId(openAICompatibleModels, currentSettings.openaiCompatibleModelId)
    ) {
      updateSetting('openaiCompatibleModelId', openAICompatibleFallbackModelId);
    }

    if (isOpenAICompatibleMode && !openAICompatibleFallbackModelId && geminiFallbackModelId) {
      updateSetting('apiMode', 'gemini-native');
      handleModelChange(geminiFallbackModelId);
    }

    if (currentSettings.apiMode === 'gemini-native' && !geminiFallbackModelId && openAICompatibleFallbackModelId) {
      updateSetting('apiMode', 'openai-compatible');
      updateSetting('openaiCompatibleModelId', openAICompatibleFallbackModelId);
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
            defaultApiMode={isOpenAICompatibleApiEnabled ? currentSettings.apiMode : 'gemini-native'}
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
            availableModels={availableModels}
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
