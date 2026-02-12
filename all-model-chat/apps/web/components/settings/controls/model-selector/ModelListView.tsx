
import React from 'react';
import { Check } from 'lucide-react';
import { ModelOption } from '../../../../types';
import { getModelIcon } from '../../../shared/ModelPicker';

interface ModelListViewProps {
    availableModels: ModelOption[];
    selectedModelId: string;
    onSelectModel: (id: string) => void;
}

export const ModelListView: React.FC<ModelListViewProps> = ({ availableModels, selectedModelId, onSelectModel }) => (
    <div className="border border-[var(--theme-border-secondary)] rounded-xl bg-[var(--theme-bg-input)]/30 overflow-hidden">
        <div className="max-h-[200px] overflow-y-auto custom-scrollbar p-1">
            {availableModels.map((model) => {
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
    </div>
);
