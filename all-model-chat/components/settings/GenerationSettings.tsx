import React from 'react';
import { Info } from 'lucide-react';
import { Tooltip } from './shared/Tooltip';

interface GenerationSettingsProps {
  systemInstruction: string;
  setSystemInstruction: (value: string) => void;
  temperature: number;
  setTemperature: (value: number) => void;
  topP: number;
  setTopP: (value: number) => void;
  t: (key: string) => string;
}

export const GenerationSettings: React.FC<GenerationSettingsProps> = ({
  systemInstruction, setSystemInstruction,
  temperature, setTemperature,
  topP, setTopP,
  t
}) => {
  const isSystemPromptSet = systemInstruction && systemInstruction.trim() !== "";
  const inputBaseClasses = "w-full p-2 border rounded-md focus:ring-2 focus:border-[var(--theme-border-focus)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] text-sm";
  const enabledInputClasses = "bg-[var(--theme-bg-input)] border-[var(--theme-border-secondary)] focus:ring-[var(--theme-border-focus)]";

  return (
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
  );
};
