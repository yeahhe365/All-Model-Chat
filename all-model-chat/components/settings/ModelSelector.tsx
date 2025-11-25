
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ModelOption } from '../../types';
import { Loader2, Bot, Box, Volume2, Image as ImageIcon, Sparkles, Search, X, Check, ChevronDown } from 'lucide-react';
import { useResponsiveValue } from '../../hooks/useDevice';
import { useClickOutside } from '../../hooks/useClickOutside';
import { sortModels } from '../../utils/appUtils';

interface ModelSelectorProps {
  modelId: string;
  setModelId: (value: string) => void;
  isModelsLoading: boolean;
  modelsLoadingError: string | null;
  availableModels: ModelOption[];
  t: (key: string) => string;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  modelId,
  setModelId,
  isModelsLoading,
  modelsLoadingError,
  availableModels,
  t
}) => {
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const modelSelectorRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const iconSize = useResponsiveValue(16, 18);

  useClickOutside(modelSelectorRef, () => setIsModelSelectorOpen(false), isModelSelectorOpen);

  useEffect(() => {
    if (isModelSelectorOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
        setTimeout(() => setModelSearchQuery(''), 200);
    }
  }, [isModelSelectorOpen]);

  const getModelIcon = (model: ModelOption) => {
      const { id, isPinned } = model;
      const lowerId = id.toLowerCase();
      if (lowerId.includes('tts')) return <Volume2 size={15} className="text-purple-500 dark:text-purple-400 flex-shrink-0" strokeWidth={1.5} />;
      if (lowerId.includes('imagen') || lowerId.includes('image-')) return <ImageIcon size={15} className="text-rose-500 dark:text-rose-400 flex-shrink-0" strokeWidth={1.5} />;
      if (isPinned) return <Sparkles size={15} className="text-sky-500 dark:text-sky-400 flex-shrink-0" strokeWidth={1.5} />;
      return <Box size={15} className="text-[var(--theme-text-tertiary)] opacity-70 flex-shrink-0" strokeWidth={1.5} />;
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

  const selectedModelOption = availableModels.find(m => m.id === modelId);

  return (
    <div className="space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)] flex items-center gap-2">
            <Bot size={14} strokeWidth={1.5} /> Model Selection
        </h4>
        <div className="space-y-5">
        <div>
            <label className="block text-sm font-medium text-[var(--theme-text-primary)] mb-2">{t('settingsDefaultModel')}</label>
            {isModelsLoading ? (
            <div className="flex items-center justify-start bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] text-[var(--theme-text-secondary)] text-sm rounded-lg p-2.5 w-full">
                <Loader2 size={iconSize} className="animate-spin mr-2.5 text-[var(--theme-text-link)]" strokeWidth={1.5} />
                <span>{t('loading')}</span>
            </div>
            ) : modelsLoadingError ? (
                <div className="text-sm text-[var(--theme-text-danger)] p-2 bg-[var(--theme-bg-error-message)] border border-[var(--theme-bg-danger)] rounded-md">{modelsLoadingError}</div>
            ) : (
            <div className="relative" ref={modelSelectorRef}>
                <button
                    type="button"
                    onClick={() => setIsModelSelectorOpen(!isModelSelectorOpen)}
                    className={`w-full p-2.5 text-left border rounded-lg flex items-center justify-between transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] cursor-pointer bg-[var(--theme-bg-input)] hover:border-[var(--theme-border-focus)] border-[var(--theme-border-secondary)] text-[var(--theme-text-primary)] text-sm`}
                    aria-haspopup="listbox"
                    aria-expanded={isModelSelectorOpen}
                >
                    <div className="flex items-center gap-2.5 min-w-0">
                        {selectedModelOption ? getModelIcon(selectedModelOption) : <Box size={15} className="text-[var(--theme-text-tertiary)]" />}
                        <span className="truncate font-medium">
                            {selectedModelOption ? selectedModelOption.name : <span className="text-[var(--theme-text-tertiary)]">{t('chatBehavior_model_noModels')}</span>}
                        </span>
                    </div>
                    <ChevronDown size={16} className={`text-[var(--theme-text-tertiary)] transition-transform duration-200 ${isModelSelectorOpen ? 'rotate-180' : ''}`} strokeWidth={1.5} />
                </button>

                {isModelSelectorOpen && (
                    <div className="absolute top-full left-0 mt-1 w-full bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] rounded-xl shadow-premium z-50 flex flex-col overflow-hidden modal-enter-animation max-h-[300px]">
                        <div className="px-2 py-2 border-b border-[var(--theme-border-secondary)] sticky top-0 bg-[var(--theme-bg-secondary)] z-10">
                            <div className="flex items-center gap-2 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-lg px-2 py-1.5">
                                <Search size={14} className="text-[var(--theme-text-tertiary)]" />
                                <input 
                                    ref={searchInputRef}
                                    type="text"
                                    className="flex-1 bg-transparent border-none outline-none text-sm text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] min-w-0"
                                    placeholder={t('header_model_search_placeholder' as any) || "Search..."}
                                    value={modelSearchQuery}
                                    onChange={(e) => setModelSearchQuery(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                                {modelSearchQuery && (
                                    <button onClick={(e) => { e.stopPropagation(); setModelSearchQuery(''); searchInputRef.current?.focus(); }} className="text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)]">
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="overflow-y-auto custom-scrollbar p-1" role="listbox">
                            {filteredModels.length > 0 ? (
                                filteredModels.map((model) => (
                                    <button
                                        key={model.id}
                                        onClick={() => { setModelId(model.id); setIsModelSelectorOpen(false); }}
                                        className={`w-full text-left px-3 py-2 text-sm rounded-lg flex items-center justify-between transition-colors ${
                                            model.id === modelId
                                            ? 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)] font-medium'
                                            : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)]/50 hover:text-[var(--theme-text-primary)]'
                                        }`}
                                        role="option"
                                        aria-selected={model.id === modelId}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            {getModelIcon(model)}
                                            <span className="truncate">{model.name}</span>
                                        </div>
                                        {model.id === modelId && <Check size={14} className="text-[var(--theme-text-link)] flex-shrink-0 ml-2" strokeWidth={1.5} />}
                                    </button>
                                ))
                            ) : (
                                <div className="p-4 text-center text-xs text-[var(--theme-text-tertiary)]">
                                    No models found
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
            )}
        </div>
        </div>
    </div>
  );
};
