import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AudioLines, Image as ImageIcon, Info, SquarePen, X } from 'lucide-react';
import { SETTINGS_INPUT_CLASS, SMALL_ICON_BUTTON_CLASS } from '../../../constants/appConstants';
import { MediaResolution } from '../../../types/settings';
import { getModelCapabilities } from '../../../utils/modelHelpers';
import { useI18n } from '../../../contexts/I18nContext';
import { Tooltip } from '../../shared/Tooltip';
import { Select } from '../../shared/Select';
import { ToggleItem } from '../../shared/ToggleItem';
import { TextEditorModal } from '../../modals/TextEditorModal';
import { ThinkingControl } from '../controls/thinking/ThinkingControl';
import { AVAILABLE_TTS_VOICES } from '../../../constants/voiceOptions';

interface GenerationSectionProps {
  modelId: string;
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
  mediaResolution?: MediaResolution;
  setMediaResolution?: (resolution: MediaResolution) => void;
  ttsVoice: string;
  setTtsVoice: (value: string) => void;
  isRawModeEnabled: boolean;
  setIsRawModeEnabled: (value: boolean) => void;
  hideThinkingInContext: boolean;
  setHideThinkingInContext: (value: boolean) => void;
  t: (key: string) => string;
}

export const GenerationSection: React.FC<GenerationSectionProps> = ({
  modelId,
  systemInstruction,
  setSystemInstruction,
  temperature,
  setTemperature,
  topP,
  setTopP,
  topK,
  setTopK,
  thinkingBudget,
  setThinkingBudget,
  thinkingLevel,
  setThinkingLevel,
  showThoughts,
  setShowThoughts,
  mediaResolution,
  setMediaResolution,
  ttsVoice,
  setTtsVoice,
  isRawModeEnabled,
  setIsRawModeEnabled,
  hideThinkingInContext,
  setHideThinkingInContext,
  t,
}) => {
  const { t: i18n } = useI18n();
  const [isSystemPromptExpanded, setIsSystemPromptExpanded] = useState(false);
  const [localPrompt, setLocalPrompt] = useState(systemInstruction);
  const skipNextPromptBlurCommitRef = useRef(false);

  useEffect(() => {
    setLocalPrompt(systemInstruction);
  }, [systemInstruction]);

  const commitPromptIfNeeded = useCallback(() => {
    if (localPrompt !== systemInstruction) {
      setSystemInstruction(localPrompt);
    }
  }, [localPrompt, setSystemInstruction, systemInstruction]);

  const handleOpenExpand = () => {
    commitPromptIfNeeded();
    setIsSystemPromptExpanded(true);
  };

  const handleClearPrompt = () => {
    setLocalPrompt('');
    if (localPrompt !== '' || systemInstruction !== '') {
      setSystemInstruction('');
    }
  };

  const capabilities = getModelCapabilities(modelId);
  const isNativeAudio = capabilities.isNativeAudioModel;
  const supportsUltraHighResolution = capabilities.isGemini3 || modelId.toLowerCase().includes('gemini-robotics-er');
  const isSystemPromptSet = localPrompt.trim() !== '';
  const inputBaseClasses =
    'w-full p-2.5 border rounded-lg transition-all duration-200 focus:ring-2 focus:ring-offset-0 text-sm';

  return (
    <div className="max-w-3xl mx-auto space-y-8">
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
            <span
              className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                isSystemPromptSet
                  ? 'bg-[var(--theme-bg-success)] text-[var(--theme-text-success)]'
                  : 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-tertiary)]'
              }`}
            >
              {isSystemPromptSet ? i18n('settingsSystemPromptEnabled') : i18n('settingsSystemPromptUnset')}
            </span>
          </label>
          <div className="flex items-center gap-1">
            {isSystemPromptSet && (
              <button
                type="button"
                onClick={handleClearPrompt}
                className={`${SMALL_ICON_BUTTON_CLASS} flex h-8 w-8 items-center justify-center hover:text-[var(--theme-text-danger)] hover:bg-[var(--theme-bg-danger)]/10`}
                title={i18n('settingsClearSystemPrompt')}
                aria-label={i18n('settingsClearSystemPrompt')}
              >
                <X size={14} />
              </button>
            )}
            <button
              type="button"
              onPointerDown={() => {
                skipNextPromptBlurCommitRef.current = true;
              }}
              onClick={handleOpenExpand}
              className={`${SMALL_ICON_BUTTON_CLASS} flex h-8 w-8 items-center justify-center hover:text-[var(--theme-text-link)]`}
              title={i18n('settingsExpandSystemPromptEditor')}
              aria-label={i18n('settingsExpandSystemPromptEditor')}
            >
              <SquarePen size={14} />
            </button>
          </div>
        </div>
        <textarea
          id="system-prompt-input"
          value={localPrompt}
          onChange={(event) => setLocalPrompt(event.target.value)}
          onBlur={() => {
            if (skipNextPromptBlurCommitRef.current) {
              skipNextPromptBlurCommitRef.current = false;
              return;
            }
            commitPromptIfNeeded();
          }}
          rows={3}
          className={`${inputBaseClasses} ${SETTINGS_INPUT_CLASS} resize-y min-h-[112px] custom-scrollbar`}
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
          <input
            id="temperature-slider"
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={temperature}
            onChange={(event) => setTemperature(parseFloat(event.target.value))}
            className="w-full h-1.5 bg-[var(--theme-border-secondary)] rounded-lg appearance-none cursor-pointer accent-[var(--theme-bg-accent)] hover:accent-[var(--theme-bg-accent-hover)]"
          />
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
          <input
            id="top-p-slider"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={topP}
            onChange={(event) => setTopP(parseFloat(event.target.value))}
            className="w-full h-1.5 bg-[var(--theme-border-secondary)] rounded-lg appearance-none cursor-pointer accent-[var(--theme-bg-accent)] hover:accent-[var(--theme-bg-accent-hover)]"
          />
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <label htmlFor="top-k-slider" className="text-sm font-medium text-[var(--theme-text-primary)] flex items-center">
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
            onChange={(event) => setTopK(parseInt(event.target.value, 10))}
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
                    isNativeAudio ? 'Controls video/audio resolution for Live API.' : t('settingsMediaResolution_tooltip')
                  }
                >
                  <Info size={14} className="ml-2 text-[var(--theme-text-tertiary)] cursor-help" strokeWidth={1.5} />
                </Tooltip>
              </span>
            }
            value={mediaResolution}
            onChange={(event) => setMediaResolution(event.target.value as MediaResolution)}
          >
            <option value={MediaResolution.MEDIA_RESOLUTION_UNSPECIFIED}>{t('mediaResolution_unspecified')}</option>
            <option value={MediaResolution.MEDIA_RESOLUTION_LOW}>{t('mediaResolution_low')}</option>
            {!isNativeAudio && <option value={MediaResolution.MEDIA_RESOLUTION_MEDIUM}>{t('mediaResolution_medium')}</option>}
            {!isNativeAudio && <option value={MediaResolution.MEDIA_RESOLUTION_HIGH}>{t('mediaResolution_high')}</option>}
            {!isNativeAudio && supportsUltraHighResolution && (
              <option value={MediaResolution.MEDIA_RESOLUTION_ULTRA_HIGH}>{t('mediaResolution_ultra_high')}</option>
            )}
          </Select>
        )}
      </div>

      <div className="pt-6 border-t border-[var(--theme-border-secondary)] space-y-1">
        <Select
          id="tts-voice-select"
          label=""
          layout="horizontal"
          labelContent={
            <span className="flex items-center text-sm font-medium text-[var(--theme-text-primary)]">
              <AudioLines size={14} className="mr-2 text-[var(--theme-text-secondary)]" />
              {t('settingsTtsVoice')}
            </span>
          }
          value={ttsVoice}
          onChange={(event) => setTtsVoice(event.target.value)}
          className="py-3"
        >
          {AVAILABLE_TTS_VOICES.map((voice) => (
            <option key={voice.id} value={voice.id}>
              {voice.name} ({t(voice.styleKey)})
            </option>
          ))}
        </Select>

        <ToggleItem
          label={t('settings_rawMode_label')}
          checked={isRawModeEnabled}
          onChange={setIsRawModeEnabled}
          tooltip={t('settings_rawMode_tooltip')}
        />
        <ToggleItem
          label={t('settings_hideThinkingInContext_label')}
          checked={hideThinkingInContext}
          onChange={setHideThinkingInContext}
          tooltip={t('settings_hideThinkingInContext_tooltip')}
        />
      </div>
    </div>
  );
};
