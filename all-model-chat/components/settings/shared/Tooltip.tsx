
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { useWindowContext } from '../../../contexts/WindowContext';

export const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => (
  <div className="tooltip-container ml-1.5">
    {children}
    <span className="tooltip-text">{text}</span>
  </div>
);

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label: string;
  children: React.ReactNode;
  labelContent?: React.ReactNode;
  onChange: (e: { target: { value: string } }) => void;
}

export const Select: React.FC<SelectProps> = ({ id, label, children, labelContent, value, onChange, disabled, className, ...rest }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    const { document: targetDocument, window: targetWindow } = useWindowContext();

    const options = useMemo(() => {
        return React.Children.toArray(children).map((child) => {
            if (React.isValidElement(child) && child.type === 'option') {
                return {
                    value: child.props.value,
                    label: child.props.children,
                    disabled: child.props.disabled
                };
            }
            return null;
        }).filter((opt): opt is { value: string, label: React.ReactNode, disabled?: boolean } => opt !== null);
    }, [children]);

    const selectedOption = options.find(opt => String(opt.value) === String(value));

    const updatePosition = useCallback(() => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            // For fixed positioning, we use viewport coordinates directly (rect.bottom/left)
            // We do NOT add window.scrollY/X because 'fixed' is relative to the window, not the document.
            setPosition({
                top: rect.bottom + 4,
                left: rect.left,
                width: rect.width
            });
        }
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                buttonRef.current && !buttonRef.current.contains(event.target as Node) &&
                dropdownRef.current && !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        
        const handleScroll = (event: Event) => {
            // If scrolling happens inside the dropdown menu itself, don't recalculate/close
            if (dropdownRef.current && dropdownRef.current.contains(event.target as Node)) {
                return;
            }
            // If the page or a parent container (like the modal) scrolls, update position to stay attached
            updatePosition();
        };

        if (isOpen) {
            targetDocument.addEventListener('mousedown', handleClickOutside);
            targetWindow.addEventListener('resize', updatePosition);
            // Use capture=true to detect scrolling of any parent container (like the modal content div)
            targetDocument.addEventListener('scroll', handleScroll, true); 
        }

        return () => {
            targetDocument.removeEventListener('mousedown', handleClickOutside);
            targetWindow.removeEventListener('resize', updatePosition);
            targetDocument.removeEventListener('scroll', handleScroll, true);
        };
    }, [isOpen, updatePosition, targetDocument, targetWindow]);

    const handleSelect = (val: string) => {
        onChange({ target: { value: val } });
        setIsOpen(false);
    };

    const handleToggle = () => {
        if (disabled) return;
        if (!isOpen) {
            updatePosition();
        }
        setIsOpen(!isOpen);
    };

    return (
        <div className={className}>
            <label htmlFor={id} className="block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5">
              {labelContent || label}
            </label>
            <div className="relative">
                <button
                    ref={buttonRef}
                    type="button"
                    id={id}
                    onClick={handleToggle}
                    disabled={disabled}
                    className={`w-full p-2.5 text-left border rounded-lg flex items-center justify-between transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] ${disabled ? 'opacity-60 cursor-not-allowed bg-[var(--theme-bg-secondary)]' : 'cursor-pointer bg-[var(--theme-bg-input)] hover:border-[var(--theme-border-focus)]'} border-[var(--theme-border-secondary)] text-[var(--theme-text-primary)] text-sm`}
                    {...rest as any}
                >
                    <span className="truncate mr-2">
                        {selectedOption ? selectedOption.label : <span className="text-[var(--theme-text-tertiary)]">Select...</span>}
                    </span>
                    <ChevronDown size={16} className={`text-[var(--theme-text-tertiary)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} strokeWidth={1.5} />
                </button>
                
                {isOpen && createPortal(
                    <div
                        ref={dropdownRef}
                        className="fixed z-[2200] bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] rounded-xl shadow-premium overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col"
                        style={{
                            top: position.top,
                            left: position.left,
                            width: position.width,
                            maxHeight: '300px',
                        }}
                    >
                        <div className="overflow-y-auto custom-scrollbar p-1">
                            {options.map((opt, idx) => (
                                <button
                                    key={`${opt.value}-${idx}`}
                                    type="button"
                                    onClick={() => handleSelect(opt.value)}
                                    disabled={opt.disabled}
                                    className={`w-full text-left px-3 py-2 text-sm rounded-lg flex items-center justify-between transition-colors ${
                                        String(opt.value) === String(value)
                                        ? 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)] font-medium'
                                        : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)]/50 hover:text-[var(--theme-text-primary)]'
                                    } ${opt.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                    <span className="truncate">{opt.label}</span>
                                    {String(opt.value) === String(value) && <Check size={14} className="text-[var(--theme-text-link)] flex-shrink-0 ml-2" strokeWidth={1.5} />}
                                </button>
                            ))}
                        </div>
                    </div>,
                    targetDocument.body
                )}
            </div>
        </div>
    );
};

export const Toggle: React.FC<{
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}> = ({ id, checked, onChange, disabled }) => (
  <label htmlFor={id} className={`flex items-center ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
    <div className="relative">
      <input id={id} type="checkbox" className="sr-only peer" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
      <div className="w-11 h-6 bg-[var(--theme-bg-tertiary)] rounded-full peer peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-offset-2 peer-focus:ring-offset-[var(--theme-bg-secondary)] peer-focus:ring-[var(--theme-border-focus)] peer-checked:bg-[var(--theme-bg-accent)] transition-colors duration-200 ease-in-out border border-[var(--theme-border-secondary)] peer-checked:border-transparent"></div>
      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out peer-checked:translate-x-5"></div>
    </div>
  </label>
);
