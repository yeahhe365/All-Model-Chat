
import React, { useState, useRef } from 'react';
import { SlidersHorizontal, Globe, Check, Terminal, Link, X, Telescope, GraduationCap } from 'lucide-react';
import { translations } from '../../../utils/appUtils';
import { useClickOutside } from '../../../hooks/useClickOutside';
import { IconYoutube } from '../../icons/CustomIcons';

interface ToolsMenuProps {
    isGoogleSearchEnabled: boolean;
    onToggleGoogleSearch: () => void;
    isCodeExecutionEnabled: boolean;
    onToggleCodeExecution: () => void;
    isUrlContextEnabled: boolean;
    onToggleUrlContext: () => void;
    isDeepSearchEnabled: boolean;
    onToggleDeepSearch: () => void;
    onAddYouTubeVideo: () => void;
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
            className="group flex items-center gap-1.5 bg-blue-500/10 text-[var(--theme-text-link)] text-sm px-2.5 py-1 rounded-full transition-all select-none hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-primary)] cursor-pointer"
            style={{ animation: `fadeInUp 0.3s ease-out both` }}
            onClick={onRemove}
            role="button"
            aria-label={removeAriaLabel}
        >
            <div className="relative flex items-center justify-center w-3.5 h-3.5">
                <span className="absolute inset-0 flex items-center justify-center transition-all duration-200 opacity-100 scale-100 group-hover:opacity-0 group-hover:scale-75 rotate-0 group-hover:-rotate-90">
                    {icon}
                </span>
                <span className="absolute inset-0 flex items-center justify-center transition-all duration-200 opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 rotate-90 group-hover:rotate-0 text-[var(--theme-icon-error)]">
                    <X size={14} strokeWidth={2.5} />
                </span>
            </div>
            <span className="font-medium">{label}</span>
        </div>
    </>
);

export const ToolsMenu: React.FC<ToolsMenuProps> = ({
    isGoogleSearchEnabled, onToggleGoogleSearch,
    isCodeExecutionEnabled, onToggleCodeExecution,
    isUrlContextEnabled, onToggleUrlContext,
    isDeepSearchEnabled, onToggleDeepSearch,
    onAddYouTubeVideo,
    disabled, t
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const hasActiveTools = isGoogleSearchEnabled || isCodeExecutionEnabled || isUrlContextEnabled || isDeepSearchEnabled;

    useClickOutside(containerRef, () => setIsOpen(false), isOpen);

    const handleToggle = (toggleFunc: () => void) => {
        toggleFunc();
        setIsOpen(false);
    };
    
    const menuIconSize = 18;
    
    const menuItems = [
      { labelKey: 'deep_search_label', icon: <Telescope size={menuIconSize} strokeWidth={2} />, isEnabled: isDeepSearchEnabled, action: () => handleToggle(onToggleDeepSearch) },
      { labelKey: 'deep_research_label', icon: <GraduationCap size={menuIconSize} strokeWidth={2} />, isEnabled: false, action: () => setIsOpen(false) },
      { labelKey: 'web_search_label', icon: <Globe size={menuIconSize} strokeWidth={2} />, isEnabled: isGoogleSearchEnabled, action: () => handleToggle(onToggleGoogleSearch) },
      { labelKey: 'code_execution_label', icon: <Terminal size={menuIconSize} strokeWidth={2} />, isEnabled: isCodeExecutionEnabled, action: () => handleToggle(onToggleCodeExecution) },
      { labelKey: 'url_context_label', icon: <Link size={menuIconSize} strokeWidth={2} />, isEnabled: isUrlContextEnabled, action: () => handleToggle(onToggleUrlContext) },
      { labelKey: 'attachMenu_addByUrl', icon: <IconYoutube size={menuIconSize} strokeWidth={2} />, isEnabled: false, action: () => { onAddYouTubeVideo(); setIsOpen(false); } }
    ];
    
    return (
      <div className="flex items-center">
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(p => !p)}
                disabled={disabled}
                className={
                    hasActiveTools
                        ? `h-7 sm:h-8 w-7 sm:w-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme-bg-input)] text-[var(--theme-icon-attach)] ${isOpen ? 'bg-[var(--theme-bg-tertiary)]' : 'bg-transparent hover:bg-[var(--theme-bg-tertiary)]'}`
                        : `h-7 sm:h-8 px-2.5 rounded-full flex items-center justify-center gap-1.5 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme-bg-input)] text-[var(--theme-icon-attach)] hover:text-[var(--theme-text-primary)] ${isOpen ? 'bg-[var(--theme-bg-tertiary)]' : 'bg-transparent hover:bg-[var(--theme-bg-tertiary)]'}`
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
                <div 
                    className="absolute bottom-full left-0 mb-2 w-60 bg-[var(--theme-bg-primary)] border border-[var(--theme-border-secondary)] rounded-xl shadow-premium z-20 py-1.5 animate-in fade-in zoom-in-95 duration-100" 
                    role="menu"
                >
                    {menuItems.map(item => (
                      <button 
                        key={item.labelKey} 
                        onClick={item.action} 
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--theme-bg-tertiary)] flex items-center justify-between transition-colors ${item.isEnabled ? 'text-[var(--theme-text-link)]' : 'text-[var(--theme-text-primary)]'}`} 
                        role="menuitem"
                      >
                        <div className="flex items-center gap-3.5">
                            <span className={item.isEnabled ? 'text-[var(--theme-text-link)]' : 'text-[var(--theme-text-secondary)]'}>{item.icon}</span>
                            <span className="font-medium">{t(item.labelKey as any)}</span>
                        </div>
                        {item.isEnabled && <Check size={16} className="text-[var(--theme-text-link)]" strokeWidth={2} />}
                      </button>
                    ))}
                </div>
            )}
        </div>
        {isDeepSearchEnabled && <ActiveToolBadge label={t('deep_search_short')} onRemove={onToggleDeepSearch} removeAriaLabel="Disable Deep Search" icon={<Telescope size={14} strokeWidth={2} />} />}
        {isGoogleSearchEnabled && <ActiveToolBadge label={t('web_search_short')} onRemove={onToggleGoogleSearch} removeAriaLabel="Disable Web Search" icon={<Globe size={14} strokeWidth={2} />} />}
        {isCodeExecutionEnabled && <ActiveToolBadge label={t('code_execution_short')} onRemove={onToggleCodeExecution} removeAriaLabel="Disable Code Execution" icon={<Terminal size={14} strokeWidth={2} />} />}
        {isUrlContextEnabled && <ActiveToolBadge label={t('url_context_short')} onRemove={onToggleUrlContext} removeAriaLabel="Disable URL Context" icon={<Link size={14} strokeWidth={2} />} />}
      </div>
    );
};
