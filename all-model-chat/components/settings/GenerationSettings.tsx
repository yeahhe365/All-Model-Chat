import React, { useState, useEffect } from 'react';
import { Info } from 'lucide-react';
import { Tooltip, Toggle } from './shared/Tooltip';
import { THINKING_BUDGET_RANGES } from '../../constants/appConstants';

interface GenerationSettingsProps {
  systemInstruction: string;
  setSystemInstruction: (value: string) => void;
  temperature: number;
  setTemperature: (value: number) => void;
  topP: number;
  setTopP: (value: number) => void;
  thinkingBudget: number;
  setThinkingBudget: (value: number) => void;
  showThoughts: boolean;
  setShowThoughts: (value: boolean) => void;
  t: (key: string) => string;
  modelId: string;
}

export const GenerationSettings: React.FC<GenerationSettingsProps> = ({
  systemInstruction, setSystemInstruction,
  temperature, setTemperature,
  topP, setTopP,
  thinkingBudget, setThinkingBudget,
  showThoughts, setShowThoughts,
  t,
  modelId,
}) => {
  const isSystemPromptSet = systemInstruction && systemInstruction.trim() !== "";
  const inputBaseClasses = "w-full p-2 border rounded-md focus:ring-2 focus:border-[var(--theme-border-focus)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] text-sm";
  const enabledInputClasses = "bg-[var(--theme-bg-input)] border-[var(--theme-border-secondary)] focus:ring-[var(--theme-border-focus)]";
  
  const budgetConfig = THINKING_BUDGET_RANGES[modelId];

  const [customBudgetValue, setCustomBudgetValue] = useState(
    thinkingBudget > 0 ? String(thinkingBudget) : '1000'
  );

  const mode = thinkingBudget < 0 ? 'auto' : thinkingBudget === 0 ? 'off' : 'custom';
  const isThinkingOn = mode !== 'off';

  const handleModeChange = (newMode: 'auto' | 'off' | 'custom') => {
      if (newMode === 'auto') setThinkingBudget(-1);
      else if (newMode === 'off') setThinkingBudget(0);
      else {
          if (budgetConfig) {
              setThinkingBudget(budgetConfig.max);
          } else {
              const budget = parseInt(customBudgetValue, 10);
              const newBudget = budget > 0 ? budget : 1000;
              if (String(newBudget) !== customBudgetValue) setCustomBudgetValue(String(newBudget));
              setThinkingBudget(newBudget);
          }
      }
  };

  const handleCustomBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setCustomBudgetValue(val);
      const numVal = parseInt(val, 10);
      if (!isNaN(numVal) && numVal > 0) {
          setThinkingBudget(numVal);
      }
  };

  useEffect(() => {
    // Sync local custom budget state if global state changes from elsewhere
    if (thinkingBudget > 0) {
        setCustomBudgetValue(String(thinkingBudget));
    }
  }, [thinkingBudget]);

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
      <div className="pt-4 mt-4 border-t border-[var(--theme-border-secondary)]">
        <label className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-2 flex items-center">
            {t('settingsThinkingMode')}
            <Tooltip text={t('settingsThinkingMode_tooltip')}>
                <Info size={12} className="text-[var(--theme-text-tertiary)] cursor-help" />
            </Tooltip>
        </label>
        <div role="radiogroup" className="flex bg-[var(--theme-bg-tertiary)] p-0.5 rounded-lg">
            {(['auto', 'off', 'custom'] as const).map(modeValue => (
              <button
                key={modeValue}
                role="radio"
                aria-checked={mode === modeValue}
                onClick={() => handleModeChange(modeValue)}
                className={`flex-1 text-center px-3 py-1 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-tertiary)] focus:ring-[var(--theme-border-focus)] ${
                    mode === modeValue
                    ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-link)] shadow-sm'
                    : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-input)]/50'
                }`}
              >
                {t(`settingsThinkingMode_${modeValue}`)}
              </button>
            ))}
        </div>
        {mode === 'custom' && (
            <div className="mt-2" style={{ animation: 'fadeIn 0.3s ease-out both' }}>
                {budgetConfig ? (
                    <div className="pt-2">
                        <label htmlFor="thinking-budget-slider" className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5">
                            <span className='flex items-center'>
                                {t('settingsThinkingBudget')}: <span className="font-mono text-[var(--theme-text-link)] ml-1">{thinkingBudget > 0 ? thinkingBudget.toLocaleString() : '...'}</span>
                                <Tooltip text={t('settingsThinkingBudget_tooltip')}>
                                    <Info size={12} className="text-[var(--theme-text-tertiary)] cursor-help" />
                                </Tooltip>
                            </span>
                        </label>
                        <input
                            id="thinking-budget-slider"
                            type="range"
                            min={budgetConfig.min}
                            max={budgetConfig.max}
                            step={1}
                            value={thinkingBudget > 0 ? thinkingBudget : budgetConfig.min}
                            onChange={(e) => setThinkingBudget(parseInt(e.target.value, 10))}
                            className="w-full h-2 bg-[var(--theme-border-secondary)] rounded-lg appearance-none cursor-pointer accent-[var(--theme-bg-accent)]"
                        />
                    </div>
                ) : (
                    <input
                        type="number"
                        value={customBudgetValue}
                        onChange={handleCustomBudgetChange}
                        placeholder={t('settingsThinkingCustom_placeholder')}
                        className={`${inputBaseClasses} ${enabledInputClasses} w-full`}
                        aria-label="Custom thinking token budget"
                        min="1"
                        step="100"
                    />
                )}
            </div>
        )}
      </div>
      <div className={`flex justify-between items-center py-2 transition-opacity ${isThinkingOn ? 'opacity-100' : 'opacity-50'}`}>
        <label className={`text-sm flex items-center ${isThinkingOn ? 'text-[var(--theme-text-primary)]' : 'text-[var(--theme-text-tertiary)]'}`}>
            {t('settingsShowThoughts')}
            <Tooltip text={t('settingsShowThoughts_tooltip')}>
                <Info size={12} className="text-[var(--theme-text-tertiary)] cursor-help" />
            </Tooltip>
        </label>
        <Toggle id="show-thoughts-toggle" checked={showThoughts && isThinkingOn} onChange={setShowThoughts} disabled={!isThinkingOn} />
      </div>
    </div>
  );
};