
import React, { useState, useRef, useMemo } from 'react';
import { ModelOption } from '../../types';
import { Box, Volume2, Image as ImageIcon, Sparkles, MessageSquareText, Check, AudioWaveform } from 'lucide-react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { sortModels } from '../../utils/appUtils';

export const getModelIcon = (model: ModelOption | undefined) => {
    if (!model) return <Box size={15} className="text-[var(--theme-text-tertiary)]" strokeWidth={1.5} />;
    const { id, isPinned } = model;
    const lowerId = id.toLowerCase();
    
    // Native Audio (Live)
    if (lowerId.includes('native-audio')) return <AudioWaveform size={15} className="text-amber-500 dark:text-amber-400 flex-shrink-0" strokeWidth={1.5} />;

    if (lowerId.includes('tts')) return <Volume2 size={15} className="text-purple-500 dark:text-purple-400 flex-shrink-0" strokeWidth={1.5} />;
    // Check for 'imagen' or 'image' to capture models like gemini-2.5-flash-image (Nano Banana)
    if (lowerId.includes('imagen') || lowerId.includes('image')) return <ImageIcon size={15} className="text-rose-500 dark:text-rose-400 flex-shrink-0" strokeWidth={1.5} />;
    
    // Gemini Text Models
    if (lowerId.includes('gemini')) return <MessageSquareText size={15} className="text-sky-500 dark:text-sky-400 flex-shrink-0" strokeWidth={1.5} />;

    if (isPinned) return <Sparkles size={15} className="text-sky-500 dark:text-sky-400 flex-shrink-0" strokeWidth={1.5} />;
    return <Box size={15} className="text-[var(--theme-text-tertiary)] opacity-70 flex-shrink-0" strokeWidth={1.5} />;
};

export interface ModelPickerProps {
    models: ModelOption[];
    selectedId: string;
    onSelect: (modelId: string) => void;
    t: (key: string) => string;
    
    // Render props for the trigger button
    renderTrigger: (props: { 
        isOpen: boolean; 
        setIsOpen: (v: boolean) => void; 
        selectedModel: ModelOption | undefined;
        ref: React.RefObject<any>;
    }) => React.ReactNode;
    
    dropdownClassName?: string;
}

export const ModelPicker: React.FC<ModelPickerProps> = ({
    models,
    selectedId,
    onSelect,
    t,
    renderTrigger,
    dropdownClassName
}) => {
    const [isOpen, setIsOpen] = useState(false);
    
    const containerRef = useRef<HTMLDivElement>(null);

    useClickOutside(containerRef, () => setIsOpen(false), isOpen);

    // Just Sort
    const sortedModels = useMemo(() => {
        return sortModels(models);
    }, [models]);

    const selectedModel = models.find(m => m.id === selectedId);

    return (
        <div className="relative" ref={containerRef}>
            {renderTrigger({ 
                isOpen, 
                setIsOpen, 
                selectedModel, 
                ref: containerRef
            })}

            {isOpen && (
                <div 
                    className={`absolute top-full left-0 mt-1 bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] rounded-xl shadow-premium z-50 flex flex-col modal-enter-animation overflow-hidden ${dropdownClassName || 'w-full min-w-[280px] max-h-[300px]'}`}
                >
                    {!models.length ? (
                        <div className="p-4 text-center">
                            <p className="text-xs text-[var(--theme-text-tertiary)] mt-2">No models available</p>
                        </div>
                    ) : (
                        <div 
                            className="overflow-y-auto custom-scrollbar p-1 flex-grow" 
                            role="listbox"
                        >
                            {sortedModels.map((model, index) => {
                                const prevModel = sortedModels[index - 1];
                                const showDivider = index > 0 && prevModel.isPinned && !model.isPinned;
                                const isSelected = model.id === selectedId;

                                return (
                                    <React.Fragment key={model.id}>
                                        {showDivider && (
                                            <div className="h-px bg-[var(--theme-border-secondary)] my-1 mx-2 opacity-50" />
                                        )}
                                        <button
                                            role="option"
                                            aria-selected={isSelected}
                                            onClick={() => { onSelect(model.id); setIsOpen(false); }}
                                            className={`group w-full text-left px-3 py-2 text-sm rounded-lg flex items-center justify-between transition-colors cursor-pointer outline-none
                                                ${isSelected 
                                                    ? 'bg-[var(--theme-bg-tertiary)]/50' 
                                                    : 'hover:bg-[var(--theme-bg-tertiary)] focus:bg-[var(--theme-bg-tertiary)]'
                                                }
                                            `}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0 flex-grow overflow-hidden">
                                                {getModelIcon(model)}
                                                <span className={`truncate ${isSelected ? 'text-[var(--theme-text-link)] font-semibold' : 'text-[var(--theme-text-primary)]'}`} title={model.name}>
                                                    {model.name}
                                                </span>
                                            </div>
                                            
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                {isSelected && <Check size={14} className="text-[var(--theme-text-link)]" strokeWidth={1.5} />}
                                            </div>
                                        </button>
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
