
import React, { useState, useEffect } from 'react';
import { Info, Lightbulb } from 'lucide-react';
import { THINKING_BUDGET_RANGES, MODELS_MANDATORY_THINKING } from '../../../../constants/appConstants';
import { Tooltip } from '../../../shared/Tooltip';
import { isGemini3Model } from '../../../../utils/appUtils';
import { ThinkingModeSelector } from './ThinkingModeSelector';
import { ThinkingLevelSelector } from './ThinkingLevelSelector';
import { ThinkingBudgetSlider } from './ThinkingBudgetSlider';

interface ThinkingControlProps {
  modelId: string;
  thinkingBudget: number;
  setThinkingBudget: (value: number) => void;
  thinkingLevel?: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH';
  setThinkingLevel?: (value: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH') => void;
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
  const isFlash3 = isGemini3 && modelId.toLowerCase().includes('flash');
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
            <ThinkingModeSelector
                mode={mode}
                onModeChange={handleModeChange}
                isGemini3={isGemini3}
                isMandatoryThinking={isMandatoryThinking}
                t={t}
            />

            {/* Content Area */}
            {showContent && (
                <div className="mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    
                    {/* 1. Gemini 3.0 Preset Level Selector */}
                    {isGemini3 && mode === 'auto' && setThinkingLevel && (
                        <ThinkingLevelSelector
                            thinkingLevel={thinkingLevel}
                            setThinkingLevel={setThinkingLevel}
                            isFlash3={isFlash3}
                        />
                    )}

                    {/* 2. Custom Budget Slider & Input */}
                    {mode === 'custom' && (
                        <ThinkingBudgetSlider
                            minBudget={minBudget}
                            maxBudget={maxBudget}
                            value={customBudgetValue}
                            onChange={handleCustomBudgetChange}
                        />
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
