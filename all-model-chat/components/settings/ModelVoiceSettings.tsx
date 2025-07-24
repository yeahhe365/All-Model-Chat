import React from 'react';
import { ModelOption } from '../../types';
import { Loader2, Info, Mic, Volume2 } from 'lucide-react';
import { AVAILABLE_TTS_VOICES, AVAILABLE_TRANSCRIPTION_MODELS } from '../../constants/appConstants';
import { getResponsiveValue } from '../../utils/appUtils';
import { Tooltip } from './shared/Tooltip';
import { Select } from './shared/Tooltip';

interface ModelVoiceSettingsProps {
  modelId: string;
  setModelId: (value: string) => void;
  isModelsLoading: boolean;
  modelsLoadingError: string | null;
  availableModels: ModelOption[];
  transcriptionModelId: string;
  setTranscriptionModelId: (value: string) => void;
  isTranscriptionThinkingEnabled: boolean;
  setIsTranscriptionThinkingEnabled: (value: boolean) => void;
  ttsVoice: string;
  setTtsVoice: (value: string) => void;
  t: (key: string) => string;
}

export const ModelVoiceSettings: React.FC<ModelVoiceSettingsProps> = ({
  modelId, setModelId, isModelsLoading, modelsLoadingError, availableModels,
  transcriptionModelId, setTranscriptionModelId, isTranscriptionThinkingEnabled, setIsTranscriptionThinkingEnabled,
  ttsVoice, setTtsVoice, t
}) => {
  const iconSize = getResponsiveValue(14, 16);

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="model-select" className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5">{t('settingsDefaultModel')}</label>
        {isModelsLoading ? (
          <div className="flex items-center justify-start bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] text-[var(--theme-text-secondary)] text-sm rounded-lg p-2 w-full">
            <Loader2 size={iconSize} className="animate-spin mr-2.5 text-[var(--theme-text-link)]" />
            <span>{t('loading')}</span>
          </div>
        ) : modelsLoadingError ? (
            <div className="text-sm text-[var(--theme-text-danger)] p-2 bg-[var(--theme-bg-danger)] bg-opacity-20 border border-[var(--theme-bg-danger)] rounded-md">{modelsLoadingError}</div>
        ) : (
          <Select
            id="model-select"
            label="" // Label is provided externally
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            disabled={availableModels.length === 0}
            aria-label="Select AI Model for current or new chats"
          >
            {availableModels.map((model) => ( <option key={model.id} value={model.id}>{model.isPinned ? '📌 ' : ''}{model.name}</option> ))}
            {availableModels.length === 0 && <option value="" disabled>{t('chatBehavior_model_noModels')}</option>}
          </Select>
        )}
      </div>
      <Select
        id="transcription-model-select"
        label=""
        labelContent={
          <span className='flex items-center'>
            <Mic size={iconSize-2} className="mr-2" /> {t('chatBehavior_voiceModel_label')}
            <Tooltip text={t('chatBehavior_voiceModel_tooltip')}>
              <Info size={12} className="text-[var(--theme-text-tertiary)] cursor-help" />
            </Tooltip>
          </span>
        }
        value={transcriptionModelId}
        onChange={(e) => setTranscriptionModelId(e.target.value)}
        aria-label="Select AI Model for voice input transcription"
      >
        {AVAILABLE_TRANSCRIPTION_MODELS.map((model) => ( <option key={model.id} value={model.id}>{model.name}</option>))}
      </Select>
       <label htmlFor="transcription-thinking-toggle" className="flex items-center justify-between py-1 cursor-pointer">
        <span className="text-sm font-medium text-[var(--theme-text-secondary)] flex items-center">
          {t('settingsTranscriptionThinking')}
          <Tooltip text={t('chatBehavior_transcriptionThinking_tooltip')}>
            <Info size={12} className="text-[var(--theme-text-tertiary)] cursor-help" />
          </Tooltip>
        </span>
        <div className="relative">
          <input id="transcription-thinking-toggle" type="checkbox" className="sr-only peer" checked={isTranscriptionThinkingEnabled} onChange={() => setIsTranscriptionThinkingEnabled(!isTranscriptionThinkingEnabled)} />
          <div className="w-11 h-6 bg-[var(--theme-bg-input)] rounded-full peer peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-offset-2 peer-focus:ring-offset-[var(--theme-bg-secondary)] peer-focus:ring-[var(--theme-border-focus)] peer-checked:bg-[var(--theme-bg-accent)]"></div>
          <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out peer-checked:translate-x-5"></div>
        </div>
      </label>
      <Select
        id="tts-voice-select"
        label=""
        labelContent={
          <span className="flex items-center">
            <Volume2 size={iconSize-2} className="mr-2" /> {t('settingsTtsVoice')}
          </span>
        }
        value={ttsVoice}
        onChange={(e) => setTtsVoice(e.target.value)}
        aria-label="Select TTS Voice for speech generation"
      >
        {AVAILABLE_TTS_VOICES.map((voice) => ( <option key={voice.id} value={voice.id}>{voice.name}</option> ))}
      </Select>
    </div>
  );
};