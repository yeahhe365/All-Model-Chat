import React from 'react';
import { ModelOption } from '../../types';
import { Loader2, Info, Mic, Volume2 } from 'lucide-react';
import { AVAILABLE_TTS_VOICES, AVAILABLE_TRANSCRIPTION_MODELS } from '../../constants/appConstants';
import { getResponsiveValue } from '../../utils/appUtils';
import { Tooltip } from './shared/Tooltip';

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
  const inputBaseClasses = "w-full p-2 border rounded-md focus:ring-2 focus:border-[var(--theme-border-focus)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] text-sm";
  const enabledInputClasses = "bg-[var(--theme-bg-input)] border-[var(--theme-border-secondary)] focus:ring-[var(--theme-border-focus)]";
  const iconSize = getResponsiveValue(14, 16);

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="model-select" className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5">{t('settingsDefaultModel')}</label>
        {isModelsLoading ? (
          <div className="flex items-center justify-start bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] text-[var(--theme-text-secondary)] text-sm rounded-lg p-2 w-full">
            <Loader2 size={iconSize} className="animate-spin mr-2.5 text-[var(--theme-text-link)]" />
            <span>{t('chatBehavior_model_loading')}</span>
          </div>
        ) : modelsLoadingError ? (
            <div className="text-sm text-[var(--theme-text-danger)] p-2 bg-[var(--theme-bg-danger)] bg-opacity-20 border border-[var(--theme-bg-danger)] rounded-md">{modelsLoadingError}</div>
        ) : (
          <div className="relative">
            <select
              id="model-select" value={modelId} onChange={(e) => setModelId(e.target.value)}
              className={`${inputBaseClasses} ${enabledInputClasses} appearance-none pr-8`}
              disabled={availableModels.length === 0}
              aria-label="Select AI Model for current or new chats"
            >
              {availableModels.map((model) => ( <option key={model.id} value={model.id}>{model.isPinned ? '📌 ' : ''}{model.name}</option> ))}
              {availableModels.length === 0 && <option value="" disabled>{t('chatBehavior_model_noModels')}</option>}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[var(--theme-text-tertiary)]">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.516 7.548c.436-.446 1.043-.48 1.576 0L10 10.405l2.908-2.857c.533-.48 1.14-.446 1.576 0 .436.445.408 1.197 0 1.615l-3.695 3.63c-.533.48-1.14.446-1.576 0L5.516 9.163c-.408-.418-.436-1.17 0-1.615z"/></svg>
            </div>
          </div>
        )}
      </div>
      <div>
        <label htmlFor="transcription-model-select" className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5">
            <span className='flex items-center'>
                <Mic size={iconSize-2} className="mr-2" /> {t('chatBehavior_voiceModel_label')}
                <Tooltip text={t('chatBehavior_voiceModel_tooltip')}>
                    <Info size={12} className="text-[var(--theme-text-tertiary)] cursor-help" />
                </Tooltip>
            </span>
        </label>
        <div className="relative">
          <select
            id="transcription-model-select" value={transcriptionModelId} onChange={(e) => setTranscriptionModelId(e.target.value)}
            className={`${inputBaseClasses} ${enabledInputClasses} appearance-none pr-8`}
            aria-label="Select AI Model for voice input transcription"
          >
            {AVAILABLE_TRANSCRIPTION_MODELS.map((model) => ( <option key={model.id} value={model.id}>{model.name}</option>))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[var(--theme-text-tertiary)]">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.516 7.548c.436-.446 1.043-.48 1.576 0L10 10.405l2.908-2.857c.533-.48 1.14-.446 1.576 0 .436.445.408 1.197 0 1.615l-3.695 3.63c-.533.48-1.14.446-1.576 0L5.516 9.163c-.408-.418-.436-1.17 0-1.615z"/></svg>
          </div>
        </div>
      </div>
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
      <div>
        <label htmlFor="tts-voice-select" className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5">
          <span className="flex items-center">
            <Volume2 size={iconSize-2} className="mr-2" /> {t('settingsTtsVoice')}
          </span>
        </label>
        <div className="relative">
          <select
            id="tts-voice-select" value={ttsVoice} onChange={(e) => setTtsVoice(e.target.value)}
            className={`${inputBaseClasses} ${enabledInputClasses} appearance-none pr-8`}
            aria-label="Select TTS Voice for speech generation"
          >
            {AVAILABLE_TTS_VOICES.map((voice) => ( <option key={voice.id} value={voice.id}>{voice.name}</option> ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[var(--theme-text-tertiary)]">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.516 7.548c.436-.446 1.043-.48 1.576 0L10 10.405l2.908-2.857c.533-.48 1.14-.446 1.576 0 .436.445.408 1.197 0 1.615l-3.695 3.63c-.533.48-1.14.446-1.576 0L5.516 9.163c-.408-.418-.436-1.17 0-1.615z"/></svg>
          </div>
        </div>
      </div>
    </div>
  );
};
