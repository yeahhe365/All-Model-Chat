
import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { getTranslator } from '../../utils/appUtils';
import { useSettingsStore } from '../../stores/settingsStore';

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label: string;
  children: React.ReactNode;
  labelContent?: React.ReactNode;
  onChange: (e: { target: { value: string } }) => void;
  layout?: 'vertical' | 'horizontal';
  hideLabel?: boolean;
  wrapperClassName?: string;
  dropdownClassName?: string;
  direction?: 'up' | 'down';
}

export const Select: React.FC<SelectProps> = ({ 
    id, 
    label, 
    children, 
    labelContent, 
    value, 
    onChange, 
    disabled, 
    className, 
    layout = 'vertical', 
    hideLabel = false,
    wrapperClassName,
    dropdownClassName,
    direction = 'down',
    ...rest 
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const language = useSettingsStore((state) => state.language);
    const t = getTranslator(language);
    
    useClickOutside(wrapperRef, () => setIsOpen(false), isOpen);

    const options = useMemo(() => {
        const parsedOptions: Array<{ value: string; label: React.ReactNode; disabled: boolean }> = [];

        React.Children.forEach(children, child => {
            if (React.isValidElement<React.OptionHTMLAttributes<HTMLOptionElement>>(child) && child.type === 'option') {
                parsedOptions.push({
                    value: String(child.props.value),
                    label: child.props.children,
                    disabled: !!child.props.disabled,
                });
            }

            return undefined;
        });

        return parsedOptions;
    }, [children]);

    const selectedOption = options.find(opt => String(opt.value) === String(value));
    const selectedIndex = options.findIndex(opt => String(opt.value) === String(value));
    const [highlightedIndex, setHighlightedIndex] = useState(selectedIndex >= 0 ? selectedIndex : -1);

    const getNextEnabledIndex = useCallback((startIndex: number, direction: 1 | -1) => {
        if (options.length === 0) return -1;

        for (let offset = 1; offset <= options.length; offset += 1) {
            const nextIndex = (startIndex + offset * direction + options.length) % options.length;
            if (!options[nextIndex].disabled) {
                return nextIndex;
            }
        }

        return -1;
    }, [options]);

    const getBoundaryIndex = useCallback((direction: 'start' | 'end') => {
        const searchList = direction === 'start' ? options : [...options].reverse();
        const foundIndex = searchList.findIndex((option) => !option.disabled);
        if (foundIndex === -1) return -1;
        return direction === 'start' ? foundIndex : options.length - 1 - foundIndex;
    }, [options]);

    const openMenu = useCallback((preferredIndex?: number) => {
        if (disabled) return;

        const fallbackIndex = selectedIndex >= 0 && !options[selectedIndex]?.disabled
            ? selectedIndex
            : getBoundaryIndex('start');
        const nextIndex = preferredIndex ?? fallbackIndex;
        setHighlightedIndex(nextIndex);
        setIsOpen(true);
    }, [disabled, getBoundaryIndex, options, selectedIndex]);

    const closeMenu = useCallback((restoreFocus: boolean = true) => {
        setIsOpen(false);
        if (restoreFocus) {
            triggerRef.current?.focus();
        }
    }, []);

    const handleSelect = (val: string) => {
        onChange({ target: { value: val } });
        setHighlightedIndex(options.findIndex(opt => String(opt.value) === String(val)));
        setIsOpen(false);
        triggerRef.current?.focus();
    };

    const handleToggle = () => {
        if (isOpen) {
            closeMenu(false);
            return;
        }
        openMenu();
    };

    const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (disabled) return;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            openMenu(selectedIndex >= 0 ? selectedIndex : getBoundaryIndex('start'));
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            openMenu(selectedIndex >= 0 ? selectedIndex : getBoundaryIndex('end'));
        } else if (event.key === 'Home') {
            event.preventDefault();
            openMenu(getBoundaryIndex('start'));
        } else if (event.key === 'End') {
            event.preventDefault();
            openMenu(getBoundaryIndex('end'));
        } else if ((event.key === 'Enter' || event.key === ' ') && !isOpen) {
            event.preventDefault();
            openMenu();
        } else if (event.key === 'Escape' && isOpen) {
            event.preventDefault();
            closeMenu();
        }
    };

    const handleOptionKeyDown = (index: number) => (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setHighlightedIndex(getNextEnabledIndex(index, 1));
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setHighlightedIndex(getNextEnabledIndex(index, -1));
        } else if (event.key === 'Home') {
            event.preventDefault();
            setHighlightedIndex(getBoundaryIndex('start'));
        } else if (event.key === 'End') {
            event.preventDefault();
            setHighlightedIndex(getBoundaryIndex('end'));
        } else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleSelect(options[index].value);
        } else if (event.key === 'Escape') {
            event.preventDefault();
            closeMenu();
        } else if (event.key === 'Tab') {
            closeMenu(false);
        }
    };

    useEffect(() => {
        if (!isOpen || highlightedIndex < 0) return;
        optionRefs.current[highlightedIndex]?.focus();
    }, [highlightedIndex, isOpen]);

    const containerClasses = layout === 'horizontal' 
        ? `flex items-center justify-between py-1 ${className || ''}`
        : className;

    const labelClasses = layout === 'horizontal'
        ? "text-sm font-medium text-[var(--theme-text-primary)] mr-4 flex-shrink-0"
        : "block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5";

    // Default wrapper classes, overridable by prop
    const defaultWrapperClasses = layout === 'horizontal' 
        ? "relative w-full sm:w-64" 
        : "relative";
    
    const finalWrapperClasses = wrapperClassName || defaultWrapperClasses;

    const dropdownPositionClass = direction === 'up' ? 'bottom-full mb-1' : 'top-full mt-1';
    const listboxId = id ? `${id}-listbox` : undefined;

    return (
        <div className={containerClasses}>
            {!hideLabel && (
                <label htmlFor={id} className={labelClasses}>
                {labelContent || label}
                </label>
            )}
            {hideLabel && label && (
                <label htmlFor={id} className="sr-only">
                    {label}
                </label>
            )}
            <div className={finalWrapperClasses} ref={wrapperRef}>
                <button
                    type="button"
                    id={id}
                    ref={triggerRef}
                    onClick={handleToggle}
                    onKeyDown={handleTriggerKeyDown}
                    disabled={disabled}
                    className={`w-full p-2.5 text-left border rounded-lg flex items-center justify-between transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] ${disabled ? 'opacity-60 cursor-not-allowed bg-[var(--theme-bg-secondary)]' : 'cursor-pointer bg-[var(--theme-bg-input)] hover:border-[var(--theme-border-focus)]'} border-[var(--theme-border-secondary)] text-[var(--theme-text-primary)] text-sm`}
                    aria-haspopup="listbox"
                    aria-expanded={isOpen}
                    aria-controls={listboxId}
                    {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
                >
                    <div className="truncate mr-2 flex-grow text-left">
                        {selectedOption ? selectedOption.label : <span className="text-[var(--theme-text-tertiary)]">{t('select_placeholder')}</span>}
                    </div>
                    <ChevronDown size={16} className={`text-[var(--theme-text-tertiary)] transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} strokeWidth={1.5} />
                </button>
                
                {isOpen && (
                    <div
                        id={listboxId}
                        role="listbox"
                        className={`absolute ${dropdownPositionClass} left-0 z-50 w-full bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] rounded-xl shadow-premium overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col ${dropdownClassName || 'max-h-[300px]'}`}
                    >
                        <div className="overflow-y-auto custom-scrollbar p-1">
                            {options.map((opt, idx) => (
                                <button
                                    key={`${opt.value}-${idx}`}
                                    type="button"
                                    ref={(element) => {
                                        optionRefs.current[idx] = element;
                                    }}
                                    onClick={() => handleSelect(opt.value)}
                                    onKeyDown={handleOptionKeyDown(idx)}
                                    disabled={opt.disabled}
                                    id={id ? `${id}-option-${idx}` : undefined}
                                    role="option"
                                    aria-selected={String(opt.value) === String(value)}
                                    tabIndex={idx === highlightedIndex ? 0 : -1}
                                    className={`w-full text-left px-3 py-2 text-sm rounded-lg flex items-center justify-between transition-colors ${
                                        String(opt.value) === String(value)
                                        ? 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)] font-medium'
                                        : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)]/50 hover:text-[var(--theme-text-primary)]'
                                    } ${opt.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                    <span className="truncate w-full block">{opt.label}</span>
                                    {String(opt.value) === String(value) && <Check size={14} className="text-[var(--theme-text-link)] flex-shrink-0 ml-2" strokeWidth={1.5} />}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
