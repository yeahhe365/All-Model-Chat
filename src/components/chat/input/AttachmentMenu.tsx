
import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
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
import { useWindowContext } from '../../../contexts/WindowContext';
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
    const containerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    
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

    // Dynamic fixed positioning
    useLayoutEffect(() => {
        if (isOpen && buttonRef.current && targetWindow) {
            const buttonRect = buttonRef.current.getBoundingClientRect();
            const viewportWidth = targetWindow.innerWidth;
            const viewportHeight = targetWindow.innerHeight;
            
            const MENU_WIDTH = 240; 
            const BUTTON_MARGIN = 10;
            const GAP = 8;
            
            const newStyle: React.CSSProperties = {
                position: 'fixed',
                zIndex: 9999, // Ensure it sits on top of everything including toolbar
            };

            // Horizontal Alignment
            if (buttonRect.left + MENU_WIDTH > viewportWidth - BUTTON_MARGIN) {
                // Align right edge of menu with right edge of button
                newStyle.left = buttonRect.right - MENU_WIDTH;
                newStyle.transformOrigin = 'bottom right';
            } else {
                // Align left
                newStyle.left = buttonRect.left;
                newStyle.transformOrigin = 'bottom left';
            }

            // Vertical Alignment (Anchored to bottom of viewport relative to button top)
            newStyle.bottom = viewportHeight - buttonRect.top + GAP;

            // Height Constraint
            const availableHeight = buttonRect.top - BUTTON_MARGIN;
            newStyle.maxHeight = `${Math.max(150, availableHeight)}px`;
            newStyle.overflowY = 'auto'; // Allow scrolling if constrained

            setMenuPosition(newStyle);
        }
    }, [isOpen, targetWindow]);

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

    return (
        <div className="relative" ref={containerRef}>
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
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
                    {menuItems.map(item => (
                        <button key={item.action} onClick={() => handleAction(item.action)} className="w-full text-left px-4 py-2.5 text-sm text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] flex items-center gap-3.5 transition-colors" role="menuitem">
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
