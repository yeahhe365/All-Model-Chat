
import React, { useState, useRef } from 'react';
import { SlidersHorizontal, Globe, Check, Terminal, Link, X, Telescope, Calculator } from 'lucide-react';
import { translations } from '../../../utils/appUtils';
import { useClickOutside } from '../../../hooks/useClickOutside';
import { IconYoutube } from '../../icons/CustomIcons';
import { CHAT_INPUT_BUTTON_CLASS } from '../../../constants/appConstants';

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
    onCountTokens: () => void;
    disabled: boolean;
    t: (key: keyof typeof translations) => string;
    isNativeAudioModel?: boolean;
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
    onAddYouTubeVideo, onCountTokens,
    disabled, t, isNativeAudioModel
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useClickOutside(containerRef, () => setIsOpen(false), isOpen);

    const handleToggle = (toggleFunc: () => void) => {
        toggleFunc();
        setIsOpen(false);
    };
    
    // Matched icon size to other toolbar buttons (Attachment, Mic, etc.)
    const menuIconSize = 20;
    
    const menuItems = [
      { labelKey: 'deep_search_label', icon: <Telescope size={18} strokeWidth={2} />, isEnabled: isDeepSearchEnabled, action: () => handleToggle(onToggleDeepSearch) },
      { labelKey: 'web_search_label', icon: <Globe size={18} strokeWidth={2} />, isEnabled: isGoogleSearchEnabled, action: () => handleToggle(onToggleGoogleSearch) },
      { labelKey: 'code_execution_label', icon: <Terminal size={18} strokeWidth={2} />, isEnabled: isCodeExecutionEnabled, action: () => handleToggle(onToggleCodeExecution) },
      { labelKey: 'url_context_label', icon: <Link size={18} strokeWidth={2} />, isEnabled: isUrlContextEnabled, action: () => handleToggle(onToggleUrlContext) },
      { labelKey: 'attachMenu_addByUrl', icon: <IconYoutube size={18} strokeWidth={2} />, isEnabled: false, action: () => { onAddYouTubeVideo(); setIsOpen(false); } },
      { labelKey: 'tools_token_count_label', icon: <Calculator size={18} strokeWidth={2} />, isEnabled: false, action: () => { onCountTokens(); setIsOpen(false); } }
    ];

    const filteredItems = menuItems.filter(item => {
        if (isNativeAudioModel) {
            // For Live API:
            // 1. Code Execution is NOT supported.
            // 2. Web Search is supported but moved to the main toolbar.
            // 3. Other tools are not explicitly supported/tested in this mode yet.
            return false;
        }
        return true;
    });
    
    if (filteredItems.length === 0) return null;

    return (
      <div className="flex items-center">
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(p => !p)}
                disabled={disabled}
                className={`${CHAT_INPUT_BUTTON_CLASS} text-[var(--theme-icon-attach)] ${isOpen ? 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)]' : 'bg-transparent hover:bg-[var(--theme-bg-tertiary)]'}`}
                aria-label={t('tools_button')}
                title={t('tools_button')}
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
                <SlidersHorizontal size={menuIconSize} strokeWidth={2} />
            </button>
            {isOpen && (
                <div 
                    className="absolute bottom-full left-0 mb-2 w-60 bg-[var(--theme-bg-primary)] border border-[var(--theme-border-secondary)] rounded-xl shadow-premium z-20 py-1.5 animate-in fade-in zoom-in-95 duration-100" 
                    role="menu"
                >
                    {filteredItems.map(item => (
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
        {/* Only show badges for tools that are relevant to the current mode */}
        {!isNativeAudioModel && isDeepSearchEnabled && <ActiveToolBadge label={t('deep_search_short')} onRemove={onToggleDeepSearch} removeAriaLabel="Disable Deep Search" icon={<Telescope size={14} strokeWidth={2} />} />}
        
        {/* In Live Mode, Web Search is a toggle button, so badge is redundant/confusing if inside tools menu logic, but let's hide it from here if the button shows status */}
        {!isNativeAudioModel && isGoogleSearchEnabled && <ActiveToolBadge label={t('web_search_short')} onRemove={onToggleGoogleSearch} removeAriaLabel="Disable Web Search" icon={<Globe size={14} strokeWidth={2} />} />}
        
        {!isNativeAudioModel && isCodeExecutionEnabled && <ActiveToolBadge label={t('code_execution_short')} onRemove={onToggleCodeExecution} removeAriaLabel="Disable Code Execution" icon={<Terminal size={14} strokeWidth={2} />} />}
        
        {!isNativeAudioModel && isUrlContextEnabled && <ActiveToolBadge label={t('url_context_short')} onRemove={onToggleUrlContext} removeAriaLabel="Disable URL Context" icon={<Link size={14} strokeWidth={2} />} />}
      </div>
    );
};
