
import React, { useMemo } from 'react';
import { Zap } from 'lucide-react';
import { ModelOption } from '../../types';
import { GoogleSpinner } from '../icons/GoogleSpinner';
import { ModelPicker } from '../shared/ModelPicker';
import { GEMINI_3_RO_MODELS } from '../../constants/appConstants';

interface HeaderModelSelectorProps {
  currentModelName?: string;
  availableModels: ModelOption[];
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
  isModelsLoading: boolean;
  isSwitchingModel: boolean;
  isLoading: boolean;
  t: (key: string) => string;
  defaultModelId: string;
  onSetDefaultModel: (modelId: string) => void;
  thinkingLevel?: 'LOW' | 'HIGH';
  onSetThinkingLevel: (level: 'LOW' | 'HIGH') => void;
}

export const HeaderModelSelector: React.FC<HeaderModelSelectorProps> = ({
  currentModelName,
  availableModels,
  selectedModelId,
  onSelectModel,
  isModelsLoading,
  isSwitchingModel,
  isLoading,
  t,
  defaultModelId,
  onSetDefaultModel,
  thinkingLevel,
  onSetThinkingLevel,
}) => {
  const displayModelName = isModelsLoading && !currentModelName ? t('loading') : currentModelName;

  const abbreviatedModelName = useMemo(() => {
    if (!displayModelName) return '';
    if (displayModelName === t('loading')) return displayModelName;
    
    let name = displayModelName;
    name = name.replace(/^Gemini\s+/i, '');
    name = name.replace(/\s+Preview/i, '');
    name = name.replace(/\s+Latest/i, '');
    
    return name;
  }, [displayModelName, t]);

  const isSelectorDisabled = (isModelsLoading && availableModels.length === 0) || isLoading || isSwitchingModel;
  
  // Check for Gemini 3 models (ignoring case)
  const isGemini3 = GEMINI_3_RO_MODELS.some(id => id.toLowerCase() === selectedModelId.toLowerCase()) || selectedModelId.toLowerCase().includes('gemini-3-pro');
  const isLowThinking = thinkingLevel === 'LOW';

  return (
    <ModelPicker
      models={availableModels}
      selectedId={selectedModelId}
      onSelect={onSelectModel}
      isLoading={isModelsLoading}
      t={t}
      defaultModelId={defaultModelId}
      onSetDefaultModel={onSetDefaultModel}
      dropdownClassName="w-[calc(100vw-2rem)] max-w-[240px] sm:w-[240px] sm:max-w-none max-h-96"
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
                {isModelsLoading && !currentModelName && <div className="flex items-center justify-center"><GoogleSpinner size={16} /></div>}
                
                <span className="truncate max-w-[200px] sm:max-w-[240px]">{abbreviatedModelName}</span>
            </button>

            {/* Thinking Level Toggle */}
            {isGemini3 && (
                <button 
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        onSetThinkingLevel(isLowThinking ? 'HIGH' : 'LOW'); 
                    }}
                    className={`h-10 w-10 flex items-center justify-center rounded-xl transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme-bg-primary)] focus-visible:ring-[var(--theme-border-focus)] hover:scale-105 active:scale-95 ${
                        isLowThinking 
                            ? 'text-yellow-500 hover:bg-[var(--theme-bg-tertiary)]' 
                            : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)]'
                    }`}
                    title={isLowThinking ? "Thinking: Low (Fast)" : "Thinking: High (Deep)"}
                    aria-label="Toggle thinking level"
                >
                    <Zap size={18} fill={isLowThinking ? "currentColor" : "none"} strokeWidth={2} />
                </button>
            )}
        </div>
      )}
    />
  );
};
