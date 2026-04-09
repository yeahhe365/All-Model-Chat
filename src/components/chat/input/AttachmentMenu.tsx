
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Plus, FolderUp } from 'lucide-react';
import { translations } from '../../../utils/appUtils';
import { 
  IconUpload, 
  IconGallery, 
  IconCamera, 
  IconScreenshot, 
  IconMicrophone, 
  IconLink, 
  IconFileEdit,
  IconZip
} from '../../icons/CustomIcons';
import { useWindowContext } from '../../../contexts/useWindowContext';
import { useClickOutside } from '../../../hooks/useClickOutside';
import { CHAT_INPUT_BUTTON_CLASS } from '../../../constants/appConstants';

export type AttachmentAction = 'upload' | 'gallery' | 'camera' | 'recorder' | 'id' | 'url' | 'text' | 'screenshot' | 'folder' | 'zip';

interface AttachmentMenuProps {
    onAction: (action: AttachmentAction) => void;
    disabled: boolean;
    t: (key: keyof typeof translations) => string;
}

const attachIconSize = 20;
const menuIconSize = 18; // Consistent icon size for menu items

export const AttachmentMenu: React.FC<AttachmentMenuProps> = ({ onAction, disabled, t }) => {
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

    const handleAction = (action: AttachmentAction) => {
        setIsOpen(false);
        onAction(action);
    };
    
    const menuItems: { labelKey: keyof typeof translations, icon: React.ReactNode, action: AttachmentAction }[] = [
        { labelKey: 'attachMenu_upload', icon: <IconUpload size={menuIconSize} />, action: 'upload' },
        { labelKey: 'attachMenu_importFolder', icon: <FolderUp size={menuIconSize} />, action: 'folder' },
        { labelKey: 'attachMenu_importZip', icon: <IconZip size={menuIconSize} />, action: 'zip' },
        { labelKey: 'attachMenu_gallery', icon: <IconGallery size={menuIconSize} />, action: 'gallery' },
        { labelKey: 'attachMenu_takePhoto', icon: <IconCamera size={menuIconSize} />, action: 'camera' },
        { labelKey: 'attachMenu_screenshot', icon: <IconScreenshot size={menuIconSize} />, action: 'screenshot' },
        { labelKey: 'attachMenu_recordAudio', icon: <IconMicrophone size={menuIconSize} />, action: 'recorder' },
        { labelKey: 'attachMenu_addById', icon: <IconLink size={menuIconSize} />, action: 'id' },
        { labelKey: 'attachMenu_createText', icon: <IconFileEdit size={menuIconSize} />, action: 'text' }
    ];

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
            maxHeight: `${Math.max(150, buttonRect.top - buttonMargin)}px`,
            overflowY: 'auto',
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

    const closeMenu = useCallback(() => {
        setIsOpen(false);
        buttonRef.current?.focus();
    }, []);

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
            openMenu(menuItems.length - 1);
        }
    };

    const handleItemKeyDown = (index: number) => (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setHighlightedIndex((index + 1) % menuItems.length);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setHighlightedIndex((index - 1 + menuItems.length) % menuItems.length);
        } else if (event.key === 'Home') {
            event.preventDefault();
            setHighlightedIndex(0);
        } else if (event.key === 'End') {
            event.preventDefault();
            setHighlightedIndex(menuItems.length - 1);
        } else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleAction(menuItems[index].action);
        } else if (event.key === 'Escape') {
            event.preventDefault();
            closeMenu();
        } else if (event.key === 'Tab') {
            setIsOpen(false);
        }
    };

    return (
        <div className="relative" ref={containerRef}>
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
                className={`${CHAT_INPUT_BUTTON_CLASS} text-[var(--theme-icon-attach)] ${isOpen ? 'bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)] rotate-45' : 'bg-transparent hover:bg-[var(--theme-bg-tertiary)] rotate-0'}`}
                aria-label={t('attachMenu_aria')}
                title={t('attachMenu_title')}
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
                <Plus size={attachIconSize} strokeWidth={2} />
            </button>
            
            {isOpen && targetWindow && createPortal(
                <div 
                    ref={menuRef}
                    className="w-60 bg-[var(--theme-bg-primary)] border border-[var(--theme-border-secondary)] rounded-xl shadow-premium py-1.5 custom-scrollbar animate-in fade-in zoom-in-95 duration-100" 
                    style={menuPosition}
                    role="menu"
                >
                    {menuItems.map((item, index) => (
                        <button
                            key={item.action}
                            ref={(element) => {
                                itemRefs.current[index] = element;
                            }}
                            onClick={() => handleAction(item.action)}
                            onKeyDown={handleItemKeyDown(index)}
                            className="w-full text-left px-4 py-2.5 text-sm text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] flex items-center gap-3.5 transition-colors"
                            role="menuitem"
                            tabIndex={index === highlightedIndex ? 0 : -1}
                        >
                            <span className="text-[var(--theme-text-secondary)]">{item.icon}</span>
                            <span className="font-medium">{t(item.labelKey)}</span>
                        </button>
                    ))}
                </div>,
                targetWindow.document.body
            )}
        </div>
    );
};
