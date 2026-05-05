import React from 'react';
import { useI18n } from '../../../contexts/I18nContext';
import { AppSettings, ModelOption } from '../../../types';
import { ModelVoiceSettings } from '../ModelVoiceSettings';
import { SafetySection } from './SafetySection';
import { TranslationTargetLanguage } from '../../../types/settings';
import { AVAILABLE_CANVAS_MODELS } from '../../../constants/settingsModelOptions';
import {
  DEFAULT_AUTO_CANVAS_MODEL_ID,
  DEFAULT_THOUGHT_TRANSLATION_MODEL_ID,
  TRANSLATION_TARGET_LANGUAGE_OPTIONS,
} from '../../../constants/appConstants';
import { ToggleItem } from '../../shared/ToggleItem';
import { Select } from '../../shared/Select';
import { Languages, Wand2 } from 'lucide-react';
import type { SettingsUpdateHandler } from '../settingsTypes';

interface ChatBehaviorSectionProps {
  modelId: string;
  setModelId: (id: string) => void;
  availableModels: ModelOption[];
  setAvailableModels: (models: ModelOption[]) => void;
  currentSettings: AppSettings;
  onUpdateSetting: SettingsUpdateHandler;
}

export const ChatBehaviorSection: React.FC<ChatBehaviorSectionProps> = (props) => {
  const { t } = useI18n();
  const inputTranslationModelId = props.currentSettings.inputTranslationModelId || DEFAULT_THOUGHT_TRANSLATION_MODEL_ID;
  const thoughtTranslationModelId =
    props.currentSettings.thoughtTranslationModelId || DEFAULT_THOUGHT_TRANSLATION_MODEL_ID;
  const thoughtTranslationTargetLanguage =
    props.currentSettings.thoughtTranslationTargetLanguage || 'Simplified Chinese';
  const autoCanvasModelId = props.currentSettings.autoCanvasModelId || DEFAULT_AUTO_CANVAS_MODEL_ID;
  const inputTranslationModelOptions = props.availableModels.some((model) => model.id === inputTranslationModelId)
    ? props.availableModels
    : [
        ...props.availableModels,
        {
          id: inputTranslationModelId,
          name: inputTranslationModelId,
        },
      ];
  const thoughtTranslationModelOptions = props.availableModels.some((model) => model.id === thoughtTranslationModelId)
    ? props.availableModels
    : [
        ...props.availableModels,
        {
          id: thoughtTranslationModelId,
          name: thoughtTranslationModelId,
        },
      ];

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <ModelVoiceSettings
        modelId={props.modelId}
        setModelId={props.setModelId}
        availableModels={props.availableModels}
        setAvailableModels={props.setAvailableModels}
        currentSettings={props.currentSettings}
        onUpdateSetting={props.onUpdateSetting}
      />

      <div className="pt-6 border-t border-[var(--theme-border-secondary)] space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)] flex items-center gap-2">
          <Languages size={14} strokeWidth={1.5} />
          {t('settingsTranslationSectionTitle')}
        </h4>
        <div className="space-y-1">
          <Select
            id="translation-target-language-select"
            label=""
            layout="horizontal"
            labelContent={
              <div className="flex items-center gap-2 text-sm font-medium text-[var(--theme-text-primary)]">
                {t('settingsInputTranslationLanguageLabel')}
              </div>
            }
            value={props.currentSettings.translationTargetLanguage}
            onChange={(e) =>
              props.onUpdateSetting('translationTargetLanguage', e.target.value as TranslationTargetLanguage)
            }
            className="py-3"
          >
            {TRANSLATION_TARGET_LANGUAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </Select>
          <Select
            id="input-translation-model-select"
            label=""
            layout="horizontal"
            labelContent={
              <div className="flex items-center gap-2 text-sm font-medium text-[var(--theme-text-primary)]">
                {t('settings_inputTranslationModel_label')}
              </div>
            }
            value={inputTranslationModelId}
            onChange={(e) => props.onUpdateSetting('inputTranslationModelId', e.target.value)}
            className="py-3"
          >
            {inputTranslationModelOptions.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1">
          <Select
            id="thought-translation-target-language-select"
            label=""
            layout="horizontal"
            labelContent={
              <div className="flex items-center gap-2 text-sm font-medium text-[var(--theme-text-primary)]">
                {t('settings_thoughtTranslationTargetLanguage_label')}
              </div>
            }
            value={thoughtTranslationTargetLanguage}
            onChange={(e) =>
              props.onUpdateSetting('thoughtTranslationTargetLanguage', e.target.value as TranslationTargetLanguage)
            }
            className="py-3"
          >
            {TRANSLATION_TARGET_LANGUAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </Select>
          <Select
            id="thought-translation-model-select"
            label=""
            layout="horizontal"
            labelContent={
              <div className="flex items-center gap-2 text-sm font-medium text-[var(--theme-text-primary)]">
                {t('settings_thoughtTranslationModel_label')}
              </div>
            }
            value={thoughtTranslationModelId}
            onChange={(e) => props.onUpdateSetting('thoughtTranslationModelId', e.target.value)}
            className="py-3"
          >
            {thoughtTranslationModelOptions.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Canvas Visualization Settings */}
      <div className="pt-6 border-t border-[var(--theme-border-secondary)] space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)] flex items-center gap-2">
          <Wand2 size={14} strokeWidth={1.5} />
          {t('settingsCanvasSectionTitle')}
        </h4>
        <div className="space-y-1">
          <ToggleItem
            label={t('settings_autoCanvasVisualization_label')}
            checked={props.currentSettings.autoCanvasVisualization ?? false}
            onChange={(value) => props.onUpdateSetting('autoCanvasVisualization', value)}
            tooltip={t('settings_autoCanvasVisualization_tooltip')}
          />

          <Select
            id="canvas-model-select"
            label=""
            layout="horizontal"
            labelContent={
              <div className="flex items-center gap-2 text-sm font-medium text-[var(--theme-text-primary)]">
                {t('settings_autoCanvasModel_label')}
              </div>
            }
            value={autoCanvasModelId}
            onChange={(e) => props.onUpdateSetting('autoCanvasModelId', e.target.value)}
            className="py-3"
          >
            {AVAILABLE_CANVAS_MODELS.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="pt-6 border-t border-[var(--theme-border-secondary)]">
        <SafetySection
          safetySettings={props.currentSettings.safetySettings}
          setSafetySettings={(safetySettings) => props.onUpdateSetting('safetySettings', safetySettings)}
        />
      </div>
    </div>
  );
};
