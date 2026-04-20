
import React, { useState, useEffect } from 'react';
import { Info, Lightbulb } from 'lucide-react';
import { THINKING_BUDGET_RANGES, MODELS_MANDATORY_THINKING } from '../../../../constants/appConstants';
import { Tooltip } from '../../../shared/Tooltip';
import { Toggle } from '../../../shared/Toggle';
import { getModelCapabilities, isGemini3Model } from '../../../../utils/modelHelpers';
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

type ThinkingLevelOption = 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH';

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
  const capabilities = getModelCapabilities(modelId);
  const isFlash3 = isGemini3 && modelId.toLowerCase().includes('flash');
  const isGemini31FlashImage = modelId.toLowerCase().includes('gemini-3.1-flash-image');
  const isGemini3ProImage = modelId === 'gemini-3-pro-image-preview';
  const isImageThinkingLevelOnly = isGemini31FlashImage;
  const isGemma = modelId.toLowerCase().includes('gemma');
  const budgetConfig = THINKING_BUDGET_RANGES[modelId];
  const supportedThinkingLevels: ThinkingLevelOption[] =
    isImageThinkingLevelOnly
      ? ['MINIMAL', 'HIGH']
      : (isGemini3
          ? (isFlash3 ? ['MINIMAL', 'LOW', 'MEDIUM', 'HIGH'] : ['LOW', 'MEDIUM', 'HIGH'])
          : []);
  
  const isMandatoryThinking = MODELS_MANDATORY_THINKING.includes(modelId);

  // Default ranges if config is missing (fallback for unknown models)
  const minBudget = budgetConfig?.min ?? 1024;
  const maxBudget = budgetConfig?.max ?? 32768;

  const [customBudgetValue, setCustomBudgetValue] = useState(
    thinkingBudget > 0 ? String(thinkingBudget) : String(minBudget)
  );
  
  // Determine current mode
  const mode = thinkingBudget < 0 ? 'auto' : thinkingBudget === 0 ? 'off' : 'custom';
  const showThinkingControls = !!budgetConfig || isGemini3 || isGemma;
  const isGemmaReasoningEnabled = showThoughts;

  useEffect(() => {
    if (thinkingBudget > 0) {
        // Intentional mirror for the freeform custom input.
        // eslint-disable-next-line react-hooks/set-state-in-effect
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
          // Intentional clamp sync for the visible custom input.
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setCustomBudgetValue(String(maxBudget));
      }
  }, [maxBudget, thinkingBudget, setThinkingBudget]);

  useEffect(() => {
    if (!isImageThinkingLevelOnly || thinkingBudget === -1) return;
    setThinkingBudget(-1);
  }, [isImageThinkingLevelOnly, thinkingBudget, setThinkingBudget]);

  useEffect(() => {
    if (!isImageThinkingLevelOnly || !setThinkingLevel) return;

    const normalizedLevel = thinkingLevel === 'HIGH' ? 'HIGH' : 'MINIMAL';
    if (thinkingLevel !== normalizedLevel) {
      setThinkingLevel(normalizedLevel);
    }
  }, [isImageThinkingLevelOnly, thinkingLevel, setThinkingLevel]);

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

  if (isGemma) {
    return (
      <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
        <div className="rounded-xl border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-input)]/30 p-4">
          <div className="flex justify-between items-center">
            <label className="text-sm font-semibold text-[var(--theme-text-primary)] flex items-center gap-2">
              <Lightbulb size={16} className="text-[var(--theme-text-link)]" strokeWidth={1.5} />
              {t('settingsThinkingMode')}
              <Tooltip text={t('settingsGemmaReasoningTooltip')}>
                <Info size={14} className="text-[var(--theme-text-tertiary)] cursor-help" strokeWidth={1.5} />
              </Tooltip>
            </label>
          </div>
          <div className="mt-3 px-3 py-2.5">
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                aria-pressed={showThoughts}
                onClick={() => setShowThoughts(!isGemmaReasoningEnabled)}
                className="flex min-w-0 flex-1 items-center text-left"
              >
                <span className="text-sm font-medium text-[var(--theme-text-primary)]">
                  {t('settingsGemmaReasoningToggle_label')}
                </span>
              </button>
              <div className="flex-shrink-0">
                <Toggle checked={isGemmaReasoningEnabled} onChange={setShowThoughts} />
              </div>
            </div>
            <p className="mt-1 pr-16 text-xs leading-relaxed text-[var(--theme-text-secondary)]">
              {isGemmaReasoningEnabled
                ? t('settingsGemmaReasoningToggle_enabledDesc')
                : t('settingsGemmaReasoningToggle_disabledDesc')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (capabilities.isGemini3ImageModel && isGemini3ProImage) return null;

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
                {(mode !== 'off' || isImageThinkingLevelOnly) && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--theme-bg-accent)]/10 text-[var(--theme-text-link)] border border-[var(--theme-bg-accent)]/20">
                        {isGemini3 ? t('settingsReasoningBadgeGemini3') : t('settingsReasoningBadgeEnabled')}
                    </span>
                )}
            </div>
            
            {/* Segmented Control (Tabs) */}
            {!isImageThinkingLevelOnly && (
              <ThinkingModeSelector
                  mode={mode}
                  onModeChange={handleModeChange}
                  isGemini3={isGemini3}
                  isMandatoryThinking={isMandatoryThinking}
                  t={t}
              />
            )}

            {/* Content Area */}
            {(showContent || isImageThinkingLevelOnly) && (
                <div className="mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    
                    {/* 1. Gemini 3.0 Preset Level Selector */}
                    {((isGemini3 && mode === 'auto') || isImageThinkingLevelOnly) && setThinkingLevel && (
                        <ThinkingLevelSelector
                            thinkingLevel={thinkingLevel}
                            setThinkingLevel={setThinkingLevel}
                            supportedLevels={supportedThinkingLevels}
                        />
                    )}

                    {/* 2. Custom Budget Slider & Input */}
                    {!isImageThinkingLevelOnly && mode === 'custom' && (
                        <ThinkingBudgetSlider
                            minBudget={minBudget}
                            maxBudget={maxBudget}
                            value={customBudgetValue}
                            onChange={handleCustomBudgetChange}
                        />
                    )}

                    {/* 3. Off State Message */}
                    {!isImageThinkingLevelOnly && mode === 'off' && (
                        <div className="flex items-center justify-center py-1">
                            <p className="text-xs text-[var(--theme-text-tertiary)] italic flex items-center gap-2">
                                {t('settingsReasoningDisabledNote')}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    </div>
  );
};
