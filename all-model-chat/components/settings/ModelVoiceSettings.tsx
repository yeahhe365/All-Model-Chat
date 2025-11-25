
import React from 'react';
import { ModelOption } from '../../types';
import { Info } from 'lucide-react';
import { Tooltip, Toggle } from '../shared/Tooltip';
import { ModelSelector } from './ModelSelector';
import { ThinkingControl } from './ThinkingControl';
import { VoiceControl } from './VoiceControl';
import { SETTINGS_INPUT_CLASS } from '../../constants/appConstants';

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
  thinkingBudget: number;
  setThinkingBudget: (value: number) => void;
  thinkingLevel?: 'LOW' | 'HIGH';
  setThinkingLevel?: (value: 'LOW' | 'HIGH') => void;
  showThoughts: boolean;
  setShowThoughts: (value: boolean) => void;
  temperature: number;
  setTemperature: (value: number) => void;
  topP: number;
  setTopP: (value: number) => void;
}

export const ModelVoiceSettings: React.FC<ModelVoiceSettingsProps> = (props) => {
  const {
    modelId, setModelId, isModelsLoading, modelsLoadingError, availableModels,
    transcriptionModelId, setTranscriptionModelId, isTranscriptionThinkingEnabled, setIsTranscriptionThinkingEnabled,
    useFilesApiForImages, setUseFilesApiForImages,
    ttsVoice, setTtsVoice, 
    systemInstruction, setSystemInstruction,
    thinkingBudget, setThinkingBudget,
    thinkingLevel, setThinkingLevel,
    showThoughts, setShowThoughts,
    temperature, setTemperature,
    topP, setTopP,
    t
  } = props;

  const inputBaseClasses = "w-full p-2.5 border rounded-lg transition-all duration-200 focus:ring-2 focus:ring-offset-0 text-sm";
  const isSystemPromptSet = systemInstruction && systemInstruction.trim() !== "";

  return (
    <div className="space-y-8">
      {/* Model Selection Group */}
      <div className="space-y-4">
          <ModelSelector
            modelId={modelId}
            setModelId={setModelId}
            isModelsLoading={isModelsLoading}
            modelsLoadingError={modelsLoadingError}
            availableModels={availableModels}
            t={t}
          />

          {/* Thinking Controls */}
          <ThinkingControl
            modelId={modelId}
            thinkingBudget={thinkingBudget}
            setThinkingBudget={setThinkingBudget}
            thinkingLevel={thinkingLevel}
            setThinkingLevel={setThinkingLevel}
            showThoughts={showThoughts}
            setShowThoughts={setShowThoughts}
            t={t}
          />

          <div className="pt-2">
                <label htmlFor="system-prompt-input" className="block text-sm font-medium text-[var(--theme-text-primary)] mb-2 flex items-center justify-between">
                    <span>{t('settingsSystemPrompt')}</span>
                    {isSystemPromptSet && <span className="w-2 h-2 bg-[var(--theme-text-success)] rounded-full animate-pulse" title="Active" />}
                </label>
                <textarea
                  id="system-prompt-input" value={systemInstruction} onChange={(e) => setSystemInstruction(e.target.value)}
                  rows={3} className={`${inputBaseClasses} ${SETTINGS_INPUT_CLASS} resize-y min-h-[80px] custom-scrollbar`}
                  placeholder={t('chatBehavior_systemPrompt_placeholder')}
                  aria-label="System prompt text area"
                />
            </div>

            {/* Parameters Sliders */}
            <div className="pt-4 space-y-5">
                <div>
                    <div className="flex justify-between mb-2">
                        <label htmlFor="temperature-slider" className="text-sm font-medium text-[var(--theme-text-primary)] flex items-center">
                            {t('settingsTemperature')}
                            <Tooltip text={t('chatBehavior_temp_tooltip')}>
                                <Info size={14} className="ml-2 text-[var(--theme-text-tertiary)] cursor-help" strokeWidth={1.5} />
                            </Tooltip>
                        </label>
                        <span className="text-sm font-mono text-[var(--theme-text-link)]">{Number(temperature).toFixed(2)}</span>
                    </div>
                    <input id="temperature-slider" type="range" min="0" max="2" step="0.05" value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-[var(--theme-border-secondary)] rounded-lg appearance-none cursor-pointer accent-[var(--theme-bg-accent)] hover:accent-[var(--theme-bg-accent-hover)]" />
                </div>

                <div>
                    <div className="flex justify-between mb-2">
                        <label htmlFor="top-p-slider" className="text-sm font-medium text-[var(--theme-text-primary)] flex items-center">
                            {t('settingsTopP')}
                            <Tooltip text={t('chatBehavior_topP_tooltip')}>
                                <Info size={14} className="ml-2 text-[var(--theme-text-tertiary)] cursor-help" strokeWidth={1.5} />
                            </Tooltip>
                        </label>
                        <span className="text-sm font-mono text-[var(--theme-text-link)]">{Number(topP).toFixed(2)}</span>
                    </div>
                    <input id="top-p-slider" type="range" min="0" max="1" step="0.05" value={topP} onChange={(e) => setTopP(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-[var(--theme-border-secondary)] rounded-lg appearance-none cursor-pointer accent-[var(--theme-bg-accent)] hover:accent-[var(--theme-bg-accent-hover)]" />
                </div>
            </div>
            
            <div className="grid grid-cols-1 gap-2 pt-2">
                 <label htmlFor="use-files-api-toggle" className="flex items-center justify-between py-2 rounded-lg hover:bg-[var(--theme-bg-tertiary)]/50 transition-colors cursor-pointer px-1">
                    <span className="text-sm text-[var(--theme-text-secondary)] flex items-center">
                    {t('settings_useFilesApiForImages_label')}
                    <Tooltip text={t('settings_useFilesApiForImages_tooltip')}>
                        <Info size={14} className="ml-2 text-[var(--theme-text-tertiary)] cursor-help" strokeWidth={1.5} />
                    </Tooltip>
                    </span>
                    <Toggle id="use-files-api-toggle" checked={useFilesApiForImages} onChange={setUseFilesApiForImages} />
                </label>
            </div>
      </div>

      {/* Voice & Audio Group */}
      <VoiceControl
        transcriptionModelId={transcriptionModelId}
        setTranscriptionModelId={setTranscriptionModelId}
        isTranscriptionThinkingEnabled={isTranscriptionThinkingEnabled}
        setIsTranscriptionThinkingEnabled={setIsTranscriptionThinkingEnabled}
        ttsVoice={ttsVoice}
        setTtsVoice={setTtsVoice}
        t={t}
      />
    </div>
  );
};
