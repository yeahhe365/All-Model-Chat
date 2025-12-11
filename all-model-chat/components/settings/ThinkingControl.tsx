
import React, { useState, useEffect } from 'react';
import { Info, Lightbulb, Zap, Settings2, Ban, Gauge, Calculator, Cpu } from 'lucide-react';
import { THINKING_BUDGET_RANGES, SETTINGS_INPUT_CLASS, MODELS_MANDATORY_THINKING } from '../../constants/appConstants';
import { Tooltip } from '../shared/Tooltip';
import { isGemini3Model } from '../../utils/appUtils';

interface ThinkingControlProps {
  modelId: string;
  thinkingBudget: number;
  setThinkingBudget: (value: number) => void;
  thinkingLevel?: 'LOW' | 'HIGH';
  setThinkingLevel?: (value: 'LOW' | 'HIGH') => void;
  showThoughts: boolean;
  setShowThoughts: (value: boolean) => void;
  t: (key: string) => string;
}

export const ThinkingControl: React.FC<ThinkingControlProps> = ({
  modelId,
  thinkingBudget,
  setThinkingBudget,
  thinkingLevel,
  setThinkingLevel,
  showThoughts,
  setShowThoughts,
  t
}) => {
  const isGemini3 = isGemini3Model(modelId);
  const budgetConfig = THINKING_BUDGET_RANGES[modelId];
  
  const isMandatoryThinking = MODELS_MANDATORY_THINKING.includes(modelId);

  // Default ranges if config is missing (fallback for unknown models)
  const minBudget = budgetConfig?.min ?? 1024;
  const maxBudget = budgetConfig?.max ?? 32768;

  const [customBudgetValue, setCustomBudgetValue] = useState(
    thinkingBudget > 0 ? String(thinkingBudget) : String(minBudget)
  );
  
  // Determine current mode
  const mode = thinkingBudget < 0 ? 'auto' : thinkingBudget === 0 ? 'off' : 'custom';
  const showThinkingControls = !!budgetConfig || isGemini3;

  useEffect(() => {
    if (thinkingBudget > 0) {
        setCustomBudgetValue(String(thinkingBudget));
    }
  }, [thinkingBudget]);

  // Force auto mode if mandatory thinking model is selected and budget is 0 (off)
  useEffect(() => {
    if (isMandatoryThinking && thinkingBudget === 0) {
        setThinkingBudget(-1);
    }
  }, [modelId, isMandatoryThinking, thinkingBudget, setThinkingBudget]);

  // Ensure custom budget doesn't exceed max when switching models
  useEffect(() => {
      if (thinkingBudget > maxBudget) {
          setThinkingBudget(maxBudget);
          setCustomBudgetValue(String(maxBudget));
      }
  }, [maxBudget, thinkingBudget, setThinkingBudget]);

  const handleModeChange = (newMode: 'auto' | 'off' | 'custom') => {
      if (newMode === 'auto') {
          setThinkingBudget(-1);
      } else if (newMode === 'off') {
          setThinkingBudget(0);
      } else {
          // Custom Mode
          // Restore last custom value or default to max/reasonable
          let newBudget = parseInt(customBudgetValue, 10);
          if (isNaN(newBudget) || newBudget <= 0) newBudget = maxBudget;
          
          // Clamp to valid range for current model
          if (newBudget > maxBudget) newBudget = maxBudget;
          if (newBudget < minBudget) newBudget = minBudget;

          if (String(newBudget) !== customBudgetValue) setCustomBudgetValue(String(newBudget));
          setThinkingBudget(newBudget);
      }
  };

  const handleCustomBudgetChange = (val: string) => {
      setCustomBudgetValue(val);
      const numVal = parseInt(val, 10);
      if (!isNaN(numVal) && numVal > 0) {
          setThinkingBudget(numVal);
      }
  };

  if (!showThinkingControls) return null;

  const showContent = (isGemini3 && mode === 'auto') || mode === 'custom' || mode === 'off';

  return (
    <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
        {/* Container Card */}
        <div className="rounded-xl border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-input)]/30 p-4">
            
            {/* Header */}
            <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-[var(--theme-text-primary)] flex items-center gap-2">
                    <Lightbulb size={16} className="text-[var(--theme-text-link)]" strokeWidth={1.5} />
                    {t('settingsThinkingMode')}
                    <Tooltip text={t('settingsThinkingMode_tooltip')}>
                        <Info size={14} className="text-[var(--theme-text-tertiary)] cursor-help" strokeWidth={1.5} />
                    </Tooltip>
                </label>
                {mode !== 'off' && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--theme-bg-accent)]/10 text-[var(--theme-text-link)] border border-[var(--theme-bg-accent)]/20">
                        {isGemini3 ? 'Gemini 3.0 Capabilities' : 'Reasoning Enabled'}
                    </span>
                )}
            </div>
            
            {/* Segmented Control (Tabs) */}
            <div className={`grid ${isMandatoryThinking ? 'grid-cols-2' : 'grid-cols-3'} gap-1 bg-[var(--theme-bg-tertiary)] p-1 rounded-lg mt-3 select-none`}>
                <button
                    onClick={() => handleModeChange('auto')}
                    className={`flex items-center justify-center gap-2 py-2 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 focus:outline-none ${
                        mode === 'auto'
                        ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-sm ring-1 ring-[var(--theme-border-secondary)]'
                        : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-primary)]/50'
                    }`}
                >
                    <SparklesIcon active={mode === 'auto'} />
                    {isGemini3 ? t('settingsThinkingMode_preset') : t('settingsThinkingMode_auto')}
                </button>

                <button
                    onClick={() => handleModeChange('custom')}
                    className={`flex items-center justify-center gap-2 py-2 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 focus:outline-none ${
                        mode === 'custom'
                        ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-sm ring-1 ring-[var(--theme-border-secondary)]'
                        : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-primary)]/50'
                    }`}
                >
                    <Settings2 size={14} strokeWidth={2} className={mode === 'custom' ? 'text-amber-500' : 'opacity-70'} />
                    {t('settingsThinkingMode_custom')}
                </button>

                {!isMandatoryThinking && (
                    <button
                        onClick={() => handleModeChange('off')}
                        className={`flex items-center justify-center gap-2 py-2 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 focus:outline-none ${
                            mode === 'off'
                            ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-sm ring-1 ring-[var(--theme-border-secondary)]'
                            : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-primary)]/50'
                        }`}
                    >
                        <Ban size={14} strokeWidth={2} className={mode === 'off' ? 'text-red-500' : 'opacity-70'} />
                        {t('settingsThinkingMode_off')}
                    </button>
                )}
            </div>

            {/* Content Area */}
            {showContent && (
                <div className="mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    
                    {/* 1. Gemini 3.0 Preset Level Selector */}
                    {isGemini3 && mode === 'auto' && setThinkingLevel && (
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)] flex items-center gap-1.5">
                                    <Gauge size={12} /> Intensity Level
                                </span>
                            </div>
                            <div className="flex gap-3">
                                <LevelButton 
                                    active={thinkingLevel === 'LOW'} 
                                    onClick={() => setThinkingLevel('LOW')} 
                                    label="Low" 
                                    desc="Faster, concise reasoning"
                                    icon={<Zap size={16} />}
                                />
                                <LevelButton 
                                    active={thinkingLevel === 'HIGH'} 
                                    onClick={() => setThinkingLevel('HIGH')} 
                                    label="High" 
                                    desc="Deep, comprehensive thought"
                                    icon={<Cpu size={16} />}
                                />
                            </div>
                        </div>
                    )}

                    {/* 2. Custom Budget Slider & Input */}
                    {mode === 'custom' && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)] flex items-center gap-1.5">
                                    <Calculator size={12} /> Token Budget
                                </label>
                                <span className="text-xs font-mono text-[var(--theme-text-link)] bg-[var(--theme-bg-tertiary)] px-2 py-0.5 rounded border border-[var(--theme-border-secondary)]">
                                    {parseInt(customBudgetValue).toLocaleString()} tokens
                                </span>
                            </div>

                            <div className="flex items-center gap-4">
                                <input
                                    type="range"
                                    min={minBudget}
                                    max={maxBudget}
                                    step="1024"
                                    value={customBudgetValue}
                                    onChange={(e) => handleCustomBudgetChange(e.target.value)}
                                    className="flex-grow h-1.5 bg-[var(--theme-border-secondary)] rounded-lg appearance-none cursor-pointer accent-[var(--theme-bg-accent)] hover:accent-[var(--theme-bg-accent-hover)]"
                                />
                                <div className="relative w-24">
                                    <input
                                        type="number"
                                        value={customBudgetValue}
                                        onChange={(e) => handleCustomBudgetChange(e.target.value)}
                                        className={`${SETTINGS_INPUT_CLASS} w-full py-1.5 pl-2 pr-1 text-sm rounded-lg text-center font-mono focus:ring-2 focus:ring-[var(--theme-border-focus)]`}
                                        min={minBudget}
                                        max={maxBudget}
                                    />
                                </div>
                            </div>
                            <p className="text-[10px] text-[var(--theme-text-tertiary)] text-center">
                                Controls the maximum number of tokens the model can use for its internal thought process ({minBudget}-{maxBudget}).
                            </p>
                        </div>
                    )}

                    {/* 3. Off State Message */}
                    {mode === 'off' && (
                        <div className="flex items-center justify-center py-1">
                            <p className="text-xs text-[var(--theme-text-tertiary)] italic flex items-center gap-2">
                                Thinking process is disabled.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    </div>
  );
};

// --- Helper Components ---

const SparklesIcon = ({ active }: { active: boolean }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={active ? 'text-[var(--theme-text-link)]' : 'opacity-70'}>
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
);

const LevelButton = ({ active, onClick, label, desc, icon }: { active: boolean, onClick: () => void, label: string, desc: string, icon: React.ReactNode }) => (
    <button
        onClick={onClick}
        className={`flex-1 flex flex-col items-start p-3 rounded-lg border transition-all duration-200 text-left ${
            active
            ? 'bg-[var(--theme-bg-accent)]/5 border-[var(--theme-border-focus)] ring-1 ring-[var(--theme-border-focus)]'
            : 'bg-[var(--theme-bg-tertiary)]/30 border-transparent hover:bg-[var(--theme-bg-tertiary)]/60'
        }`}
    >
        <div className={`flex items-center gap-2 mb-1 ${active ? 'text-[var(--theme-text-link)]' : 'text-[var(--theme-text-primary)]'}`}>
            {React.cloneElement(icon as React.ReactElement, { size: 14, strokeWidth: 2 } as any)}
            <span className="text-sm font-bold">{label}</span>
        </div>
        <span className="text-[10px] text-[var(--theme-text-secondary)] leading-tight">{desc}</span>
    </button>
);
