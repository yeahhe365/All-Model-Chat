
import React, { useRef } from 'react';
import { Check } from 'lucide-react';
import { ModelOption } from '../../../../types';
import { getModelIcon } from '../../../shared/modelPickerUtils';

interface ModelListViewProps {
    availableModels: ModelOption[];
    selectedModelId: string;
    onSelectModel: (id: string) => void;
    t: (key: string) => string;
}

export const ModelListView: React.FC<ModelListViewProps> = ({ availableModels, selectedModelId, onSelectModel, t }) => {
    const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

    const handleOptionKeyDown = (index: number, modelId: string) => (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            optionRefs.current[Math.min(index + 1, availableModels.length - 1)]?.focus();
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            optionRefs.current[Math.max(index - 1, 0)]?.focus();
        } else if (event.key === 'Home') {
            event.preventDefault();
            optionRefs.current[0]?.focus();
        } else if (event.key === 'End') {
            event.preventDefault();
            optionRefs.current[availableModels.length - 1]?.focus();
        } else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelectModel(modelId);
        }
    };

    return (
        <div className="border border-[var(--theme-border-secondary)] rounded-xl bg-[var(--theme-bg-input)]/30 overflow-hidden">
            <div
                className="max-h-[200px] overflow-y-auto custom-scrollbar p-1"
                role="listbox"
                aria-label={t('settingsModelList_manage')}
            >
                {availableModels.map((model, index) => {
                    const isSelected = model.id === selectedModelId;
                    return (
                        <button
                            key={model.id}
                            ref={(element) => {
                                optionRefs.current[index] = element;
                            }}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => onSelectModel(model.id)}
                            onKeyDown={handleOptionKeyDown(index, model.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-sm border-b border-[var(--theme-border-secondary)]/50 last:border-0 transition-colors cursor-pointer group text-left
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
                                    {model.isPinned && <span className="text-[10px] bg-[var(--theme-bg-tertiary)] px-1.5 py-0.5 rounded text-[var(--theme-text-tertiary)] border border-[var(--theme-border-secondary)]">{t('settingsModelList_pinned')}</span>}
                                </div>
                                <div className="text-[10px] text-[var(--theme-text-tertiary)] font-mono truncate opacity-70">{model.id}</div>
                            </div>
                            
                            <div className="flex-shrink-0 ml-2">
                                {isSelected ? (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)] text-[10px] font-bold shadow-sm border border-transparent animate-in fade-in zoom-in duration-200">
                                        <Check size={11} strokeWidth={3} />
                                        <span>{t('settingsModelList_active')}</span>
                                    </div>
                                ) : (
                                    <span className="opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 px-2.5 py-1 rounded-lg border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)] text-[var(--theme-text-secondary)] text-[10px] font-medium transition-all shadow-sm">
                                        {t('settingsModelList_set_active')}
                                    </span>
                                )}
                            </div>
                        </button>
                    );
                })}
                {availableModels.length === 0 && (
                    <div className="p-4 text-center text-xs text-[var(--theme-text-tertiary)] italic">
                        {t('settingsModelList_empty')}
                    </div>
                )}
            </div>
        </div>
    );
};
