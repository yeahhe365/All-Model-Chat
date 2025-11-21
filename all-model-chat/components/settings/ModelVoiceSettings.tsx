import React from 'react';
import { ModelOption } from '../../types';
import { Loader2, Info, Mic, Bot } from 'lucide-react';
import { AVAILABLE_TTS_VOICES, AVAILABLE_TRANSCRIPTION_MODELS } from '../../constants/appConstants';
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
  systemInstruction: string;
  setSystemInstruction: (value: string) => void;
}

export const ModelVoiceSettings: React.FC<ModelVoiceSettingsProps> = ({
  modelId, setModelId, isModelsLoading, modelsLoadingError, availableModels,
  transcriptionModelId, setTranscriptionModelId, isTranscriptionThinkingEnabled, setIsTranscriptionThinkingEnabled,
  useFilesApiForImages, setUseFilesApiForImages,
  generateQuadImages, setGenerateQuadImages,
  ttsVoice, setTtsVoice, 
  systemInstruction, setSystemInstruction,
  t
}) => {
  const iconSize = getResponsiveValue(16, 18);
  const inputBaseClasses = "w-full p-2.5 border rounded-lg transition-all duration-200 focus:ring-2 focus:ring-offset-0 text-sm";
  const enabledInputClasses = "bg-[var(--theme-bg-input)] border-[var(--theme-border-secondary)] focus:border-[var(--theme-border-focus)] focus:ring-[var(--theme-border-focus)]/20 text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)]";
  const isSystemPromptSet = systemInstruction && systemInstruction.trim() !== "";

  return (
    <div className="space-y-8">
      {/* Model Selection Group */}
      <div className="space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)] flex items-center gap-2">
              <Bot size={14} strokeWidth={1.5} /> Model Selection
          </h4>
          <div className="p-4 bg-[var(--theme-bg-tertiary)]/30 rounded-xl border border-[var(--theme-border-secondary)] space-y-4">
            <div>
                <label htmlFor="model-select" className="block text-sm font-medium text-[var(--theme-text-primary)] mb-2">{t('settingsDefaultModel')}</label>
                {isModelsLoading ? (
                <div className="flex items-center justify-start bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] text-[var(--theme-text-secondary)] text-sm rounded-lg p-2.5 w-full">
                    <Loader2 size={iconSize} className="animate-spin mr-2.5 text-[var(--theme-text-link)]" strokeWidth={1.5} />
                    <span>{t('loading')}</span>
                </div>
                ) : modelsLoadingError ? (
                    <div className="text-sm text-[var(--theme-text-danger)] p-2 bg-[var(--theme-bg-danger)] bg-opacity-20 border border-[var(--theme-bg-danger)] rounded-md">{modelsLoadingError}</div>
                ) : (
                <div className="relative">
                    <Select
                        id="model-select"
                        label="" 
                        value={modelId}
                        onChange={(e) => setModelId(e.target.value)}
                        disabled={availableModels.length === 0}
                        aria-label="Select AI Model for current or new chats"
                        className="font-medium"
                    >
                        {availableModels.map((model) => ( <option key={model.id} value={model.id}>{model.isPinned ? '📌 ' : ''}{model.name}</option> ))}
                        {availableModels.length === 0 && <option value="" disabled>{t('chatBehavior_model_noModels')}</option>}
                    </Select>
                </div>
                )}
            </div>

            <div>
                <label htmlFor="system-prompt-input" className="block text-sm font-medium text-[var(--theme-text-primary)] mb-2 flex items-center justify-between">
                    <span>{t('settingsSystemPrompt')}</span>
                    {isSystemPromptSet && <span className="w-2 h-2 bg-[var(--theme-text-success)] rounded-full animate-pulse" title="Active" />}
                </label>
                <textarea
                  id="system-prompt-input" value={systemInstruction} onChange={(e) => setSystemInstruction(e.target.value)}
                  rows={3} className={`${inputBaseClasses} ${enabledInputClasses} resize-y min-h-[80px] custom-scrollbar`}
                  placeholder={t('chatBehavior_systemPrompt_placeholder')}
                  aria-label="System prompt text area"
                />
            </div>
            
            <div className="grid grid-cols-1 gap-3 pt-2 border-t border-[var(--theme-border-secondary)]/50">
                 <label htmlFor="use-files-api-toggle" className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[var(--theme-bg-tertiary)]/50 transition-colors cursor-pointer">
                    <span className="text-sm text-[var(--theme-text-secondary)] flex items-center">
                    {t('settings_useFilesApiForImages_label')}
                    <Tooltip text={t('settings_useFilesApiForImages_tooltip')}>
                        <Info size={14} className="ml-2 text-[var(--theme-text-tertiary)] cursor-help" strokeWidth={1.5} />
                    </Tooltip>
                    </span>
                    <Toggle id="use-files-api-toggle" checked={useFilesApiForImages} onChange={setUseFilesApiForImages} />
                </label>
                <label htmlFor="quad-image-toggle" className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[var(--theme-bg-tertiary)]/50 transition-colors cursor-pointer">
                    <span className="text-sm text-[var(--theme-text-secondary)] flex items-center">
                    {t('settings_generateQuadImages_label')}
                    <Tooltip text={t('settings_generateQuadImages_tooltip')}>
                        <Info size={14} className="ml-2 text-[var(--theme-text-tertiary)] cursor-help" strokeWidth={1.5} />
                    </Tooltip>
                    </span>
                    <Toggle id="quad-image-toggle" checked={generateQuadImages} onChange={setGenerateQuadImages} />
                </label>
            </div>
          </div>
      </div>

      {/* Voice & Audio Group */}
      <div className="space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)] flex items-center gap-2">
              <Mic size={14} strokeWidth={1.5} /> Audio & Speech
          </h4>
          
          <div className="p-4 bg-[var(--theme-bg-tertiary)]/30 rounded-xl border border-[var(--theme-border-secondary)] space-y-5">
              <Select
                id="transcription-model-select"
                label=""
                labelContent={
                  <span className='flex items-center text-sm font-medium text-[var(--theme-text-primary)]'>
                     {t('chatBehavior_voiceModel_label')}
                    <Tooltip text={t('chatBehavior_voiceModel_tooltip')}>
                      <Info size={14} className="ml-2 text-[var(--theme-text-tertiary)] cursor-help" strokeWidth={1.5} />
                    </Tooltip>
                  </span>
                }
                value={transcriptionModelId}
                onChange={(e) => setTranscriptionModelId(e.target.value)}
              >
                {AVAILABLE_TRANSCRIPTION_MODELS.map((model) => ( <option key={model.id} value={model.id}>{model.name}</option>))}
              </Select>

              <div style={{ animation: 'fadeIn 0.3s ease-out both' }}>
                   <label htmlFor="transcription-thinking-toggle" className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--theme-bg-tertiary)]/30 border border-[var(--theme-border-secondary)] cursor-pointer">
                    <span className="text-sm text-[var(--theme-text-secondary)] flex items-center">
                      {t('settingsTranscriptionThinking')}
                      <Tooltip text={t('chatBehavior_transcriptionThinking_tooltip')}>
                        <Info size={14} className="ml-2 text-[var(--theme-text-tertiary)] cursor-help" strokeWidth={1.5} />
                      </Tooltip>
                    </span>
                    <Toggle id="transcription-thinking-toggle" checked={isTranscriptionThinkingEnabled} onChange={setIsTranscriptionThinkingEnabled} />
                  </label>
              </div>

              <Select
                id="tts-voice-select"
                label=""
                labelContent={
                  <span className="flex items-center text-sm font-medium text-[var(--theme-text-primary)]">
                    {t('settingsTtsVoice')}
                  </span>
                }
                value={ttsVoice}
                onChange={(e) => setTtsVoice(e.target.value)}
              >
                {AVAILABLE_TTS_VOICES.map((voice) => ( <option key={voice.id} value={voice.id}>{voice.name}</option> ))}
              </Select>
          </div>
      </div>
    </div>
  );
};