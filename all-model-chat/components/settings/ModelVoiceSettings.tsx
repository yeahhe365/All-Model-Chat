
import React, { useState } from 'react';
import { ModelOption } from '../../types';
import { Info, Maximize2, Image as ImageIcon } from 'lucide-react';
import { Tooltip, Select } from '../shared/Tooltip';
import { ModelSelector } from './ModelSelector';
import { ThinkingControl } from './ThinkingControl';
import { VoiceControl } from './VoiceControl';
import { SETTINGS_INPUT_CLASS } from '../../constants/appConstants';
import { TextEditorModal } from '../modals/TextEditorModal';
import { MediaResolution } from '../../types/settings';

interface ModelVoiceSettingsProps {
  modelId: string;
  setModelId: (id: string) => void;
  availableModels: ModelOption[];
  transcriptionModelId: string;
  setTranscriptionModelId: (value: string) => void;
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
  setAvailableModels: (models: ModelOption[]) => void;
  mediaResolution?: MediaResolution;
  setMediaResolution?: (resolution: MediaResolution) => void;
}

export const ModelVoiceSettings: React.FC<ModelVoiceSettingsProps> = (props) => {
  const {
    modelId, setModelId, availableModels,
    transcriptionModelId, setTranscriptionModelId,
    ttsVoice, setTtsVoice, 
    systemInstruction, setSystemInstruction,
    thinkingBudget, setThinkingBudget,
    thinkingLevel, setThinkingLevel,
    showThoughts, setShowThoughts,
    temperature, setTemperature,
    topP, setTopP,
    t,
    setAvailableModels,
    mediaResolution,
    setMediaResolution
  } = props;

  const [isSystemPromptExpanded, setIsSystemPromptExpanded] = useState(false);

  const inputBaseClasses = "w-full p-2.5 border rounded-lg transition-all duration-200 focus:ring-2 focus:ring-offset-0 text-sm";
  const isSystemPromptSet = systemInstruction && systemInstruction.trim() !== "";

  return (
    <div className="space-y-8">
      {/* Model Selection Group */}
      <div className="space-y-4">
          <ModelSelector
            availableModels={availableModels}
            selectedModelId={modelId}
            onSelectModel={setModelId}
            setAvailableModels={setAvailableModels}
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
                <div className="flex justify-between items-center mb-2">
                    <label htmlFor="system-prompt-input" className="text-sm font-medium text-[var(--theme-text-primary)] flex items-center">
                        <span>{t('settingsSystemPrompt')}</span>
                        {isSystemPromptSet && <span className="w-2 h-2 ml-2 bg-[var(--theme-text-success)] rounded-full animate-pulse" title="Active" />}
                    </label>
                    <button
                        type="button"
                        onClick={() => setIsSystemPromptExpanded(true)}
                        className="p-1.5 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded-md transition-colors"
                        title="Expand Editor"
                    >
                        <Maximize2 size={14} />
                    </button>
                </div>
                <textarea
                  id="system-prompt-input" value={systemInstruction} onChange={(e) => setSystemInstruction(e.target.value)}
                  rows={3} className={`${inputBaseClasses} ${SETTINGS_INPUT_CLASS} resize-y min-h-[80px] custom-scrollbar`}
                  placeholder={t('chatBehavior_systemPrompt_placeholder')}
                  aria-label="System prompt text area"
                />
            </div>

            <TextEditorModal
                isOpen={isSystemPromptExpanded}
                onClose={() => setIsSystemPromptExpanded(false)}
                title={t('settingsSystemPrompt')}
                value={systemInstruction}
                onChange={setSystemInstruction}
                placeholder={t('chatBehavior_systemPrompt_placeholder')}
                t={t}
            />

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

                {setMediaResolution && mediaResolution && (
                    <Select
                        id="media-resolution-select"
                        label=""
                        layout="horizontal"
                        labelContent={
                            <span className='flex items-center text-sm font-medium text-[var(--theme-text-primary)]'>
                                <ImageIcon size={14} className="mr-2 text-[var(--theme-text-secondary)]" />
                                {t('settingsMediaResolution')}
                                <Tooltip text={t('settingsMediaResolution_tooltip')}>
                                    <Info size={14} className="ml-2 text-[var(--theme-text-tertiary)] cursor-help" strokeWidth={1.5} />
                                </Tooltip>
                            </span>
                        }
                        value={mediaResolution}
                        onChange={(e) => setMediaResolution(e.target.value as MediaResolution)}
                    >
                        <option value={MediaResolution.MEDIA_RESOLUTION_UNSPECIFIED}>{t('mediaResolution_unspecified')}</option>
                        <option value={MediaResolution.MEDIA_RESOLUTION_LOW}>{t('mediaResolution_low')}</option>
                        <option value={MediaResolution.MEDIA_RESOLUTION_MEDIUM}>{t('mediaResolution_medium')}</option>
                        <option value={MediaResolution.MEDIA_RESOLUTION_HIGH}>{t('mediaResolution_high')}</option>
                        <option value={MediaResolution.MEDIA_RESOLUTION_ULTRA_HIGH}>{t('mediaResolution_ultra_high')}</option>
                    </Select>
                )}
            </div>
      </div>

      {/* Voice & Audio Group */}
      <VoiceControl
        transcriptionModelId={transcriptionModelId}
        setTranscriptionModelId={setTranscriptionModelId}
        ttsVoice={ttsVoice}
        setTtsVoice={setTtsVoice}
        t={t}
      />
    </div>
  );
};