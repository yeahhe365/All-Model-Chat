
import React from 'react';
import { ModelOption } from '../../types';
import { Bot, ChevronDown } from 'lucide-react';
import { ModelPicker, getModelIcon } from '../shared/ModelPicker';

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
  return (
    <div className="space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)] flex items-center gap-2">
            <Bot size={14} strokeWidth={1.5} /> Model Selection
        </h4>
        <div className="space-y-5">
            <div>
                <label className="block text-sm font-medium text-[var(--theme-text-primary)] mb-2">{t('settingsDefaultModel')}</label>
                
                <ModelPicker 
                    models={availableModels}
                    selectedId={modelId}
                    onSelect={setModelId}
                    isLoading={isModelsLoading}
                    error={modelsLoadingError}
                    t={t}
                    dropdownClassName="w-full max-h-[300px]"
                    renderTrigger={({ isOpen, setIsOpen, selectedModel }) => (
                        <button
                            type="button"
                            onClick={() => setIsOpen(!isOpen)}
                            disabled={isModelsLoading || !!modelsLoadingError}
                            className={`w-full p-2.5 text-left border rounded-lg flex items-center justify-between transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] cursor-pointer bg-[var(--theme-bg-input)] hover:border-[var(--theme-border-focus)] border-[var(--theme-border-secondary)] text-[var(--theme-text-primary)] text-sm disabled:opacity-70 disabled:cursor-not-allowed`}
                            aria-haspopup="listbox"
                            aria-expanded={isOpen}
                        >
                            <div className="flex items-center gap-2.5 min-w-0">
                                {getModelIcon(selectedModel)}
                                <span className="truncate font-medium">
                                    {selectedModel ? selectedModel.name : <span className="text-[var(--theme-text-tertiary)]">{t('chatBehavior_model_noModels')}</span>}
                                </span>
                            </div>
                            <ChevronDown size={16} className={`text-[var(--theme-text-tertiary)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} strokeWidth={1.5} />
                        </button>
                    )}
                />
            </div>
        </div>
    </div>
  );
};
