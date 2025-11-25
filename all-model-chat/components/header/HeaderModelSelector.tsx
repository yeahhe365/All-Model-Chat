
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, X, Volume2, Image as ImageIcon, Sparkles, Box, Star } from 'lucide-react';
import { ModelOption } from '../../types';
import { GoogleSpinner } from '../icons/GoogleSpinner';
import { useClickOutside } from '../../hooks/useClickOutside';
import { sortModels } from '../../utils/appUtils';

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
}) => {
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const modelSelectorRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useClickOutside(modelSelectorRef, () => setIsModelSelectorOpen(false), isModelSelectorOpen);

  const displayModelName = isModelsLoading && !currentModelName ? t('loading') : currentModelName;

  const abbreviatedModelName = useMemo(() => {
    if (!displayModelName) return '';
    if (displayModelName === t('loading')) return displayModelName;
    
    let name = displayModelName;
    // Remove "Gemini" prefix (case insensitive)
    name = name.replace(/^Gemini\s+/i, '');
    // Remove "Preview" (case insensitive)
    name = name.replace(/\s+Preview/i, '');
    // Remove "Latest" (case insensitive)
    name = name.replace(/\s+Latest/i, '');
    
    return name;
  }, [displayModelName, t]);

  useEffect(() => {
    if (isModelSelectorOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      const timer = setTimeout(() => {
          setModelSearchQuery('');
          setHighlightedIndex(0);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isModelSelectorOpen]);

  const handleModelSelect = (modelId: string) => {
    onSelectModel(modelId);
    setIsModelSelectorOpen(false);
  };
  
  const handleSetDefault = (e: React.MouseEvent, modelId: string) => {
      e.stopPropagation();
      onSetDefaultModel(modelId);
  };

  const filteredModels = useMemo(() => {
    let models = availableModels;
    if (modelSearchQuery.trim()) {
        const query = modelSearchQuery.toLowerCase();
        models = models.filter(model => 
          model.name.toLowerCase().includes(query) || 
          model.id.toLowerCase().includes(query)
        );
    }

    return sortModels(models);
  }, [availableModels, modelSearchQuery]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [modelSearchQuery]);

  useEffect(() => {
    if (isModelSelectorOpen && listRef.current && filteredModels.length > 0) {
      const activeItem = listRef.current.children[highlightedIndex] as HTMLElement;
      if (activeItem) {
        activeItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isModelSelectorOpen, filteredModels.length]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (filteredModels.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % filteredModels.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + filteredModels.length) % filteredModels.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selectedModel = filteredModels[highlightedIndex];
      if (selectedModel) {
        handleModelSelect(selectedModel.id);
      }
    }
  };

  const getModelIcon = (model: ModelOption | undefined) => {
      if (!model) return <Box size={15} className="text-[var(--theme-text-tertiary)]" strokeWidth={1.5} />;
      const { id, isPinned } = model;
      const lowerId = id.toLowerCase();
      if (lowerId.includes('tts')) return <Volume2 size={15} className="text-purple-500 dark:text-purple-400 flex-shrink-0" strokeWidth={1.5} />;
      if (lowerId.includes('imagen') || lowerId.includes('image-')) return <ImageIcon size={15} className="text-rose-500 dark:text-rose-400 flex-shrink-0" strokeWidth={1.5} />;
      if (isPinned) return <Sparkles size={15} className="text-sky-500 dark:text-sky-400 flex-shrink-0" strokeWidth={1.5} />;
      return <Box size={15} className="text-[var(--theme-text-tertiary)] opacity-70 flex-shrink-0" strokeWidth={1.5} />;
  };

  const isSelectorDisabled = (isModelsLoading && availableModels.length === 0) || isLoading || isSwitchingModel;

  return (
    <div className="relative" ref={modelSelectorRef}>
      <button
        onClick={() => setIsModelSelectorOpen(!isModelSelectorOpen)}
        disabled={isSelectorDisabled}
        className={`h-10 flex items-center gap-2 rounded-xl px-2 sm:px-3 bg-transparent hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)] font-medium text-base transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme-bg-primary)] focus-visible:ring-[var(--theme-border-focus)] disabled:opacity-70 disabled:cursor-not-allowed border border-transparent hover:border-[var(--theme-border-secondary)] hover:scale-[1.02] active:scale-95 active:bg-[var(--theme-bg-tertiary)] ${isSwitchingModel ? 'animate-pulse' : ''}`}
        title={`${t('headerModelSelectorTooltip_current')}: ${displayModelName}. ${t('headerModelSelectorTooltip_action')}`}
        aria-label={`${t('headerModelAriaLabel_current')}: ${displayModelName}. ${t('headerModelAriaLabel_action')}`}
        aria-haspopup="listbox"
        aria-expanded={isModelSelectorOpen}
      >
        {isModelsLoading && !currentModelName && <div className="flex items-center justify-center"><GoogleSpinner size={16} /></div>}
        
        <span className="truncate max-w-[200px] sm:max-w-[300px]">{abbreviatedModelName}</span>
        <ChevronDown size={16} className="opacity-50 flex-shrink-0" />
      </button>

      {isModelSelectorOpen && (
        <div 
          className="absolute top-full left-0 mt-1 w-[calc(100vw-2rem)] max-w-[320px] sm:w-96 sm:max-w-none bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] rounded-xl shadow-premium z-50 flex flex-col modal-enter-animation overflow-hidden"
        >
          <div className="px-3 py-2 sticky top-0 bg-[var(--theme-bg-secondary)] z-10">
              <div className="flex items-center gap-2 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-lg px-2 py-1.5">
                  <Search size={16} className="text-[var(--theme-text-tertiary)]" />
                  <input 
                      ref={searchInputRef}
                      type="text"
                      className="flex-1 bg-transparent border-none outline-none text-base text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] min-w-0"
                      placeholder={t('header_model_search_placeholder' as any) || "Search models..."}
                      value={modelSearchQuery}
                      onChange={(e) => setModelSearchQuery(e.target.value)}
                      onKeyDown={handleSearchKeyDown}
                      onClick={(e) => e.stopPropagation()}
                      autoComplete="off"
                  />
                  {modelSearchQuery && (
                      <button onClick={(e) => { e.stopPropagation(); setModelSearchQuery(''); searchInputRef.current?.focus(); }} className="text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)]">
                          <X size={14} />
                      </button>
                  )}
              </div>
          </div>

          <div 
            ref={listRef}
            className="max-h-96 overflow-y-auto custom-scrollbar" 
            role="listbox" 
            aria-labelledby="model-selector-button"
          >
            {filteredModels.length > 0 ? (
              filteredModels.map((model, index) => {
                const prevModel = filteredModels[index - 1];
                const showDivider = index > 0 && prevModel.isPinned && !model.isPinned;
                const isDefault = model.id === defaultModelId;

                return (
                <React.Fragment key={model.id}>
                    {showDivider && (
                        <div className="h-px bg-[var(--theme-border-secondary)] my-1 mx-2 opacity-50" />
                    )}
                    <div
                    onMouseEnter={() => setHighlightedIndex(index)}
                    role="option"
                    aria-selected={index === highlightedIndex}
                    className={`group w-full text-left px-3 py-2.5 text-base transition-colors cursor-pointer flex items-center justify-between
                        ${index === highlightedIndex ? 'bg-[var(--theme-bg-tertiary)]' : ''}
                        ${model.id === selectedModelId ? 'bg-[var(--theme-bg-tertiary)]/50' : ''}
                    `}
                    onClick={() => handleModelSelect(model.id)}
                    >
                        <div className="flex items-center gap-3 min-w-0 flex-grow overflow-hidden">
                            {getModelIcon(model)}
                            <span className={`truncate ${model.id === selectedModelId ? 'text-[var(--theme-text-link)] font-semibold' : 'text-[var(--theme-text-primary)]'}`} title={model.name}>
                                {model.name}
                            </span>
                        </div>
                        
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                                onClick={(e) => handleSetDefault(e, model.id)}
                                className={`p-2 rounded-full transition-all focus:outline-none z-10
                                    ${isDefault 
                                        ? 'text-yellow-500 opacity-100 hover:bg-yellow-500/10' 
                                        : 'text-[var(--theme-text-tertiary)] opacity-30 hover:opacity-100 hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)]'
                                    }
                                `}
                                title={isDefault ? t('header_setDefault_isDefault') : t('header_setDefault_action')}
                                aria-label={isDefault ? t('header_setDefault_isDefault') : t('header_setDefault_action')}
                            >
                                <Star size={16} fill={isDefault ? "currentColor" : "none"} strokeWidth={2} />
                            </button>
                        </div>
                    </div>
                </React.Fragment>
                );
              })
            ) : isModelsLoading ? (
              <div>
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="px-4 py-2.5 flex items-center gap-2 animate-pulse">
                    <div className="h-5 w-5 bg-[var(--theme-bg-tertiary)] rounded-full"></div>
                    <div className="h-5 flex-grow bg-[var(--theme-bg-tertiary)] rounded"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-sm text-[var(--theme-text-tertiary)] flex flex-col items-center justify-center gap-2">
                  <Search size={24} className="opacity-50" />
                  <p>{modelSearchQuery ? "No matching models found" : t('headerModelSelectorNoModels')}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
