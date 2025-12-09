
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ModelOption } from '../../types';
import { Loader2, Search, X, Check, Box, Volume2, Image as ImageIcon, Sparkles, Star } from 'lucide-react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { sortModels } from '../../utils/appUtils';
import { useResponsiveValue } from '../../hooks/useDevice';

export const getModelIcon = (model: ModelOption | undefined) => {
    if (!model) return <Box size={15} className="text-[var(--theme-text-tertiary)]" strokeWidth={1.5} />;
    const { id, isPinned } = model;
    const lowerId = id.toLowerCase();
    if (lowerId.includes('tts')) return <Volume2 size={15} className="text-purple-500 dark:text-purple-400 flex-shrink-0" strokeWidth={1.5} />;
    if (lowerId.includes('imagen') || lowerId.includes('image-')) return <ImageIcon size={15} className="text-rose-500 dark:text-rose-400 flex-shrink-0" strokeWidth={1.5} />;
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

    // Optional: Default model star functionality
    defaultModelId?: string;
    onSetDefault?: (modelId: string) => void;
    
    dropdownClassName?: string;
}

export const ModelPicker: React.FC<ModelPickerProps> = ({
    models,
    selectedId,
    onSelect,
    t,
    renderTrigger,
    defaultModelId,
    onSetDefault,
    dropdownClassName
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    useClickOutside(containerRef, () => setIsOpen(false), isOpen);

    // Reset search on open/close
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => searchInputRef.current?.focus(), 50);
        } else {
            const timer = setTimeout(() => {
                setSearchQuery('');
                setHighlightedIndex(0);
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Filtering
    const filteredModels = useMemo(() => {
        let result = models;
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(m => 
                m.name.toLowerCase().includes(query) || 
                m.id.toLowerCase().includes(query)
            );
        }
        return sortModels(result);
    }, [models, searchQuery]);

    // Reset highlight on search change
    useEffect(() => {
        setHighlightedIndex(0);
    }, [searchQuery]);

    // Auto-scroll to highlighted item
    useEffect(() => {
        if (isOpen && listRef.current && filteredModels.length > 0) {
            const activeItem = listRef.current.children[highlightedIndex] as HTMLElement;
            if (activeItem) {
                activeItem.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [highlightedIndex, isOpen, filteredModels.length]);

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
                onSelect(selectedModel.id);
                setIsOpen(false);
            }
        }
    };

    const selectedModel = models.find(m => m.id === selectedId);

    return (
        <div className="relative" ref={containerRef}>
            {renderTrigger({ 
                isOpen, 
                setIsOpen, 
                selectedModel, 
                ref: containerRef // Providing ref but it's handled by parent click-outside usually
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
                        <>
                            <div className="px-2 py-2 sticky top-0 bg-[var(--theme-bg-secondary)] z-10">
                                <div className="flex items-center gap-2 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-lg px-2 py-1.5">
                                    <Search size={14} className="text-[var(--theme-text-tertiary)]" />
                                    <input 
                                        ref={searchInputRef}
                                        type="text"
                                        className="flex-1 bg-transparent border-none outline-none text-sm text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] min-w-0"
                                        placeholder={t('header_model_search_placeholder') || "Search..."}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={handleSearchKeyDown}
                                        onClick={(e) => e.stopPropagation()}
                                        autoComplete="off"
                                    />
                                    {searchQuery && (
                                        <button onClick={(e) => { e.stopPropagation(); setSearchQuery(''); searchInputRef.current?.focus(); }} className="text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)]">
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div 
                                ref={listRef}
                                className="overflow-y-auto custom-scrollbar p-1 flex-grow" 
                                role="listbox"
                            >
                                {filteredModels.length > 0 ? (
                                    filteredModels.map((model, index) => {
                                        const prevModel = filteredModels[index - 1];
                                        const showDivider = index > 0 && prevModel.isPinned && !model.isPinned;
                                        const isDefault = model.id === defaultModelId;
                                        const isSelected = model.id === selectedId;

                                        return (
                                            <React.Fragment key={model.id}>
                                                {showDivider && (
                                                    <div className="h-px bg-[var(--theme-border-secondary)] my-1 mx-2 opacity-50" />
                                                )}
                                                <div
                                                    role="option"
                                                    aria-selected={index === highlightedIndex}
                                                    onMouseEnter={() => setHighlightedIndex(index)}
                                                    onClick={() => { onSelect(model.id); setIsOpen(false); }}
                                                    className={`group w-full text-left px-3 py-2 text-sm rounded-lg flex items-center justify-between transition-colors cursor-pointer
                                                        ${index === highlightedIndex ? 'bg-[var(--theme-bg-tertiary)]' : ''}
                                                        ${isSelected ? 'bg-[var(--theme-bg-tertiary)]/50' : ''}
                                                    `}
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0 flex-grow overflow-hidden">
                                                        {getModelIcon(model)}
                                                        <span className={`truncate ${isSelected ? 'text-[var(--theme-text-link)] font-semibold' : 'text-[var(--theme-text-primary)]'}`} title={model.name}>
                                                            {model.name}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                        {onSetDefault && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); onSetDefault(model.id); }}
                                                                className={`p-1.5 rounded-full transition-all focus:outline-none z-10
                                                                    ${isDefault 
                                                                        ? 'text-yellow-500 opacity-100 hover:bg-yellow-500/10' 
                                                                        : 'text-[var(--theme-text-tertiary)] opacity-0 group-hover:opacity-50 hover:!opacity-100 hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)]'
                                                                    }
                                                                `}
                                                                title={isDefault ? t('header_setDefault_isDefault') : t('header_setDefault_action')}
                                                            >
                                                                <Star size={14} fill={isDefault ? "currentColor" : "none"} strokeWidth={2} />
                                                            </button>
                                                        )}
                                                        {isSelected && !onSetDefault && <Check size={14} className="text-[var(--theme-text-link)]" strokeWidth={1.5} />}
                                                    </div>
                                                </div>
                                            </React.Fragment>
                                        );
                                    })
                                ) : (
                                    <div className="p-4 text-center text-xs text-[var(--theme-text-tertiary)]">
                                        No matching models found
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
