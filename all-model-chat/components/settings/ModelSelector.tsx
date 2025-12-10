
import React, { useState } from 'react';
import { ModelOption } from '../../types';
import { Bot, Plus, Trash2, RotateCcw, Pencil, X, Check, Eye } from 'lucide-react';
import { getModelIcon } from '../shared/ModelPicker';
import { getDefaultModelOptions } from '../../utils/appUtils';

interface ModelSelectorProps {
  availableModels: ModelOption[];
  selectedModelId: string;
  onSelectModel: (id: string) => void;
  t: (key: string) => string;
  setAvailableModels: (models: ModelOption[]) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  availableModels,
  selectedModelId,
  onSelectModel,
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
                <Bot size={14} strokeWidth={1.5} /> Manage Models
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
            <div className="border border-[var(--theme-border-secondary)] rounded-xl bg-[var(--theme-bg-input)]/30 overflow-hidden">
                <div className="max-h-[200px] overflow-y-auto custom-scrollbar p-1">
                    {availableModels.map((model, idx) => {
                        const isSelected = model.id === selectedModelId;
                        return (
                            <div 
                                key={model.id} 
                                onClick={() => onSelectModel(model.id)}
                                className={`flex items-center gap-3 px-3 py-2 text-sm border-b border-[var(--theme-border-secondary)]/50 last:border-0 transition-colors cursor-pointer group
                                    ${isSelected 
                                        ? 'bg-[var(--theme-bg-accent)]/10 text-[var(--theme-text-primary)]' 
                                        : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)]/50 hover:text-[var(--theme-text-primary)]'
                                    }
                                `}
                            >
                                <div className={`flex-shrink-0 ${isSelected ? 'text-[var(--theme-text-link)]' : 'opacity-70'}`}>
                                    {getModelIcon(model)}
                                </div>
                                <div className="flex-grow min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className={`font-medium truncate ${isSelected ? 'text-[var(--theme-text-link)]' : ''}`}>{model.name}</span>
                                        {model.isPinned && <span className="text-[10px] bg-[var(--theme-bg-tertiary)] px-1.5 py-0.5 rounded text-[var(--theme-text-tertiary)] border border-[var(--theme-border-secondary)]">Pinned</span>}
                                    </div>
                                    <div className="text-[10px] text-[var(--theme-text-tertiary)] font-mono truncate opacity-70">{model.id}</div>
                                </div>
                                
                                <div className="flex-shrink-0 ml-2">
                                    {isSelected ? (
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)] text-[10px] font-bold shadow-sm border border-transparent animate-in fade-in zoom-in duration-200">
                                            <Check size={11} strokeWidth={3} />
                                            <span>Active</span>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onSelectModel(model.id); }}
                                            className="opacity-0 group-hover:opacity-100 focus:opacity-100 px-2.5 py-1 rounded-lg border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)] text-[var(--theme-text-secondary)] hover:border-[var(--theme-bg-accent)] hover:text-[var(--theme-text-accent)] hover:bg-[var(--theme-bg-accent)] text-[10px] font-medium transition-all shadow-sm"
                                        >
                                            Set Active
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {availableModels.length === 0 && (
                        <div className="p-4 text-center text-xs text-[var(--theme-text-tertiary)] italic">
                            No models available.
                        </div>
                    )}
                </div>
                <div className="px-3 py-2 bg-[var(--theme-bg-secondary)]/50 border-t border-[var(--theme-border-secondary)] text-[10px] text-[var(--theme-text-tertiary)] flex items-center gap-1.5">
                    <Eye size={12} />
                    <span>Click a model or "Set Active" to select it as default.</span>
                </div>
            </div>
        )}
    </div>
  );
};
