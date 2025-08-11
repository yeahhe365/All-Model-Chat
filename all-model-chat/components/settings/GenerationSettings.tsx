import React, { useState, useEffect } from 'react';
import { Info, Loader2, Volume2 } from 'lucide-react';
import { Tooltip } from './shared/Tooltip';
import { Select } from './shared/Tooltip';
import { AVAILABLE_TTS_VOICES } from '../../constants/appConstants';
import { getResponsiveValue } from '../../utils/appUtils';

interface GenerationSettingsProps {
  systemInstruction: string;
  setSystemInstruction: (value: string) => void;
  temperature: number;
  setTemperature: (value: number) => void;
  topP: number;
  setTopP: (value: number) => void;
  ttsVoice: string;
  setTtsVoice: (value: string) => void;
  t: (key: string) => string;
}

export const GenerationSettings: React.FC<GenerationSettingsProps> = ({
  systemInstruction, setSystemInstruction,
  temperature, setTemperature,
  topP, setTopP,
  ttsVoice, setTtsVoice,
  t
}) => {
  const isSystemPromptSet = systemInstruction && systemInstruction.trim() !== "";
  const inputBaseClasses = "w-full p-2 border rounded-md focus:ring-2 focus:border-[var(--theme-border-focus)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] text-sm";
  const enabledInputClasses = "bg-[var(--theme-bg-input)] border-[var(--theme-border-secondary)] focus:ring-[var(--theme-border-focus)]";
  const iconSize = getResponsiveValue(14, 16);

  return (
    <div className="space-y-6">
       <div>
        <h4 className="text-base font-semibold text-[var(--theme-text-primary)] mb-3">{t('settings_section_generation')}</h4>
        <div className="space-y-4">
          <div>
            <label htmlFor="system-prompt-input" className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5 flex items-center">
                {t('settingsSystemPrompt')}
                {isSystemPromptSet && <span className="ml-2 w-2.5 h-2.5 bg-green-400 bg-opacity-70 rounded-full" title="System prompt is active" />}
            </label>
            <textarea
              id="system-prompt-input" value={systemInstruction} onChange={(e) => setSystemInstruction(e.target.value)}
              rows={3} className={`${inputBaseClasses} ${enabledInputClasses} resize-y min-h-[60px] custom-scrollbar`}
              placeholder={t('chatBehavior_systemPrompt_placeholder')}
              aria-label="System prompt text area"
            />
          </div>
          <div>
            <label htmlFor="temperature-slider" className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5">
                <span className='flex items-center'>
                    {t('settingsTemperature')}: <span className="font-mono text-[var(--theme-text-link)] ml-1">{Number(temperature).toFixed(2)}</span>
                    <Tooltip text={t('chatBehavior_temp_tooltip')}>
                        <Info size={12} className="text-[var(--theme-text-tertiary)] cursor-help" />
                    </Tooltip>
                </span>
            </label>
            <input id="temperature-slider" type="range" min="0" max="2" step="0.05" value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full h-2 bg-[var(--theme-border-secondary)] rounded-lg appearance-none cursor-pointer accent-[var(--theme-bg-accent)]" />
          </div>
          <div>
            <label htmlFor="top-p-slider" className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5">
                <span className='flex items-center'>
                    {t('settingsTopP')}: <span className="font-mono text-[var(--theme-text-link)] ml-1">{Number(topP).toFixed(2)}</span>
                    <Tooltip text={t('chatBehavior_topP_tooltip')}>
                        <Info size={12} className="text-[var(--theme-text-tertiary)] cursor-help" />
                    </Tooltip>
                </span>
            </label>
            <input id="top-p-slider" type="range" min="0" max="1" step="0.05" value={topP} onChange={(e) => setTopP(parseFloat(e.target.value))}
              className="w-full h-2 bg-[var(--theme-border-secondary)] rounded-lg appearance-none cursor-pointer accent-[var(--theme-bg-accent)]" />
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-[var(--theme-border-secondary)]">
        <h4 className="text-base font-semibold text-[var(--theme-text-primary)] mb-3">{t('settings_section_speech')}</h4>
         <div className="space-y-4">
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
      </div>
    </div>
  );
};
