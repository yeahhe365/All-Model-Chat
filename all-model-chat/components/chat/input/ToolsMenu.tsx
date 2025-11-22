
import React, { useState, useRef, useEffect } from 'react';
import { SlidersHorizontal, Globe, Check, Terminal, Link, X } from 'lucide-react';
import { translations } from '../../../utils/appUtils';

interface ToolsMenuProps {
    isGoogleSearchEnabled: boolean;
    onToggleGoogleSearch: () => void;
    isCodeExecutionEnabled: boolean;
    onToggleCodeExecution: () => void;
    isUrlContextEnabled: boolean;
    onToggleUrlContext: () => void;
    disabled: boolean;
    t: (key: keyof typeof translations) => string;
}

const ActiveToolBadge: React.FC<{
    label: string;
    onRemove: () => void;
    removeAriaLabel: string;
    icon: React.ReactNode;
}> = ({ label, onRemove, removeAriaLabel, icon }) => (
    <>
        <div className="h-4 w-px bg-[var(--theme-border-secondary)] mx-1.5"></div>
        <div
            className="flex items-center gap-1.5 bg-[var(--theme-bg-info)] text-[var(--theme-text-link)] text-sm px-2.5 py-1 rounded-full transition-all"
            style={{ animation: `fadeInUp 0.3s ease-out both` }}
        >
            {icon}
            <span className="font-medium">{label}</span>
            <button
                onClick={onRemove}
                className="text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] p-0.5 rounded-full hover:bg-[var(--theme-bg-tertiary)] transition-colors"
                aria-label={removeAriaLabel}
            >
                <X size={14} strokeWidth={2} />
            </button>
        </div>
    </>
);

export const ToolsMenu: React.FC<ToolsMenuProps> = ({
    isGoogleSearchEnabled, onToggleGoogleSearch,
    isCodeExecutionEnabled, onToggleCodeExecution,
    isUrlContextEnabled, onToggleUrlContext,
    disabled, t
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const hasActiveTools = isGoogleSearchEnabled || isCodeExecutionEnabled || isUrlContextEnabled;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuRef.current && !menuRef.current.contains(event.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleToggle = (toggleFunc: () => void) => {
        toggleFunc();
        setIsOpen(false);
    };
    
    const menuItems = [
      { labelKey: 'web_search_label', icon: <Globe size={16} strokeWidth={2} />, isEnabled: isGoogleSearchEnabled, action: () => handleToggle(onToggleGoogleSearch) },
      { labelKey: 'code_execution_label', icon: <Terminal size={16} strokeWidth={2} />, isEnabled: isCodeExecutionEnabled, action: () => handleToggle(onToggleCodeExecution) },
      { labelKey: 'url_context_label', icon: <Link size={16} strokeWidth={2} />, isEnabled: isUrlContextEnabled, action: () => handleToggle(onToggleUrlContext) }
    ];
    
    return (
      <div className="flex items-center">
        <div className="relative">
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setIsOpen(p => !p)}
                disabled={disabled}
                className={
                    hasActiveTools
                        ? `h-7 sm:h-8 w-7 sm:w-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-input)] text-[var(--theme-icon-attach)] ${isOpen ? 'bg-[var(--theme-bg-tertiary)]' : 'bg-transparent hover:bg-[var(--theme-bg-tertiary)]'}`
                        : `h-7 sm:h-8 px-2.5 rounded-full flex items-center justify-center gap-1.5 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-input)] text-[var(--theme-icon-attach)] hover:text-[var(--theme-text-primary)] ${isOpen ? 'bg-[var(--theme-bg-tertiary)]' : 'bg-transparent hover:bg-[var(--theme-bg-tertiary)]'}`
                }
                aria-label={t('tools_button')}
                title={t('tools_button')}
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
                <SlidersHorizontal size={16} strokeWidth={2} />
                {!hasActiveTools && <span className="text-sm font-medium">{t('tools_button')}</span>}
            </button>
            {isOpen && (
                <div ref={menuRef} className="absolute bottom-full left-0 mb-2 w-56 bg-[var(--theme-bg-primary)] border border-[var(--theme-border-secondary)] rounded-lg shadow-premium z-20 py-1" role="menu">
                    {menuItems.map(item => (
                      <button key={item.labelKey} onClick={item.action} className="w-full text-left px-3 py-2 text-sm text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] flex items-center justify-between" role="menuitem">
                        <span className="flex items-center gap-3">{item.icon} {t(item.labelKey as any)}</span>
                        {item.isEnabled && <Check size={16} className="text-[var(--theme-text-link)]" strokeWidth={2} />}
                      </button>
                    ))}
                </div>
            )}
        </div>
        {isGoogleSearchEnabled && <ActiveToolBadge label={t('web_search_label')} onRemove={onToggleGoogleSearch} removeAriaLabel="Disable Web Search" icon={<Globe size={14} strokeWidth={2} />} />}
        {isCodeExecutionEnabled && <ActiveToolBadge label={t('code_execution_label')} onRemove={onToggleCodeExecution} removeAriaLabel="Disable Code Execution" icon={<Terminal size={14} strokeWidth={2} />} />}
        {isUrlContextEnabled && <ActiveToolBadge label={t('url_context_label')} onRemove={onToggleUrlContext} removeAriaLabel="Disable URL Context" icon={<Link size={14} strokeWidth={2} />} />}
      </div>
    );
};
