import React from 'react';
import { Info, Sliders } from 'lucide-react';
import { Tooltip } from './shared/Tooltip';

interface GenerationSettingsProps {
  temperature: number;
  setTemperature: (value: number) => void;
  topP: number;
  setTopP: (value: number) => void;
  t: (key: string) => string;
}

export const GenerationSettings: React.FC<GenerationSettingsProps> = ({
  temperature, setTemperature,
  topP, setTopP,
  t,
}) => {
  return (
    <div className="space-y-8">
      {/* Parameters Card */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)] flex items-center gap-2">
            <Sliders size={14} strokeWidth={1.5} /> Parameters
        </h4>
        <div className="space-y-6">
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
      </div>
    </div>
  );
};