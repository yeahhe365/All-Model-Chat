
import React, { useState, useRef, useLayoutEffect } from 'react';
import { Plus, FolderUp } from 'lucide-react';
import { translations } from '../../../utils/appUtils';
import { 
  IconUpload, 
  IconGallery, 
  IconCamera, 
  IconScreenshot, 
  IconMicrophone, 
  IconLink, 
  IconYoutube, 
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

const attachIconSize = 18;
const menuIconSize = 18; // Consistent icon size for menu items

export const AttachmentMenu: React.FC<AttachmentMenuProps> = ({ onAction, disabled, t }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
    const containerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    
    const { window: targetWindow } = useWindowContext();

    useClickOutside(containerRef, () => setIsOpen(false), isOpen);

    // Dynamic positioning to handle PiP/Small windows
    useLayoutEffect(() => {
        if (isOpen && buttonRef.current && targetWindow) {
            const buttonRect = buttonRef.current.getBoundingClientRect();
            const viewportWidth = targetWindow.innerWidth;
            
            const MENU_WIDTH = 240; // w-60 equivalent approx
            const BUTTON_MARGIN = 10; // Safety margin
            
            const newStyle: React.CSSProperties = {};

            // Horizontal: Flip to right-aligned if left-aligned would overflow
            if (buttonRect.left + MENU_WIDTH > viewportWidth - BUTTON_MARGIN) {
                newStyle.left = 'auto';
                newStyle.right = '0';
                newStyle.transformOrigin = 'bottom right';
            } else {
                newStyle.left = '0';
                newStyle.right = 'auto';
                newStyle.transformOrigin = 'bottom left';
            }

            // Vertical: Constrain height if window is too short (menu opens upwards)
            // The menu is positioned 'bottom-full mb-2', so it sits above the button.
            // Available space is from the top of the button to the top of the viewport.
            const availableHeight = buttonRect.top - BUTTON_MARGIN;
            // Ensure a sensible minimum so it doesn't collapse completely
            newStyle.maxHeight = `${Math.max(150, availableHeight)}px`;
            newStyle.overflowY = 'auto'; // Allow scrolling if constrained

            setMenuStyle(newStyle);
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
                className={`${CHAT_INPUT_BUTTON_CLASS} text-[var(--theme-icon-attach)] ${isOpen ? 'bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)]' : 'bg-transparent hover:bg-[var(--theme-bg-tertiary)]'}`}
                aria-label={t('attachMenu_aria')}
                title={t('attachMenu_title')}
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
                <Plus size={attachIconSize} strokeWidth={2} />
            </button>
            {isOpen && (
                <div 
                    className="absolute bottom-full mb-2 w-60 bg-[var(--theme-bg-primary)] border border-[var(--theme-border-secondary)] rounded-xl shadow-premium z-20 py-1.5 custom-scrollbar animate-in fade-in zoom-in-95 duration-100" 
                    style={menuStyle}
                    role="menu"
                >
                    {menuItems.map(item => (
                        <button key={item.action} onClick={() => handleAction(item.action)} className="w-full text-left px-4 py-2.5 text-sm text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] flex items-center gap-3.5 transition-colors" role="menuitem">
                            <span className="text-[var(--theme-text-secondary)]">{item.icon}</span>
                            <span className="font-medium">{t(item.labelKey)}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
