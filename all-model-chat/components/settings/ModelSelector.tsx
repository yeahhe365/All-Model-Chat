
import React, { useState } from 'react';
import { ModelOption } from '../../types';
import { Bot, ChevronDown, Plus, Trash2, RotateCcw, Pencil, X, Check } from 'lucide-react';
import { ModelPicker, getModelIcon } from '../shared/ModelPicker';
import { getDefaultModelOptions } from '../../utils/appUtils';

interface ModelSelectorProps {
  modelId: string;
  setModelId: (value: string) => void;
  availableModels: ModelOption[];
  t: (key: string) => string;
  setAvailableModels: (models: ModelOption[]) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  modelId,
  setModelId,
  availableModels,
  t,
  setAvailableModels
}) => {
  const [isEditingList, setIsEditingList] = useState(false);
  const [tempModels, setTempModels] = useState<ModelOption[]>(availableModels);

  // Sync temp state when editing starts or availableModels changes externally
  React.useEffect(() => {
      if (!isEditingList) {
          setTempModels(availableModels);
      }
  }, [availableModels, isEditingList]);

  const handleUpdateTempModel = (index: number, field: keyof ModelOption, value: any) => {
      const updated = [...tempModels];
      updated[index] = { ...updated[index], [field]: value };
      setTempModels(updated);
  };

  const handleDeleteModel = (index: number) => {
      setTempModels(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddModel = () => {
      setTempModels(prev => [...prev, { id: '', name: '', isPinned: true }]);
  };

  const handleResetDefaults = () => {
      if (window.confirm("Reset model list to default? This will clear all custom additions.")) {
          const defaults = getDefaultModelOptions();
          setTempModels(defaults);
          setAvailableModels(defaults);
          setIsEditingList(false);
      }
  };

  const handleSaveList = () => {
      // Filter out empty IDs
      const validModels = tempModels.filter(m => m.id.trim() !== '');
      // Ensure names default to ID if empty
      const refinedModels = validModels.map(m => ({
          ...m,
          name: m.name.trim() || m.id.trim()
      }));
      
      setAvailableModels(refinedModels);
      setIsEditingList(false);
  };

  return (
    <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)] flex items-center gap-2">
                <Bot size={14} strokeWidth={1.5} /> Model Selection
            </h4>
            
            <button 
                onClick={() => setIsEditingList(!isEditingList)} 
                className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors ${isEditingList ? 'bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)]' : 'text-[var(--theme-text-link)] hover:bg-[var(--theme-bg-tertiary)]'}`}
            >
                {isEditingList ? <X size={12} /> : <Pencil size={12} />}
                {isEditingList ? 'Cancel Edit' : 'Edit List'}
            </button>
        </div>

        {isEditingList ? (
            <div className="border border-[var(--theme-border-secondary)] rounded-xl bg-[var(--theme-bg-input)]/50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-2 space-y-2">
                    {tempModels.map((model, idx) => (
                        <div key={idx} className="flex items-center gap-2 group">
                            <div className="w-8 flex justify-center text-[var(--theme-text-tertiary)]">
                                {getModelIcon(model)}
                            </div>
                            <input 
                                type="text" 
                                value={model.id} 
                                onChange={(e) => handleUpdateTempModel(idx, 'id', e.target.value)}
                                placeholder="Model ID (e.g. gemini-pro)"
                                className="flex-1 min-w-0 bg-[var(--theme-bg-primary)] border border-[var(--theme-border-secondary)] rounded px-2 py-1.5 text-xs text-[var(--theme-text-primary)] focus:border-[var(--theme-border-focus)] outline-none font-mono"
                            />
                            <input 
                                type="text" 
                                value={model.name} 
                                onChange={(e) => handleUpdateTempModel(idx, 'name', e.target.value)}
                                placeholder="Display Name"
                                className="flex-1 min-w-0 bg-[var(--theme-bg-primary)] border border-[var(--theme-border-secondary)] rounded px-2 py-1.5 text-xs text-[var(--theme-text-primary)] focus:border-[var(--theme-border-focus)] outline-none"
                            />
                            <button 
                                onClick={() => handleDeleteModel(idx)}
                                className="p-1.5 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-danger)] hover:bg-[var(--theme-bg-danger)]/10 rounded transition-colors"
                                title="Remove"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                    
                    {tempModels.length === 0 && (
                        <div className="p-4 text-center text-xs text-[var(--theme-text-tertiary)] italic">
                            No models in list. Add one or reset to defaults.
                        </div>
                    )}
                </div>
                
                <div className="border-t border-[var(--theme-border-secondary)] p-3 bg-[var(--theme-bg-secondary)]/30 flex items-center justify-between gap-2">
                    <div className="flex gap-2">
                        <button 
                            onClick={handleAddModel}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--theme-text-primary)] bg-[var(--theme-bg-primary)] border border-[var(--theme-border-secondary)] rounded hover:bg-[var(--theme-bg-tertiary)] transition-colors"
                        >
                            <Plus size={14} /> Add Model
                        </button>
                        <button 
                            onClick={handleResetDefaults}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded transition-colors"
                        >
                            <RotateCcw size={14} /> Reset
                        </button>
                    </div>
                    
                    <button 
                        onClick={handleSaveList}
                        className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-[var(--theme-text-accent)] bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] rounded transition-colors shadow-sm"
                    >
                        <Check size={14} /> Save List
                    </button>
                </div>
            </div>
        ) : (
            <div className="space-y-5">
                <div className="flex items-center justify-between py-1">
                    <label className="text-sm font-medium text-[var(--theme-text-primary)] mr-4 flex-shrink-0">{t('settingsDefaultModel')}</label>
                    
                    <div className="w-full sm:w-64 relative">
                        <ModelPicker 
                            models={availableModels}
                            selectedId={modelId}
                            onSelect={setModelId}
                            t={t}
                            dropdownClassName="w-72 right-0 left-auto max-h-[300px]"
                            renderTrigger={({ isOpen, setIsOpen, selectedModel }) => (
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(!isOpen)}
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
        )}
    </div>
  );
};
