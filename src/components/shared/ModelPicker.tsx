
import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { ModelOption } from '../../types';
import { Check } from 'lucide-react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { sortModels } from '../../utils/appUtils';
import { getModelIcon } from './modelPickerUtils';

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
        ref: React.Ref<HTMLButtonElement>;
        onTriggerClick: () => void;
        onTriggerKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
        triggerAriaProps: {
            'aria-haspopup': 'listbox';
            'aria-expanded': boolean;
            'aria-controls': string;
        };
    }) => React.ReactNode;
    
    dropdownClassName?: string;
}

export const ModelPicker: React.FC<ModelPickerProps> = ({
    models,
    selectedId,
    onSelect,
    t: _t,
    renderTrigger,
    dropdownClassName
}) => {
    const [isOpen, setIsOpen] = useState(false);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

    useClickOutside(containerRef, () => setIsOpen(false), isOpen);

    // Just Sort
    const sortedModels = useMemo(() => {
        return sortModels(models);
    }, [models]);

    const selectedModel = models.find(m => m.id === selectedId);
    const selectedIndex = sortedModels.findIndex(model => model.id === selectedId);
    const [highlightedIndex, setHighlightedIndex] = useState(selectedIndex >= 0 ? selectedIndex : -1);
    const listboxId = `model-picker-${Math.abs(selectedId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0))}`;

    const getNextIndex = useCallback((startIndex: number, direction: 1 | -1) => {
        if (sortedModels.length === 0) return -1;
        return (startIndex + direction + sortedModels.length) % sortedModels.length;
    }, [sortedModels.length]);

    const openMenu = useCallback((preferredIndex?: number) => {
        const nextIndex = preferredIndex ?? (selectedIndex >= 0 ? selectedIndex : 0);
        setHighlightedIndex(nextIndex);
        setIsOpen(true);
    }, [selectedIndex]);

    const closeMenu = useCallback((restoreFocus: boolean = true) => {
        setIsOpen(false);
        if (restoreFocus) {
            triggerRef.current?.focus();
        }
    }, []);

    const handleTriggerClick = useCallback(() => {
        if (isOpen) {
            closeMenu(false);
            return;
        }
        openMenu();
    }, [closeMenu, isOpen, openMenu]);

    const handleTriggerKeyDown = useCallback((event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            openMenu(selectedIndex >= 0 ? selectedIndex : 0);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            openMenu(selectedIndex >= 0 ? selectedIndex : Math.max(sortedModels.length - 1, 0));
        } else if (event.key === 'Home') {
            event.preventDefault();
            openMenu(0);
        } else if (event.key === 'End') {
            event.preventDefault();
            openMenu(Math.max(sortedModels.length - 1, 0));
        } else if ((event.key === 'Enter' || event.key === ' ') && !isOpen) {
            event.preventDefault();
            openMenu();
        } else if (event.key === 'Escape' && isOpen) {
            event.preventDefault();
            closeMenu();
        }
    }, [closeMenu, isOpen, openMenu, selectedIndex, sortedModels.length]);

    const handleOptionKeyDown = useCallback((index: number) => (event: React.KeyboardEvent<HTMLButtonElement>) => {
        const focusOption = (nextIndex: number) => {
            setHighlightedIndex(nextIndex);
            optionRefs.current[nextIndex]?.focus();
        };

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            focusOption(getNextIndex(index, 1));
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            focusOption(getNextIndex(index, -1));
        } else if (event.key === 'Home') {
            event.preventDefault();
            focusOption(0);
        } else if (event.key === 'End') {
            event.preventDefault();
            focusOption(Math.max(sortedModels.length - 1, 0));
        } else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect(sortedModels[index].id);
            closeMenu();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            closeMenu();
        } else if (event.key === 'Tab') {
            closeMenu(false);
        }
    }, [closeMenu, getNextIndex, onSelect, sortedModels]);

    useEffect(() => {
        if (!isOpen || highlightedIndex < 0) return;
        optionRefs.current[highlightedIndex]?.focus();
    }, [highlightedIndex, isOpen]);

    return (
        <div className="relative" ref={containerRef}>
            {renderTrigger({ 
                isOpen, 
                setIsOpen, 
                selectedModel, 
                ref: triggerRef,
                onTriggerClick: handleTriggerClick,
                onTriggerKeyDown: handleTriggerKeyDown,
                triggerAriaProps: {
                    'aria-haspopup': 'listbox',
                    'aria-expanded': isOpen,
                    'aria-controls': listboxId,
                }
            })}

            {isOpen && (
                <div 
                    id={listboxId}
                    className={`absolute top-full left-0 mt-1 bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] rounded-xl shadow-premium z-50 flex flex-col modal-enter-animation overflow-hidden ${dropdownClassName || 'w-full min-w-[280px] max-h-[300px]'}`}
                >
                    {!models.length ? (
                        <div className="p-4 text-center">
                            <p className="text-xs text-[var(--theme-text-tertiary)] mt-2">{t('modelPicker_empty')}</p>
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
                                            ref={(element) => {
                                                optionRefs.current[index] = element;
                                            }}
                                            role="option"
                                            aria-selected={isSelected}
                                            tabIndex={index === highlightedIndex ? 0 : -1}
                                            onClick={() => { onSelect(model.id); setIsOpen(false); }}
                                            onKeyDown={handleOptionKeyDown(index)}
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
