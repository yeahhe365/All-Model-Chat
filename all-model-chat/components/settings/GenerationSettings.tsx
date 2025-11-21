import React, { useState, useEffect } from 'react';
import { Info, Sliders, Brain } from 'lucide-react';
import { Tooltip, Toggle, Select } from './shared/Tooltip';
import { THINKING_BUDGET_RANGES, THINKING_LEVELS, GEMINI_3_RO_MODELS } from '../../constants/appConstants';

interface GenerationSettingsProps {
  temperature: number;
  setTemperature: (value: number) => void;
  topP: number;
  setTopP: (value: number) => void;
  thinkingBudget: number;
  setThinkingBudget: (value: number) => void;
  thinkingLevel?: 'LOW' | 'HIGH';
  setThinkingLevel?: (value: 'LOW' | 'HIGH') => void;
  showThoughts: boolean;
  setShowThoughts: (value: boolean) => void;
  t: (key: string) => string;
  modelId: string;
}

export const GenerationSettings: React.FC<GenerationSettingsProps> = ({
  temperature, setTemperature,
  topP, setTopP,
  thinkingBudget, setThinkingBudget,
  thinkingLevel, setThinkingLevel,
  showThoughts, setShowThoughts,
  t,
  modelId,
}) => {
  const inputBaseClasses = "w-full p-3 border rounded-lg transition-all duration-200 focus:ring-2 focus:ring-offset-0 text-sm font-mono";
  const enabledInputClasses = "bg-[var(--theme-bg-input)] border-[var(--theme-border-secondary)] focus:border-[var(--theme-border-focus)] focus:ring-[var(--theme-border-focus)]/20 text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)]";
  
  // Check for Gemini 3 robustly (handles models/ prefix or simple ID)
  const isGemini3 = GEMINI_3_RO_MODELS.includes(modelId) || modelId.includes('gemini-3-pro');
  const budgetConfig = THINKING_BUDGET_RANGES[modelId];

  const [customBudgetValue, setCustomBudgetValue] = useState(
    thinkingBudget > 0 ? String(thinkingBudget) : '1000'
  );

  const mode = thinkingBudget < 0 ? 'auto' : thinkingBudget === 0 ? 'off' : 'custom';
  // For Gemini 3, thinking is generally always on (either by level or budget).
  const isThinkingOn = isGemini3 ? true : mode !== 'off';

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
    <div className="space-y-8">
      {/* Parameters Card */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)] flex items-center gap-2">
            <Sliders size={14} strokeWidth={1.5} /> Parameters
        </h4>
        <div className="p-5 bg-[var(--theme-bg-tertiary)]/30 rounded-xl border border-[var(--theme-border-secondary)] space-y-6">
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
      
      {/* Thinking Controls */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)] flex items-center gap-2">
            <Brain size={14} strokeWidth={1.5} /> Thinking Process
        </h4>
        <div className="p-5 bg-[var(--theme-bg-tertiary)]/30 rounded-xl border border-[var(--theme-border-secondary)] space-y-5">
             <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-[var(--theme-text-primary)] flex items-center">
                        {t('settingsThinkingMode')}
                        <Tooltip text={t('settingsThinkingMode_tooltip')}>
                            <Info size={14} className="ml-2 text-[var(--theme-text-tertiary)] cursor-help" strokeWidth={1.5} />
                        </Tooltip>
                    </label>
                </div>
                <div role="radiogroup" className="flex gap-2 bg-[var(--theme-bg-tertiary)]/50 p-1 rounded-lg border border-[var(--theme-border-secondary)]">
                    <button
                        role="radio"
                        aria-checked={mode === 'auto'}
                        onClick={() => handleModeChange('auto')}
                        className={`flex-1 text-center px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] ${
                            mode === 'auto'
                            ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-link)] shadow-sm'
                            : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
                        }`}
                    >
                        {isGemini3 ? 'Preset' : t('settingsThinkingMode_auto')}
                    </button>

                    {!isGemini3 && (
                         <button
                            role="radio"
                            aria-checked={mode === 'off'}
                            onClick={() => handleModeChange('off')}
                            className={`flex-1 text-center px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] ${
                                mode === 'off'
                                ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-link)] shadow-sm'
                                : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
                            }`}
                        >
                            {t('settingsThinkingMode_off')}
                        </button>
                    )}

                    <button
                        role="radio"
                        aria-checked={mode === 'custom'}
                        onClick={() => handleModeChange('custom')}
                        className={`flex-1 text-center px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] ${
                            mode === 'custom'
                            ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-link)] shadow-sm'
                            : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
                        }`}
                    >
                        {t('settingsThinkingMode_custom')}
                    </button>
                </div>
                
                {/* Gemini 3 Thinking Level (Preset Mode) */}
                {isGemini3 && mode === 'auto' && (
                    <div className="pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                         <Select
                            id="thinking-level-select"
                            label="Thinking Level"
                            labelContent={<span className='flex items-center text-sm font-medium text-[var(--theme-text-secondary)]'>Thinking Level</span>}
                            value={thinkingLevel}
                            onChange={(e) => setThinkingLevel && setThinkingLevel(e.target.value as 'LOW' | 'HIGH')}
                        >
                            {THINKING_LEVELS.map((level) => <option key={level.id} value={level.id}>{level.name}</option>)}
                        </Select>
                    </div>
                )}

                {/* Thinking Budget (Custom Mode) */}
                {mode === 'custom' && (
                    <div className="pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                        {budgetConfig ? (
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label htmlFor="thinking-budget-slider" className="text-sm font-medium text-[var(--theme-text-secondary)]">
                                        {t('settingsThinkingBudget')}
                                    </label>
                                    <span className="text-sm font-mono text-[var(--theme-text-link)]">{thinkingBudget > 0 ? thinkingBudget.toLocaleString() : '...'}</span>
                                </div>
                                <input
                                    id="thinking-budget-slider"
                                    type="range"
                                    min={budgetConfig.min}
                                    max={budgetConfig.max}
                                    step={1}
                                    value={thinkingBudget > 0 ? thinkingBudget : budgetConfig.min}
                                    onChange={(e) => setThinkingBudget(parseInt(e.target.value, 10))}
                                    className="w-full h-1.5 bg-[var(--theme-border-secondary)] rounded-lg appearance-none cursor-pointer accent-[var(--theme-bg-accent)] hover:accent-[var(--theme-bg-accent-hover)]"
                                />
                            </div>
                        ) : (
                            <input
                                type="number"
                                value={customBudgetValue}
                                onChange={handleCustomBudgetChange}
                                placeholder={t('settingsThinkingCustom_placeholder')}
                                className={`${inputBaseClasses} ${enabledInputClasses} w-full`}
                                min="1"
                                step="100"
                            />
                        )}
                    </div>
                )}
            </div>

            <div className={`flex justify-between items-center pt-2 border-t border-[var(--theme-border-secondary)]/50 transition-opacity duration-300 ${isThinkingOn ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                <label className="text-sm text-[var(--theme-text-primary)] flex items-center">
                    {t('settingsShowThoughts')}
                    <Tooltip text={t('settingsShowThoughts_tooltip')}>
                        <Info size={14} className="ml-2 text-[var(--theme-text-tertiary)] cursor-help" strokeWidth={1.5} />
                    </Tooltip>
                </label>
                <Toggle id="show-thoughts-toggle" checked={showThoughts && isThinkingOn} onChange={setShowThoughts} disabled={!isThinkingOn} />
            </div>
        </div>
      </div>
    </div>
  );
};