import React from 'react';
import { useI18n } from '../../../contexts/I18nContext';
import { Languages } from 'lucide-react';
import {
  DEFAULT_THOUGHT_TRANSLATION_MODEL_ID,
  TRANSLATION_TARGET_LANGUAGE_OPTIONS,
} from '../../../constants/appConstants';
import { AppSettings, ModelOption } from '../../../types';
import { TranslationTargetLanguage } from '../../../types/settings';
import { Select } from '../../shared/Select';
import { VoiceControl } from '../controls/VoiceControl';
import type { SettingsUpdateHandler } from '../settingsTypes';

interface LanguageVoiceSectionProps {
  availableModels: ModelOption[];
  currentSettings: AppSettings;
  onUpdateSetting: SettingsUpdateHandler;
}

export const LanguageVoiceSection: React.FC<LanguageVoiceSectionProps> = (props) => {
  const { t } = useI18n();
  const inputTranslationModelId = props.currentSettings.inputTranslationModelId || DEFAULT_THOUGHT_TRANSLATION_MODEL_ID;
  const thoughtTranslationTargetLanguage =
    props.currentSettings.thoughtTranslationTargetLanguage || 'Simplified Chinese';
  const thoughtTranslationModelId =
    props.currentSettings.thoughtTranslationModelId || DEFAULT_THOUGHT_TRANSLATION_MODEL_ID;
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
    <div className="max-w-3xl mx-auto space-y-8">
      <VoiceControl
        transcriptionModelId={props.currentSettings.transcriptionModelId}
        setTranscriptionModelId={(value) => props.onUpdateSetting('transcriptionModelId', value)}
        titleKey="settingsTranscriptionSectionTitle"
      />

      <div className="pt-6 border-t border-[var(--theme-border-secondary)] space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)] flex items-center gap-2">
          <Languages size={14} strokeWidth={1.5} />
          {t('settingsTranslationSectionTitle')}
        </h4>
        <div className="space-y-4">
          <div className="space-y-1">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)]">
              {t('settingsInputTranslationSectionTitle')}
            </h5>
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
              onChange={(event) =>
                props.onUpdateSetting('translationTargetLanguage', event.target.value as TranslationTargetLanguage)
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
              onChange={(event) => props.onUpdateSetting('inputTranslationModelId', event.target.value)}
              className="py-3"
            >
              {inputTranslationModelOptions.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1 border-t border-[var(--theme-border-secondary)] pt-4">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)]">
              {t('settingsThoughtTranslationSectionTitle')}
            </h5>
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
              onChange={(event) =>
                props.onUpdateSetting(
                  'thoughtTranslationTargetLanguage',
                  event.target.value as TranslationTargetLanguage,
                )
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
              onChange={(event) => props.onUpdateSetting('thoughtTranslationModelId', event.target.value)}
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
      </div>
    </div>
  );
};
