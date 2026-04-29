import React, { useState } from 'react';
import { ChevronDown, Shield } from 'lucide-react';
import { DEFAULT_AUTO_CANVAS_MODEL_ID, DEFAULT_THOUGHT_TRANSLATION_MODEL_ID } from '../../../constants/appConstants';
import { AppSettings, ModelOption } from '../../../types';
import { translations } from '../../../utils/translations';
import { ModelSelector } from '../controls/ModelSelector';
import { CanvasSection } from './CanvasSection';
import { GenerationSection } from './GenerationSection';
import { LanguageVoiceSection } from './LanguageVoiceSection';
import { SafetySection } from './SafetySection';

interface ModelsSectionProps {
  modelId: string;
  setModelId: (id: string) => void;
  availableModels: ModelOption[];
  setAvailableModels: (models: ModelOption[]) => void;
  currentSettings: AppSettings;
  onUpdateSettings: (settings: Partial<AppSettings>) => void;
  t: (key: keyof typeof translations | string) => string;
}

export const ModelsSection: React.FC<ModelsSectionProps> = ({
  modelId,
  setModelId,
  availableModels,
  setAvailableModels,
  currentSettings,
  onUpdateSettings,
  t,
}) => {
  const [isSafetyExpanded, setIsSafetyExpanded] = useState(false);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    onUpdateSettings({ [key]: value } as Pick<AppSettings, K>);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <ModelSelector
        availableModels={availableModels}
        selectedModelId={modelId}
        onSelectModel={setModelId}
        setAvailableModels={setAvailableModels}
      />

      <GenerationSection
        modelId={modelId}
        systemInstruction={currentSettings.systemInstruction}
        setSystemInstruction={(value) => updateSetting('systemInstruction', value)}
        temperature={currentSettings.temperature}
        setTemperature={(value) => updateSetting('temperature', value)}
        topP={currentSettings.topP}
        setTopP={(value) => updateSetting('topP', value)}
        topK={currentSettings.topK ?? 64}
        setTopK={(value) => updateSetting('topK', value)}
        showThoughts={currentSettings.showThoughts}
        setShowThoughts={(value) => updateSetting('showThoughts', value)}
        thinkingBudget={currentSettings.thinkingBudget}
        setThinkingBudget={(value) => updateSetting('thinkingBudget', value)}
        thinkingLevel={currentSettings.thinkingLevel}
        setThinkingLevel={(value) => updateSetting('thinkingLevel', value)}
        mediaResolution={currentSettings.mediaResolution}
        setMediaResolution={(value) => updateSetting('mediaResolution', value)}
        ttsVoice={currentSettings.ttsVoice}
        setTtsVoice={(value) => updateSetting('ttsVoice', value)}
        isRawModeEnabled={currentSettings.isRawModeEnabled ?? false}
        setIsRawModeEnabled={(value) => updateSetting('isRawModeEnabled', value)}
        hideThinkingInContext={currentSettings.hideThinkingInContext ?? false}
        setHideThinkingInContext={(value) => updateSetting('hideThinkingInContext', value)}
        t={t}
      />

      <CanvasSection
        autoCanvasVisualization={currentSettings.autoCanvasVisualization ?? false}
        setAutoCanvasVisualization={(value) => updateSetting('autoCanvasVisualization', value)}
        autoCanvasModelId={currentSettings.autoCanvasModelId || DEFAULT_AUTO_CANVAS_MODEL_ID}
        setAutoCanvasModelId={(value) => updateSetting('autoCanvasModelId', value)}
        t={t}
      />

      <LanguageVoiceSection
        transcriptionModelId={currentSettings.transcriptionModelId}
        setTranscriptionModelId={(value) => updateSetting('transcriptionModelId', value)}
        translationTargetLanguage={currentSettings.translationTargetLanguage}
        setTranslationTargetLanguage={(value) => updateSetting('translationTargetLanguage', value)}
        inputTranslationModelId={currentSettings.inputTranslationModelId || DEFAULT_THOUGHT_TRANSLATION_MODEL_ID}
        setInputTranslationModelId={(value) => updateSetting('inputTranslationModelId', value)}
        thoughtTranslationTargetLanguage={currentSettings.thoughtTranslationTargetLanguage || 'Simplified Chinese'}
        setThoughtTranslationTargetLanguage={(value) => updateSetting('thoughtTranslationTargetLanguage', value)}
        thoughtTranslationModelId={currentSettings.thoughtTranslationModelId || DEFAULT_THOUGHT_TRANSLATION_MODEL_ID}
        setThoughtTranslationModelId={(value) => updateSetting('thoughtTranslationModelId', value)}
        availableModels={availableModels}
        t={t}
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
              <span className="block text-sm font-semibold text-[var(--theme-text-primary)]">{t('safety_title')}</span>
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
              t={t}
              showIntro={false}
            />
          </div>
        )}
      </div>
    </div>
  );
};
