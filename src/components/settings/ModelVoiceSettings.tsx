import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ModelOption } from '../../types';
import { Info, Maximize2, Image as ImageIcon } from 'lucide-react';
import { Tooltip } from '../shared/Tooltip';
import { Select } from '../shared/Select';
import { ModelSelector } from './controls/ModelSelector';
import { ThinkingControl } from './controls/thinking/ThinkingControl';
import { VoiceControl } from './controls/VoiceControl';
import { SETTINGS_INPUT_CLASS } from '../../constants/appConstants';
import { TextEditorModal } from '../modals/TextEditorModal';
import { MediaResolution } from '../../types/settings';
import { getModelCapabilities } from '../../utils/modelHelpers';
import { useI18n } from '../../contexts/I18nContext';
import { SMALL_ICON_BUTTON_CLASS } from '../../constants/appConstants';

interface ModelVoiceSettingsProps {
  modelId: string;
  setModelId: (id: string) => void;
  availableModels: ModelOption[];
  transcriptionModelId: string;
  setTranscriptionModelId: (value: string) => void;
  ttsVoice: string;
  setTtsVoice: (value: string) => void;
  t: (key: string) => string;
  systemInstruction: string;
  setSystemInstruction: (value: string) => void;
  thinkingBudget: number;
  setThinkingBudget: (value: number) => void;
  thinkingLevel?: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH';
  setThinkingLevel?: (value: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH') => void;
  showThoughts: boolean;
  setShowThoughts: (value: boolean) => void;
  temperature: number;
  setTemperature: (value: number) => void;
  topP: number;
  setTopP: (value: number) => void;
  topK: number;
  setTopK: (value: number) => void;
  setAvailableModels: (models: ModelOption[]) => void;
  mediaResolution?: MediaResolution;
  setMediaResolution?: (resolution: MediaResolution) => void;
}

export const ModelVoiceSettings: React.FC<ModelVoiceSettingsProps> = (props) => {
  const {
    modelId,
    setModelId,
    availableModels,
    transcriptionModelId,
    setTranscriptionModelId,
    ttsVoice,
    setTtsVoice,
    systemInstruction,
    setSystemInstruction,
    thinkingBudget,
    setThinkingBudget,
    thinkingLevel,
    setThinkingLevel,
    showThoughts,
    setShowThoughts,
    temperature,
    setTemperature,
    topP,
    setTopP,
    topK,
    setTopK,
    t,
    setAvailableModels,
    mediaResolution,
    setMediaResolution,
  } = props;
  const { t: i18n } = useI18n();

  const [isSystemPromptExpanded, setIsSystemPromptExpanded] = useState(false);
  const skipNextPromptBlurCommitRef = useRef(false);

  // Local state for the large textarea to prevent re-render lag and IME issues
  const [localPrompt, setLocalPrompt] = useState(systemInstruction);

  // Sync local state when the global prop changes (e.g. session switch or scenario load)
  useEffect(() => {
    setLocalPrompt(systemInstruction);
  }, [systemInstruction]);

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalPrompt(e.target.value);
    // We do NOT update the parent on every keystroke to prevent heavy global re-renders
  };

  const handlePromptBlur = () => {
    if (skipNextPromptBlurCommitRef.current) {
      skipNextPromptBlurCommitRef.current = false;
      return;
    }

    // Commit changes to global state only when the user finishes typing
    if (localPrompt !== systemInstruction) {
      setSystemInstruction(localPrompt);
    }
  };

  const commitPromptIfNeeded = useCallback(() => {
    if (localPrompt !== systemInstruction) {
      setSystemInstruction(localPrompt);
    }
  }, [localPrompt, setSystemInstruction, systemInstruction]);

  const handleModelSelectorPointerDownCapture = () => {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLTextAreaElement && activeElement.id === 'system-prompt-input') {
      skipNextPromptBlurCommitRef.current = true;
    }
  };

  const handleModelSelectorClickCapture = () => {
    queueMicrotask(() => {
      commitPromptIfNeeded();
    });
  };

  const handleModelIdChange = useCallback(
    (id: string) => {
      setModelId(id);
    },
    [setModelId],
  );

  const handleOpenExpand = () => {
    // Sync current local edits before opening the separate editor modal
    if (localPrompt !== systemInstruction) {
      setSystemInstruction(localPrompt);
    }
    setIsSystemPromptExpanded(true);
  };

  const inputBaseClasses =
    'w-full p-2.5 border rounded-lg transition-all duration-200 focus:ring-2 focus:ring-offset-0 text-sm';
  const isSystemPromptSet = localPrompt && localPrompt.trim() !== '';

  const capabilities = getModelCapabilities(modelId);
  const isNativeAudio = capabilities.isNativeAudioModel;
  const supportsUltraHighResolution = capabilities.isGemini3 || modelId.toLowerCase().includes('gemini-robotics-er');

  return (
    <div className="space-y-8">
      {/* Model Selection Group */}
      <div className="space-y-4">
        <div
          onPointerDownCapture={handleModelSelectorPointerDownCapture}
          onClickCapture={handleModelSelectorClickCapture}
        >
          <ModelSelector
            availableModels={availableModels}
            selectedModelId={modelId}
            onSelectModel={handleModelIdChange}
            setAvailableModels={setAvailableModels}
          />
        </div>

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
            <label
              htmlFor="system-prompt-input"
              className="text-sm font-medium text-[var(--theme-text-primary)] flex items-center"
            >
              <span>{t('settingsSystemPrompt')}</span>
              {isSystemPromptSet && (
                <span
                  className="w-2 h-2 ml-2 bg-[var(--theme-text-success)] rounded-full animate-pulse"
                  title={i18n('settingsSystemPromptActive')}
                />
              )}
            </label>
            <button
              type="button"
              onClick={handleOpenExpand}
              className={SMALL_ICON_BUTTON_CLASS}
              title={i18n('settingsExpandEditor')}
            >
              <Maximize2 size={14} />
            </button>
          </div>
          <textarea
            id="system-prompt-input"
            value={localPrompt}
            onChange={handlePromptChange}
            onBlur={handlePromptBlur}
            rows={3}
            className={`${inputBaseClasses} ${SETTINGS_INPUT_CLASS} resize-y min-h-[80px] custom-scrollbar`}
            placeholder={t('chatBehavior_systemPrompt_placeholder')}
            aria-label={i18n('settingsSystemPromptAria')}
          />
        </div>

        <TextEditorModal
          isOpen={isSystemPromptExpanded}
          onClose={() => setIsSystemPromptExpanded(false)}
          title={t('settingsSystemPrompt')}
          value={systemInstruction}
          onChange={setSystemInstruction}
          placeholder={t('chatBehavior_systemPrompt_placeholder')}
          confirmLabel={t('settingsSaveAndClose')}
          t={t}
        />

        {/* Parameters Sliders */}
        <div className="pt-4 space-y-5">
          <div>
            <div className="flex justify-between mb-2">
              <label
                htmlFor="temperature-slider"
                className="text-sm font-medium text-[var(--theme-text-primary)] flex items-center"
              >
                {t('settingsTemperature')}
                <Tooltip text={t('chatBehavior_temp_tooltip')}>
                  <Info size={14} className="ml-2 text-[var(--theme-text-tertiary)] cursor-help" strokeWidth={1.5} />
                </Tooltip>
              </label>
              <span className="text-sm font-mono text-[var(--theme-text-link)]">{Number(temperature).toFixed(2)}</span>
            </div>
            <input
              id="temperature-slider"
              type="range"
              min="0"
              max="2"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-[var(--theme-border-secondary)] rounded-lg appearance-none cursor-pointer accent-[var(--theme-bg-accent)] hover:accent-[var(--theme-bg-accent-hover)]"
            />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label
                htmlFor="top-p-slider"
                className="text-sm font-medium text-[var(--theme-text-primary)] flex items-center"
              >
                {t('settingsTopP')}
                <Tooltip text={t('chatBehavior_topP_tooltip')}>
                  <Info size={14} className="ml-2 text-[var(--theme-text-tertiary)] cursor-help" strokeWidth={1.5} />
                </Tooltip>
              </label>
              <span className="text-sm font-mono text-[var(--theme-text-link)]">{Number(topP).toFixed(2)}</span>
            </div>
            <input
              id="top-p-slider"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={topP}
              onChange={(e) => setTopP(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-[var(--theme-border-secondary)] rounded-lg appearance-none cursor-pointer accent-[var(--theme-bg-accent)] hover:accent-[var(--theme-bg-accent-hover)]"
            />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label
                htmlFor="top-k-slider"
                className="text-sm font-medium text-[var(--theme-text-primary)] flex items-center"
              >
                Top K
                <Tooltip text="Limits sampling to the K most probable tokens. Gemma 4 recommends 64. Set to 0 to disable.">
                  <Info size={14} className="ml-2 text-[var(--theme-text-tertiary)] cursor-help" strokeWidth={1.5} />
                </Tooltip>
              </label>
              <span className="text-sm font-mono text-[var(--theme-text-link)]">{topK}</span>
            </div>
            <input
              id="top-k-slider"
              type="range"
              min="0"
              max="128"
              step="1"
              value={topK}
              onChange={(e) => setTopK(parseInt(e.target.value))}
              className="w-full h-1.5 bg-[var(--theme-border-secondary)] rounded-lg appearance-none cursor-pointer accent-[var(--theme-bg-accent)] hover:accent-[var(--theme-bg-accent-hover)]"
            />
          </div>

          {setMediaResolution && mediaResolution && (
            <Select
              id="media-resolution-select"
              label=""
              layout="horizontal"
              labelContent={
                <span className="flex items-center text-sm font-medium text-[var(--theme-text-primary)]">
                  <ImageIcon size={14} className="mr-2 text-[var(--theme-text-secondary)]" />
                  {t('settingsMediaResolution')}
                  <Tooltip
                    text={
                      isNativeAudio
                        ? 'Controls video/audio resolution for Live API.'
                        : t('settingsMediaResolution_tooltip')
                    }
                  >
                    <Info size={14} className="ml-2 text-[var(--theme-text-tertiary)] cursor-help" strokeWidth={1.5} />
                  </Tooltip>
                </span>
              }
              value={mediaResolution}
              onChange={(e) => setMediaResolution(e.target.value as MediaResolution)}
            >
              <option value={MediaResolution.MEDIA_RESOLUTION_UNSPECIFIED}>{t('mediaResolution_unspecified')}</option>
              <option value={MediaResolution.MEDIA_RESOLUTION_LOW}>{t('mediaResolution_low')}</option>
              {!isNativeAudio && (
                <option value={MediaResolution.MEDIA_RESOLUTION_MEDIUM}>{t('mediaResolution_medium')}</option>
              )}
              {!isNativeAudio && (
                <option value={MediaResolution.MEDIA_RESOLUTION_HIGH}>{t('mediaResolution_high')}</option>
              )}
              {!isNativeAudio && supportsUltraHighResolution && (
                <option value={MediaResolution.MEDIA_RESOLUTION_ULTRA_HIGH}>{t('mediaResolution_ultra_high')}</option>
              )}
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
