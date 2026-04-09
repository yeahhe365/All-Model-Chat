

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { SlidersHorizontal, Globe, Check, Terminal, Link, X, Telescope, Calculator } from 'lucide-react';
import { translations } from '../../../utils/appUtils';
import { useClickOutside } from '../../../hooks/useClickOutside';
import { IconYoutube, IconPython } from '../../icons/CustomIcons';
import { CHAT_INPUT_BUTTON_CLASS } from '../../../constants/appConstants';
import { useWindowContext } from '../../../contexts/useWindowContext';

interface ToolsMenuProps {
    isGoogleSearchEnabled: boolean;
    onToggleGoogleSearch: () => void;
    isCodeExecutionEnabled: boolean;
    onToggleCodeExecution: () => void;
    isLocalPythonEnabled?: boolean;
    onToggleLocalPython?: () => void;
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
    <button
        type="button"
        className="group inline-flex items-center gap-1.5 max-w-full bg-blue-500/10 text-[var(--theme-text-link)] text-sm px-2.5 py-1 rounded-full transition-all select-none hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-primary)]"
        style={{ animation: `fadeInUp 0.3s ease-out both` }}
        onClick={onRemove}
        aria-label={removeAriaLabel}
        title={removeAriaLabel}
    >
        <div className="relative flex items-center justify-center w-3.5 h-3.5 flex-shrink-0">
            <span className="absolute inset-0 flex items-center justify-center transition-all duration-200 opacity-100 scale-100 group-hover:opacity-0 group-hover:scale-75 rotate-0 group-hover:-rotate-90">
                {icon}
            </span>
            <span className="absolute inset-0 flex items-center justify-center transition-all duration-200 opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 rotate-90 group-hover:rotate-0 text-[var(--theme-icon-error)]">
                <X size={14} strokeWidth={2.5} />
            </span>
        </div>
        <span className="font-medium truncate">{label}</span>
    </button>
);

export const ToolsMenu: React.FC<ToolsMenuProps> = ({
    isGoogleSearchEnabled, onToggleGoogleSearch,
    isCodeExecutionEnabled, onToggleCodeExecution,
    isLocalPythonEnabled, onToggleLocalPython,
    isUrlContextEnabled, onToggleUrlContext,
    isDeepSearchEnabled, onToggleDeepSearch,
    onAddYouTubeVideo, onCountTokens,
    disabled, t, isNativeAudioModel
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState<React.CSSProperties>({});
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
    
    const { window: targetWindow } = useWindowContext();

    useClickOutside(containerRef, () => setIsOpen(false), isOpen);

    // Prevent click-outside logic from firing when interacting with the portaled menu
    useEffect(() => {
        if (!isOpen || !menuRef.current) return;
        
        const stopProp = (e: Event) => e.stopPropagation();
        const menuEl = menuRef.current;
        
        // Stop bubbling to document so useClickOutside doesn't see it
        menuEl.addEventListener('mousedown', stopProp);
        menuEl.addEventListener('touchstart', stopProp);
        
        return () => {
            menuEl.removeEventListener('mousedown', stopProp);
            menuEl.removeEventListener('touchstart', stopProp);
        };
    }, [isOpen]);

    const handleToggle = (toggleFunc?: () => void) => {
        if (toggleFunc) {
            toggleFunc();
            setIsOpen(false);
        }
    };
    
    // Matched icon size to other toolbar buttons (Attachment, Mic, etc.)
    const menuIconSize = 20;
    
    const menuItems = [
      { labelKey: 'deep_search_label', icon: <Telescope size={18} strokeWidth={2} />, isEnabled: isDeepSearchEnabled, action: () => handleToggle(onToggleDeepSearch) },
      { labelKey: 'web_search_label', icon: <Globe size={18} strokeWidth={2} />, isEnabled: isGoogleSearchEnabled, action: () => handleToggle(onToggleGoogleSearch) },
      { labelKey: 'code_execution_label', icon: <Terminal size={18} strokeWidth={2} />, isEnabled: isCodeExecutionEnabled, action: () => handleToggle(onToggleCodeExecution) },
      { labelKey: 'local_python_label', icon: <IconPython size={18} strokeWidth={2} />, isEnabled: !!isLocalPythonEnabled, action: () => handleToggle(onToggleLocalPython) },
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
        // Only show Local Python if handler is provided (it's new feature)
        if (item.labelKey === 'local_python_label' && !onToggleLocalPython) {
            return false;
        }
        return true;
    });

    const closeMenu = useCallback(() => {
        setIsOpen(false);
        buttonRef.current?.focus();
    }, []);

    const computeMenuPosition = useCallback(() => {
        if (!buttonRef.current || !targetWindow) return {};

        const buttonRect = buttonRef.current.getBoundingClientRect();
        const viewportWidth = targetWindow.innerWidth;
        const viewportHeight = targetWindow.innerHeight;
        const menuWidth = 240;
        const buttonMargin = 10;
        const gap = 8;

        const nextStyle: React.CSSProperties = {
            position: 'fixed',
            zIndex: 9999,
            bottom: viewportHeight - buttonRect.top + gap,
        };

        if (buttonRect.left + menuWidth > viewportWidth - buttonMargin) {
            nextStyle.left = buttonRect.right - menuWidth;
            nextStyle.transformOrigin = 'bottom right';
        } else {
            nextStyle.left = buttonRect.left;
            nextStyle.transformOrigin = 'bottom left';
        }

        return nextStyle;
    }, [targetWindow]);

    const openMenu = useCallback((preferredIndex: number = 0) => {
        setHighlightedIndex(preferredIndex);
        setMenuPosition(computeMenuPosition());
        setIsOpen(true);
    }, [computeMenuPosition]);

    useEffect(() => {
        if (!isOpen) return;
        itemRefs.current[highlightedIndex]?.focus();
    }, [highlightedIndex, isOpen]);

    const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (disabled) return;

        if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openMenu(0);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            openMenu(filteredItems.length - 1);
        }
    };

    const handleItemKeyDown = (index: number) => (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setHighlightedIndex((index + 1) % filteredItems.length);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setHighlightedIndex((index - 1 + filteredItems.length) % filteredItems.length);
        } else if (event.key === 'Home') {
            event.preventDefault();
            setHighlightedIndex(0);
        } else if (event.key === 'End') {
            event.preventDefault();
            setHighlightedIndex(filteredItems.length - 1);
        } else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            filteredItems[index].action();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            closeMenu();
        } else if (event.key === 'Tab') {
            setIsOpen(false);
        }
    };

    if (filteredItems.length === 0) return null;

    return (
      <div className="flex min-w-0 items-center gap-2">
        <div className="relative flex-shrink-0" ref={containerRef}>
            <button
                ref={buttonRef}
                type="button"
                onClick={() => {
                    if (isOpen) {
                        setIsOpen(false);
                    } else {
                        openMenu(0);
                    }
                }}
                onKeyDown={handleTriggerKeyDown}
                disabled={disabled}
                className={`${CHAT_INPUT_BUTTON_CLASS} text-[var(--theme-icon-attach)] ${isOpen ? 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)]' : 'bg-transparent hover:bg-[var(--theme-bg-tertiary)]'}`}
                aria-label={t('tools_button')}
                title={t('tools_button')}
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
                <SlidersHorizontal size={menuIconSize} strokeWidth={2} />
            </button>
            {isOpen && targetWindow && createPortal(
                <div 
                    ref={menuRef}
                    className="fixed w-60 bg-[var(--theme-bg-primary)] border border-[var(--theme-border-secondary)] rounded-xl shadow-premium py-1.5 animate-in fade-in zoom-in-95 duration-100 custom-scrollbar" 
                    style={menuPosition}
                    role="menu"
                >
                    {filteredItems.map((item, index) => (
                      <button 
                        key={item.labelKey} 
                        ref={(element) => {
                            itemRefs.current[index] = element;
                        }}
                        onClick={item.action} 
                        onKeyDown={handleItemKeyDown(index)}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--theme-bg-tertiary)] flex items-center justify-between transition-colors ${item.isEnabled ? 'text-[var(--theme-text-link)]' : 'text-[var(--theme-text-primary)]'}`} 
                        role="menuitem"
                        tabIndex={index === highlightedIndex ? 0 : -1}
                      >
                        <div className="flex items-center gap-3.5">
                            <span className={item.isEnabled ? 'text-[var(--theme-text-link)]' : 'text-[var(--theme-text-secondary)]'}>{item.icon}</span>
                            <span className="font-medium">{t(item.labelKey as any)}</span>
                        </div>
                        {item.isEnabled && <Check size={16} className="text-[var(--theme-text-link)]" strokeWidth={2} />}
                      </button>
                    ))}
                </div>,
                targetWindow.document.body
            )}
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            {!isNativeAudioModel && isDeepSearchEnabled && (
                <ActiveToolBadge
                    label={t('deep_search_short')}
                    onRemove={onToggleDeepSearch}
                    removeAriaLabel={`${t('disable' as any)} ${t('deep_search_label')}`}
                    icon={<Telescope size={14} strokeWidth={2} />}
                />
            )}
            
            {!isNativeAudioModel && isGoogleSearchEnabled && (
                <ActiveToolBadge
                    label={t('web_search_short')}
                    onRemove={onToggleGoogleSearch}
                    removeAriaLabel={`${t('disable' as any)} ${t('web_search_label')}`}
                    icon={<Globe size={14} strokeWidth={2} />}
                />
            )}
            
            {!isNativeAudioModel && isCodeExecutionEnabled && (
                <ActiveToolBadge
                    label={t('code_execution_short')}
                    onRemove={onToggleCodeExecution}
                    removeAriaLabel={`${t('disable' as any)} ${t('code_execution_label')}`}
                    icon={<Terminal size={14} strokeWidth={2} />}
                />
            )}

            {!isNativeAudioModel && isLocalPythonEnabled && onToggleLocalPython && (
                <ActiveToolBadge
                    label={t('local_python_short')}
                    onRemove={onToggleLocalPython}
                    removeAriaLabel={`${t('disable' as any)} ${t('local_python_label')}`}
                    icon={<IconPython size={14} strokeWidth={2} />}
                />
            )}
            
            {!isNativeAudioModel && isUrlContextEnabled && (
                <ActiveToolBadge
                    label={t('url_context_short')}
                    onRemove={onToggleUrlContext}
                    removeAriaLabel={`${t('disable' as any)} ${t('url_context_label')}`}
                    icon={<Link size={14} strokeWidth={2} />}
                />
            )}
        </div>
      </div>
    );
};
