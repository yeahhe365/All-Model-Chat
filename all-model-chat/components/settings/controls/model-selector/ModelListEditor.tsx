import React, { useState, useEffect } from 'react';
import { Plus, RotateCcw, Check } from 'lucide-react';
import { ModelOption } from '../../../../types';
import { getDefaultModelOptions } from '../../../../utils/appUtils';
import { ModelListEditorRow } from './ModelListEditorRow';

interface ModelListEditorProps {
    availableModels: ModelOption[];
    onSave: (models: ModelOption[]) => void;
    setIsEditingList: (value: boolean) => void;
}

export const ModelListEditor: React.FC<ModelListEditorProps> = ({ availableModels, onSave, setIsEditingList }) => {
    const [tempModels, setTempModels] = useState<ModelOption[]>(availableModels);

    // Sync when entering edit mode (mounting) or parent updates
    useEffect(() => {
        setTempModels(availableModels);
    }, [availableModels]);

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
            setTempModels(getDefaultModelOptions());
        }
    };

    const handleSaveList = () => {
        const validModels = tempModels.filter(m => m.id.trim() !== '');
        const refinedModels = validModels.map(m => ({
            ...m,
            name: m.name.trim() || m.id.trim()
        }));
        onSave(refinedModels);
        setIsEditingList(false);
    };

    return (
        <div className="border border-[var(--theme-border-secondary)] rounded-xl bg-[var(--theme-bg-input)]/50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-2 space-y-2">
                {tempModels.map((model, idx) => (
                    <ModelListEditorRow 
                        key={idx} 
                        model={model} 
                        index={idx} 
                        onUpdate={handleUpdateTempModel} 
                        onDelete={handleDeleteModel} 
                    />
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
    );
};