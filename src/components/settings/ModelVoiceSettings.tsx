import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppSettings, ModelOption } from '../../types';
import { Info, SquarePen, X, Image as ImageIcon } from 'lucide-react';
import { Tooltip } from '../shared/Tooltip';
import { Select } from '../shared/Select';
import { ModelSelector } from './controls/ModelSelector';
import { ThinkingControl } from './controls/thinking/ThinkingControl';
import { VoiceControl } from './controls/VoiceControl';
import { SETTINGS_INPUT_CLASS } from '../../constants/appConstants';
import { TextEditorModal } from '../modals/TextEditorModal';
import { MediaResolution } from '../../types/settings';
import { getCachedModelCapabilities } from '../../stores/modelCapabilitiesStore';
import { useI18n } from '../../contexts/I18nContext';
import { SMALL_ICON_BUTTON_CLASS } from '../../constants/appConstants';
import type { SettingsUpdateHandler } from './settingsTypes';

interface ModelVoiceSettingsProps {
  modelId: string;
  setModelId: (id: string) => void;
  availableModels: ModelOption[];
  setAvailableModels: (models: ModelOption[]) => void;
  currentSettings: AppSettings;
  onUpdateSetting: SettingsUpdateHandler;
}

export const ModelVoiceSettings: React.FC<ModelVoiceSettingsProps> = (props) => {
  const { modelId, setModelId, availableModels, setAvailableModels, currentSettings, onUpdateSetting } = props;
  const {
    transcriptionModelId,
    ttsVoice,
    systemInstruction,
    thinkingBudget,
    thinkingLevel,
    showThoughts,
    temperature,
    topP,
    mediaResolution,
  } = currentSettings;
  const topK = currentSettings.topK ?? 64;
  const { t } = useI18n();

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
      onUpdateSetting('systemInstruction', localPrompt);
    }
  };

  const commitPromptIfNeeded = useCallback(() => {
    if (localPrompt !== systemInstruction) {
      onUpdateSetting('systemInstruction', localPrompt);
    }
  }, [localPrompt, onUpdateSetting, systemInstruction]);

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
      onUpdateSetting('systemInstruction', localPrompt);
    }
    setIsSystemPromptExpanded(true);
  };

  const handleClearPrompt = () => {
    setLocalPrompt('');
    if (localPrompt !== '' || systemInstruction !== '') {
      onUpdateSetting('systemInstruction', '');
    }
  };

  const inputBaseClasses =
    'w-full p-2.5 border rounded-lg transition-all duration-200 focus:ring-2 focus:ring-offset-0 text-sm';
  const isSystemPromptSet = localPrompt && localPrompt.trim() !== '';

  const capabilities = getCachedModelCapabilities(modelId);
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
          setThinkingBudget={(value) => onUpdateSetting('thinkingBudget', value)}
          thinkingLevel={thinkingLevel}
          setThinkingLevel={(value) => onUpdateSetting('thinkingLevel', value)}
          showThoughts={showThoughts}
          setShowThoughts={(value) => onUpdateSetting('showThoughts', value)}
        />

        <div className="pt-2">
          <div className="flex justify-between items-center mb-2">
            <label
              htmlFor="system-prompt-input"
              className="text-sm font-medium text-[var(--theme-text-primary)] flex items-center"
            >
              <span>{t('settingsSystemPrompt')}</span>
              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                  isSystemPromptSet
                    ? 'bg-[var(--theme-bg-success)] text-[var(--theme-text-success)]'
                    : 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-tertiary)]'
                }`}
              >
                {isSystemPromptSet ? t('settingsSystemPromptEnabled') : t('settingsSystemPromptUnset')}
              </span>
            </label>
            <div className="flex items-center gap-1">
              {isSystemPromptSet && (
                <button
                  type="button"
                  onClick={handleClearPrompt}
                  className={`${SMALL_ICON_BUTTON_CLASS} flex h-8 w-8 items-center justify-center hover:text-[var(--theme-text-danger)] hover:bg-[var(--theme-bg-danger)]/10`}
                  title={t('settingsClearSystemPrompt')}
                  aria-label={t('settingsClearSystemPrompt')}
                >
                  <X size={14} />
                </button>
              )}
              <button
                type="button"
                onClick={handleOpenExpand}
                className={`${SMALL_ICON_BUTTON_CLASS} flex h-8 w-8 items-center justify-center hover:text-[var(--theme-text-link)]`}
                title={t('settingsExpandSystemPromptEditor')}
                aria-label={t('settingsExpandSystemPromptEditor')}
              >
                <SquarePen size={14} />
              </button>
            </div>
          </div>
          <textarea
            id="system-prompt-input"
            value={localPrompt}
            onChange={handlePromptChange}
            onBlur={handlePromptBlur}
            rows={3}
            className={`${inputBaseClasses} ${SETTINGS_INPUT_CLASS} resize-y min-h-[112px] custom-scrollbar`}
            placeholder={t('chatBehavior_systemPrompt_placeholder')}
            aria-label={t('settingsSystemPromptAria')}
          />
        </div>

        <TextEditorModal
          isOpen={isSystemPromptExpanded}
          onClose={() => setIsSystemPromptExpanded(false)}
          title={t('settingsSystemPrompt')}
          value={systemInstruction}
          onChange={(value) => onUpdateSetting('systemInstruction', value)}
          placeholder={t('chatBehavior_systemPrompt_placeholder')}
          confirmLabel={t('settingsSaveAndClose')}
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
              onChange={(e) => onUpdateSetting('temperature', parseFloat(e.target.value))}
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
              onChange={(e) => onUpdateSetting('topP', parseFloat(e.target.value))}
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
              onChange={(e) => onUpdateSetting('topK', parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-[var(--theme-border-secondary)] rounded-lg appearance-none cursor-pointer accent-[var(--theme-bg-accent)] hover:accent-[var(--theme-bg-accent-hover)]"
            />
          </div>

          {mediaResolution && (
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
              onChange={(e) => onUpdateSetting('mediaResolution', e.target.value as MediaResolution)}
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
        setTranscriptionModelId={(value) => onUpdateSetting('transcriptionModelId', value)}
        ttsVoice={ttsVoice}
        setTtsVoice={(value) => onUpdateSetting('ttsVoice', value)}
      />
    </div>
  );
};
