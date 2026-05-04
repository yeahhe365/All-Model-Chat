import React from 'react';
import { useI18n } from '../../../contexts/I18nContext';
import { Languages } from 'lucide-react';
import {
  DEFAULT_THOUGHT_TRANSLATION_MODEL_ID,
  TRANSLATION_TARGET_LANGUAGE_OPTIONS,
} from '../../../constants/appConstants';
import { ModelOption } from '../../../types';
import { TranslationTargetLanguage } from '../../../types/settings';
import { Select } from '../../shared/Select';
import { VoiceControl } from '../controls/VoiceControl';

interface LanguageVoiceSectionProps {
  availableModels: ModelOption[];
  transcriptionModelId: string;
  setTranscriptionModelId: (value: string) => void;
  translationTargetLanguage: TranslationTargetLanguage;
  setTranslationTargetLanguage: (value: TranslationTargetLanguage) => void;
  inputTranslationModelId: string;
  setInputTranslationModelId: (value: string) => void;
  thoughtTranslationTargetLanguage: TranslationTargetLanguage;
  setThoughtTranslationTargetLanguage: (value: TranslationTargetLanguage) => void;
  thoughtTranslationModelId: string;
  setThoughtTranslationModelId: (value: string) => void;
}

export const LanguageVoiceSection: React.FC<LanguageVoiceSectionProps> = (props) => {
  const { t } = useI18n();
  const inputTranslationModelOptions = props.availableModels.some((model) => model.id === props.inputTranslationModelId)
    ? props.availableModels
    : [
        ...props.availableModels,
        {
          id: props.inputTranslationModelId || DEFAULT_THOUGHT_TRANSLATION_MODEL_ID,
          name: props.inputTranslationModelId || DEFAULT_THOUGHT_TRANSLATION_MODEL_ID,
        },
      ];
  const thoughtTranslationModelOptions = props.availableModels.some(
    (model) => model.id === props.thoughtTranslationModelId,
  )
    ? props.availableModels
    : [
        ...props.availableModels,
        {
          id: props.thoughtTranslationModelId || DEFAULT_THOUGHT_TRANSLATION_MODEL_ID,
          name: props.thoughtTranslationModelId || DEFAULT_THOUGHT_TRANSLATION_MODEL_ID,
        },
      ];

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <VoiceControl
        transcriptionModelId={props.transcriptionModelId}
        setTranscriptionModelId={props.setTranscriptionModelId}
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
              value={props.translationTargetLanguage}
              onChange={(event) => props.setTranslationTargetLanguage(event.target.value as TranslationTargetLanguage)}
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
              value={props.inputTranslationModelId}
              onChange={(event) => props.setInputTranslationModelId(event.target.value)}
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
              value={props.thoughtTranslationTargetLanguage}
              onChange={(event) =>
                props.setThoughtTranslationTargetLanguage(event.target.value as TranslationTargetLanguage)
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
              value={props.thoughtTranslationModelId}
              onChange={(event) => props.setThoughtTranslationModelId(event.target.value)}
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
