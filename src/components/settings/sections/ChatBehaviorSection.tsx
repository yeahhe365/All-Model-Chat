import React from 'react';
import { ModelOption, SafetySetting } from '../../../types';
import { ModelVoiceSettings } from '../ModelVoiceSettings';
import { SafetySection } from './SafetySection';
import { MediaResolution, TranslationTargetLanguage } from '../../../types/settings';
import { AVAILABLE_CANVAS_MODELS } from '../../../constants/settingsModelOptions';
import { TRANSLATION_TARGET_LANGUAGE_OPTIONS } from '../../../constants/appConstants';
import { ToggleItem } from '../../shared/ToggleItem';
import { Select } from '../../shared/Select';
import { Languages, Wand2 } from 'lucide-react';

interface ChatBehaviorSectionProps {
  modelId: string;
  setModelId: (id: string) => void;
  availableModels: ModelOption[];
  transcriptionModelId: string;
  setTranscriptionModelId: (value: string) => void;
  ttsVoice: string;
  setTtsVoice: (value: string) => void;
  systemInstruction: string;
  setSystemInstruction: (value: string) => void;
  temperature: number;
  setTemperature: (value: number) => void;
  topP: number;
  setTopP: (value: number) => void;
  topK: number;
  setTopK: (value: number) => void;
  thinkingBudget: number;
  setThinkingBudget: (value: number) => void;
  thinkingLevel?: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH';
  setThinkingLevel?: (value: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH') => void;
  showThoughts: boolean;
  setShowThoughts: (value: boolean) => void;
  safetySettings?: SafetySetting[];
  setSafetySettings: (settings: SafetySetting[]) => void;
  t: (key: string) => string;
  setAvailableModels: (models: ModelOption[]) => void;
  mediaResolution?: MediaResolution;
  setMediaResolution?: (resolution: MediaResolution) => void;
  translationTargetLanguage: TranslationTargetLanguage;
  setTranslationTargetLanguage: (value: TranslationTargetLanguage) => void;
  autoCanvasVisualization: boolean;
  setAutoCanvasVisualization: (value: boolean) => void;
  autoCanvasModelId: string;
  setAutoCanvasModelId: (value: string) => void;
}

export const ChatBehaviorSection: React.FC<ChatBehaviorSectionProps> = (props) => {
  const { t } = props;

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <ModelVoiceSettings
        modelId={props.modelId}
        setModelId={props.setModelId}
        availableModels={props.availableModels}
        setAvailableModels={props.setAvailableModels}
        transcriptionModelId={props.transcriptionModelId}
        setTranscriptionModelId={props.setTranscriptionModelId}
        ttsVoice={props.ttsVoice}
        setTtsVoice={props.setTtsVoice}
        systemInstruction={props.systemInstruction}
        setSystemInstruction={props.setSystemInstruction}
        thinkingBudget={props.thinkingBudget}
        setThinkingBudget={props.setThinkingBudget}
        thinkingLevel={props.thinkingLevel}
        setThinkingLevel={props.setThinkingLevel}
        showThoughts={props.showThoughts}
        setShowThoughts={props.setShowThoughts}
        temperature={props.temperature}
        setTemperature={props.setTemperature}
        topP={props.topP}
        setTopP={props.setTopP}
        topK={props.topK}
        setTopK={props.setTopK}
        t={t}
        mediaResolution={props.mediaResolution}
        setMediaResolution={props.setMediaResolution}
      />

      <div className="pt-6 border-t border-[var(--theme-border-secondary)] space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)] flex items-center gap-2">
          <Languages size={14} strokeWidth={1.5} />
          {t('settingsTranslationSectionTitle')}
        </h4>
        <Select
          id="translation-target-language-select"
          label=""
          layout="horizontal"
          labelContent={
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--theme-text-primary)]">
              {t('settings_translationTargetLanguage_label')}
            </div>
          }
          value={props.translationTargetLanguage}
          onChange={(e) => props.setTranslationTargetLanguage(e.target.value as TranslationTargetLanguage)}
          className="py-3"
        >
          {TRANSLATION_TARGET_LANGUAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.labelKey)}
            </option>
          ))}
        </Select>
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
            checked={props.autoCanvasVisualization}
            onChange={props.setAutoCanvasVisualization}
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
            value={props.autoCanvasModelId}
            onChange={(e) => props.setAutoCanvasModelId(e.target.value)}
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
        <SafetySection safetySettings={props.safetySettings} setSafetySettings={props.setSafetySettings} t={t} />
      </div>
    </div>
  );
};
