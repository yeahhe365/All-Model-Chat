
import React, { useState, useRef, useMemo } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useClickOutside } from '../../hooks/useClickOutside';

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label: string;
  children: React.ReactNode;
  labelContent?: React.ReactNode;
  onChange: (e: { target: { value: string } }) => void;
  layout?: 'vertical' | 'horizontal';
}

export const Select: React.FC<SelectProps> = ({ id, label, children, labelContent, value, onChange, disabled, className, layout = 'vertical', ...rest }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    
    useClickOutside(wrapperRef, () => setIsOpen(false), isOpen);

    const options = useMemo(() => {
        return React.Children.toArray(children).map((child) => {
            if (React.isValidElement(child) && child.type === 'option') {
                const props = child.props as React.OptionHTMLAttributes<HTMLOptionElement>;
                return {
                    value: String(props.value),
                    label: props.children,
                    disabled: props.disabled
                };
            }
            return null;
        }).filter((opt): opt is { value: string, label: React.ReactNode, disabled?: boolean } => opt !== null);
    }, [children]);

    const selectedOption = options.find(opt => String(opt.value) === String(value));

    const handleSelect = (val: string) => {
        onChange({ target: { value: val } });
        setIsOpen(false);
    };

    const handleToggle = () => {
        if (disabled) return;
        setIsOpen(!isOpen);
    };

    const containerClasses = layout === 'horizontal' 
        ? `flex items-center justify-between py-1 ${className || ''}`
        : className;

    const labelClasses = layout === 'horizontal'
        ? "text-sm font-medium text-[var(--theme-text-primary)] mr-4 flex-shrink-0"
        : "block text-xs font-medium text-[var(--theme-text-secondary)] mb-1.5";

    const wrapperClasses = layout === 'horizontal' 
        ? "relative w-full sm:w-64" 
        : "relative";

    return (
        <div className={containerClasses}>
            <label htmlFor={id} className={labelClasses}>
              {labelContent || label}
            </label>
            <div className={wrapperClasses} ref={wrapperRef}>
                <button
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
                
                {isOpen && (
                    <div
                        className="absolute top-full left-0 z-50 w-full mt-1 bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] rounded-xl shadow-premium overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[300px]"
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
                    </div>
                )}
            </div>
        </div>
    );
};
