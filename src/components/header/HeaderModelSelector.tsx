
import React, { useMemo } from 'react';
import { ChevronDown, Zap } from 'lucide-react';
import { ModelOption } from '../../types';
import { useI18n } from '../../contexts/I18nContext';
import { GoogleSpinner } from '../icons/GoogleSpinner';
import { ModelPicker } from '../shared/ModelPicker';
import { getModelCapabilities } from '../../utils/modelHelpers';

interface HeaderModelSelectorProps {
  currentModelName?: string;
  availableModels: ModelOption[];
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
  isSwitchingModel: boolean;
  isLoading: boolean;
  thinkingLevel?: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH';
  onSetThinkingLevel: (level: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH') => void;
  showThoughts?: boolean;
  onToggleGemmaReasoning: () => void;
}

export const HeaderModelSelector: React.FC<HeaderModelSelectorProps> = ({
  currentModelName,
  availableModels,
  selectedModelId,
  onSelectModel,
  isSwitchingModel,
  isLoading,
  thinkingLevel,
  onSetThinkingLevel,
  showThoughts,
  onToggleGemmaReasoning,
}) => {
  const { t } = useI18n();
  const displayModelName = currentModelName;

  const abbreviatedModelName = useMemo(() => {
    if (!displayModelName) return '';
    if (displayModelName === t('loading')) return displayModelName;
    
    let name = displayModelName;
    name = name.replace(/^Gemini\s+/i, '');
    name = name.replace(/\s+Preview/i, '');
    name = name.replace(/\s+Latest/i, '');
    
    return name;
  }, [displayModelName, t]);

  const isSelectorDisabled = availableModels.length === 0 || isLoading || isSwitchingModel;
  
  // Check for Gemini 3 models (ignoring case) but exclude image models
  const { supportsThinkingLevel, isImagenModel, isGemmaModel } = getModelCapabilities(selectedModelId);
  const supportsThinkingToggle = (supportsThinkingLevel && !isImagenModel) || isGemmaModel;

  // Determine the target "Fast" level based on model capabilities
  // Gemini 3 Flash models support MINIMAL thinking for maximum speed
  // Gemini Robotics-ER 1.6 matches Flash here; other Gemini 3 models
  // (like Pro) typically bottom out at LOW.
  const isFlash = selectedModelId.toLowerCase().includes('flash');
  const isRobotics = selectedModelId.toLowerCase().includes('gemini-robotics-er');
  const targetFastLevel = (isFlash || isRobotics) ? 'MINIMAL' : 'LOW';
  const isGemmaReasoningEnabled = !!showThoughts;
  
  // Consider it "Fast Mode" active if the current level matches the target fast level
  const isFastState = isGemmaModel ? !isGemmaReasoningEnabled : thinkingLevel === targetFastLevel;
  const thinkingToggleTitle = isGemmaModel
    ? (isFastState ? t('headerReasoningMinimalFastTitle') : t('headerReasoningHighTitle'))
    : (
        isFastState
          ? t(targetFastLevel === 'MINIMAL' ? 'headerThinkingMinimalFastTitle' : 'headerThinkingLowFastTitle')
          : t('headerThinkingHighTitle')
      );
  const thinkingToggleAriaLabel = isGemmaModel ? t('headerReasoningToggleAria') : t('headerThinkingToggleAria');

  return (
    <ModelPicker
      models={availableModels}
      selectedId={selectedModelId}
      onSelect={onSelectModel}
      t={t}
      dropdownClassName="w-[calc(100vw-2rem)] max-w-[320px] sm:w-[320px] sm:max-w-none max-h-96"
      renderTrigger={({ isOpen, setIsOpen }) => (
        <div className="relative flex items-center gap-1">
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={isSelectorDisabled}
                className={`h-10 flex items-center gap-2 rounded-xl px-2 sm:px-3 bg-transparent hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)] font-medium text-base transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme-bg-primary)] focus-visible:ring-[var(--theme-border-focus)] disabled:opacity-70 disabled:cursor-not-allowed border border-transparent hover:border-[var(--theme-border-secondary)] hover:scale-[1.02] active:scale-95 active:bg-[var(--theme-bg-tertiary)] ${isSwitchingModel ? 'animate-pulse' : ''}`}
                title={`${t('headerModelSelectorTooltip_current')}: ${displayModelName}. ${t('headerModelSelectorTooltip_action')}`}
                aria-label={`${t('headerModelAriaLabel_current')}: ${displayModelName}. ${t('headerModelAriaLabel_action')}`}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                {!currentModelName && <div className="flex items-center justify-center"><GoogleSpinner size={16} /></div>}

                <span className="truncate max-w-[180px] font-semibold sm:max-w-[220px]">{abbreviatedModelName}</span>
                <ChevronDown
                    size={15}
                    className={`flex-shrink-0 text-[var(--theme-text-tertiary)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    strokeWidth={1.75}
                />
            </button>

            {/* Thinking Level Toggle */}
            {supportsThinkingToggle && (
                <button 
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        if (isGemmaModel) {
                            onToggleGemmaReasoning();
                            return;
                        }
                        onSetThinkingLevel(isFastState ? 'HIGH' : targetFastLevel); 
                    }}
                    className={`h-10 w-10 flex items-center justify-center rounded-xl transition-all duration-200 ease-out focus:outline-none focus:visible:ring-2 focus:visible:ring-offset-2 focus:visible:ring-offset-[var(--theme-bg-primary)] focus-visible:ring-[var(--theme-border-focus)] hover:scale-105 active:scale-95 ${
                        isFastState 
                            ? 'text-yellow-500 hover:bg-[var(--theme-bg-tertiary)]' 
                            : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)]'
                    }`}
                    title={thinkingToggleTitle}
                    aria-label={thinkingToggleAriaLabel}
                >
                    <Zap size={18} fill={isFastState ? "currentColor" : "none"} strokeWidth={2} />
                </button>
            )}
        </div>
      )}
    />
  );
};
