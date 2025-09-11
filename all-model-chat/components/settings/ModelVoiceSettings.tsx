import React from 'react';
import { ModelOption } from '../../types';
import { Loader2, Info, Mic, Volume2 } from 'lucide-react';
import { AVAILABLE_TTS_VOICES, AVAILABLE_TRANSCRIPTION_MODELS, AVAILABLE_TRANSCRIPTION_LANGUAGES } from '../../constants/appConstants';
import { getResponsiveValue } from '../../utils/appUtils';
import { Tooltip, Select, Toggle } from './shared/Tooltip';

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
  useFilesApiForImages: boolean;
  setUseFilesApiForImages: (value: boolean) => void;
  generateQuadImages: boolean;
  setGenerateQuadImages: (value: boolean) => void;
  ttsVoice: string;
  setTtsVoice: (value: string) => void;
  t: (key: string) => string;
  enableItn: boolean;
  setEnableItn: (value: boolean) => void;
  transcriptionLanguage: string;
  setTranscriptionLanguage: (value: string) => void;
}

export const ModelVoiceSettings: React.FC<ModelVoiceSettingsProps> = ({
  modelId, setModelId, isModelsLoading, modelsLoadingError, availableModels,
  transcriptionModelId, setTranscriptionModelId, isTranscriptionThinkingEnabled, setIsTranscriptionThinkingEnabled,
  useFilesApiForImages, setUseFilesApiForImages,
  generateQuadImages, setGenerateQuadImages,
  ttsVoice, setTtsVoice, 
  enableItn, setEnableItn,
  transcriptionLanguage, setTranscriptionLanguage,
  t
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
      <Select
        id="transcription-language-select"
        label=""
        labelContent={<span className='flex items-center'>{t('settings_transcriptionLanguage_label')}</span>}
        value={transcriptionLanguage}
        onChange={(e) => setTranscriptionLanguage(e.target.value)}
        aria-label="Select language for voice input transcription"
      >
        {AVAILABLE_TRANSCRIPTION_LANGUAGES.map((lang) => ( <option key={lang.id} value={lang.id}>{lang.name}</option>))}
      </Select>
       <label htmlFor="transcription-thinking-toggle" className="flex items-center justify-between py-1 cursor-pointer">
        <span className="text-sm font-medium text-[var(--theme-text-secondary)] flex items-center">
          {t('settingsTranscriptionThinking')}
          <Tooltip text={t('chatBehavior_transcriptionThinking_tooltip')}>
            <Info size={12} className="text-[var(--theme-text-tertiary)] cursor-help" />
          </Tooltip>
        </span>
        <Toggle id="transcription-thinking-toggle" checked={isTranscriptionThinkingEnabled} onChange={setIsTranscriptionThinkingEnabled} />
      </label>
       <label htmlFor="enable-itn-toggle" className="flex items-center justify-between py-1 cursor-pointer">
        <span className="text-sm font-medium text-[var(--theme-text-secondary)] flex items-center">
            {t('settings_enableItn_label')}
          <Tooltip text={t('settings_enableItn_tooltip')}>
            <Info size={12} className="text-[var(--theme-text-tertiary)] cursor-help" />
          </Tooltip>
        </span>
        <Toggle id="enable-itn-toggle" checked={enableItn} onChange={setEnableItn} />
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
      <label htmlFor="use-files-api-toggle" className="flex items-center justify-between py-1 cursor-pointer">
        <span className="text-sm font-medium text-[var(--theme-text-secondary)] flex items-center">
          {t('settings_useFilesApiForImages_label')}
          <Tooltip text={t('settings_useFilesApiForImages_tooltip')}>
            <Info size={12} className="text-[var(--theme-text-tertiary)] cursor-help" />
          </Tooltip>
        </span>
        <Toggle id="use-files-api-toggle" checked={useFilesApiForImages} onChange={setUseFilesApiForImages} />
      </label>
      <label htmlFor="quad-image-toggle" className="flex items-center justify-between py-1 cursor-pointer">
        <span className="text-sm font-medium text-[var(--theme-text-secondary)] flex items-center">
          {t('settings_generateQuadImages_label')}
          <Tooltip text={t('settings_generateQuadImages_tooltip')}>
            <Info size={12} className="text-[var(--theme-text-tertiary)] cursor-help" />
          </Tooltip>
        </span>
        <Toggle id="quad-image-toggle" checked={generateQuadImages} onChange={setGenerateQuadImages} />
      </label>
    </div>
  );
};