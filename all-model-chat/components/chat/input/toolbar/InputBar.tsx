
import React, { useRef, useEffect } from 'react';
import { Loader2, Plus, X } from 'lucide-react';

interface InputBarProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    onCancel: () => void;
    placeholder: string;
    icon: React.ReactNode;
    isLoading: boolean;
    disabled?: boolean;
    submitLabel?: string;
    footer?: React.ReactNode;
    autoFocus?: boolean;
    type?: 'text' | 'url';
    ariaLabel?: string;
}

export const InputBar: React.FC<InputBarProps> = ({
    value,
    onChange,
    onSubmit,
    onCancel,
    placeholder,
    icon,
    isLoading,
    disabled = false,
    submitLabel = 'Add',
    footer,
    autoFocus = true,
    type = 'text',
    ariaLabel
}) => {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (value.trim() && !isLoading && !disabled) {
            onSubmit();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onCancel();
        }
    };

    // Ensure focus when mounted if autoFocus is true
    useEffect(() => {
        if (autoFocus && inputRef.current) {
            inputRef.current.focus();
        }
    }, [autoFocus]);

    return (
        <div className="animate-in fade-in slide-in-from-bottom-1 duration-200">
            <form 
                onSubmit={handleSubmit} 
                className="flex items-center gap-2 p-1.5 bg-[var(--theme-bg-secondary)] rounded-xl border border-[var(--theme-border-secondary)] shadow-sm ring-1 ring-black/5 dark:ring-white/5"
            >
                <div className="relative flex-grow flex items-center group">
                    <div className="absolute left-3 text-[var(--theme-text-tertiary)] group-focus-within:text-[var(--theme-text-primary)] transition-colors pointer-events-none">
                        {icon}
                    </div>
                    <input
                        ref={inputRef}
                        type={type}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        className="w-full py-2 pl-9 pr-3 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-lg text-sm text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:border-transparent transition-all shadow-inner font-mono"
                        aria-label={ariaLabel || placeholder}
                        disabled={disabled}
                        spellCheck={false}
                        autoComplete="off"
                    />
                </div>
                
                <button
                    type="submit"
                    disabled={!value.trim() || disabled || isLoading}
                    className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-text-accent)] rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95 whitespace-nowrap"
                >
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} strokeWidth={2.5} />}
                    <span className="hidden sm:inline">{submitLabel}</span>
                </button>
                
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={disabled}
                    className="p-2 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors focus:outline-none"
                    aria-label="Cancel"
                >
                    <X size={18} strokeWidth={2} />
                </button>
            </form>
            {footer}
        </div>
    );
};
