import React, { useState } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { ChevronDown, Shield } from 'lucide-react';
import { type ApiMode, type AppSettings, type ModelOption } from '@/types';
import { ModelSelector } from '@/components/settings/controls/ModelSelector';
import { LiveArtifactsSection } from './LiveArtifactsSection';
import { GenerationSection } from './GenerationSection';
import { LanguageVoiceSection } from './LanguageVoiceSection';
import { SafetySection } from './SafetySection';
import type { SettingsUpdateHandler } from '@/components/settings/settingsTypes';

interface ModelsSectionProps {
  modelId: string;
  setModelId: (id: string, apiMode?: ApiMode) => void;
  availableModels: ModelOption[];
  setAvailableModels: (models: ModelOption[]) => void;
  defaultModels?: ModelOption[];
  defaultApiMode?: ApiMode;
  isOpenAICompatibleMode?: boolean;
  currentSettings: AppSettings;
  onUpdateSettings: (settings: Partial<AppSettings>) => void;
}

export const ModelsSection: React.FC<ModelsSectionProps> = ({
  modelId,
  setModelId,
  availableModels,
  setAvailableModels,
  defaultModels,
  defaultApiMode,
  isOpenAICompatibleMode = false,
  currentSettings,
  onUpdateSettings,
}) => {
  const { t } = useI18n();
  const [isSafetyExpanded, setIsSafetyExpanded] = useState(false);

  const updateSetting: SettingsUpdateHandler = (key, value) => {
    onUpdateSettings({ [key]: value } as Partial<AppSettings>);
  };
  const geminiOnlyModels = availableModels
    .filter((model) => !model.apiMode || model.apiMode === 'gemini-native')
    .map((model) => {
      const nextModel = { ...model };
      delete nextModel.apiMode;
      return nextModel;
    });

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <ModelSelector
        availableModels={availableModels}
        selectedModelId={modelId}
        selectedApiMode={isOpenAICompatibleMode ? 'gemini-native' : currentSettings.apiMode}
        onSelectModel={setModelId}
        setAvailableModels={setAvailableModels}
        defaultModels={defaultModels}
        defaultApiMode={defaultApiMode}
      />

      <GenerationSection
        isOpenAICompatibleMode={isOpenAICompatibleMode}
        modelId={modelId}
        currentSettings={currentSettings}
        onUpdateSetting={updateSetting}
      />

      {!isOpenAICompatibleMode && (
        <>
          <LiveArtifactsSection currentSettings={currentSettings} onUpdateSetting={updateSetting} />

          <LanguageVoiceSection
            availableModels={geminiOnlyModels}
            currentSettings={currentSettings}
            onUpdateSetting={updateSetting}
          />

          <div className="rounded-lg border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-input)]/30 p-4">
            <button
              type="button"
              onClick={() => setIsSafetyExpanded((prev) => !prev)}
              aria-expanded={isSafetyExpanded}
              aria-label={t('models_safety_toggle_aria')}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <span className="flex min-w-0 items-start gap-3">
                <Shield size={20} className="mt-0.5 flex-shrink-0 text-[var(--theme-text-link)]" strokeWidth={1.75} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[var(--theme-text-primary)]">
                    {t('safety_title')}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-[var(--theme-text-tertiary)]">
                    {t('safety_description')}
                  </span>
                </span>
              </span>
              <ChevronDown
                size={16}
                className={`flex-shrink-0 text-[var(--theme-text-tertiary)] transition-transform duration-200 ${
                  isSafetyExpanded ? 'rotate-180' : ''
                }`}
                strokeWidth={1.75}
              />
            </button>

            {isSafetyExpanded && (
              <div className="mt-4 border-t border-[var(--theme-border-secondary)]/60 pt-4">
                <SafetySection
                  safetySettings={currentSettings.safetySettings}
                  setSafetySettings={(safetySettings) => onUpdateSettings({ safetySettings })}
                  showIntro={false}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
