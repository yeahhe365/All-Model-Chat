
import React, { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { translations } from '../../../utils/appUtils';
import { 
  IconUpload, 
  IconGallery, 
  IconFileVideo, 
  IconCamera, 
  IconScreenshot, 
  IconMicrophone, 
  IconLink, 
  IconYoutube, 
  IconFileEdit 
} from '../../icons/CustomIcons';

export type AttachmentAction = 'upload' | 'gallery' | 'video' | 'camera' | 'recorder' | 'id' | 'url' | 'text' | 'screenshot';

interface AttachmentMenuProps {
    onAction: (action: AttachmentAction) => void;
    disabled: boolean;
    t: (key: keyof typeof translations) => string;
}

const attachIconSize = 18;
const menuIconSize = 18; // Consistent icon size for menu items
const buttonBaseClass = "h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-input)]";

export const AttachmentMenu: React.FC<AttachmentMenuProps> = ({ onAction, disabled, t }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

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

    const handleAction = (action: AttachmentAction) => {
        setIsOpen(false);
        onAction(action);
    };
    
    const menuItems: { labelKey: keyof typeof translations, icon: React.ReactNode, action: AttachmentAction }[] = [
        { labelKey: 'attachMenu_upload', icon: <IconUpload size={menuIconSize} />, action: 'upload' },
        { labelKey: 'attachMenu_gallery', icon: <IconGallery size={menuIconSize} />, action: 'gallery' },
        { labelKey: 'attachMenu_uploadVideo', icon: <IconFileVideo size={menuIconSize} />, action: 'video' },
        { labelKey: 'attachMenu_takePhoto', icon: <IconCamera size={menuIconSize} />, action: 'camera' },
        { labelKey: 'attachMenu_screenshot', icon: <IconScreenshot size={menuIconSize} />, action: 'screenshot' },
        { labelKey: 'attachMenu_recordAudio', icon: <IconMicrophone size={menuIconSize} />, action: 'recorder' },
        { labelKey: 'attachMenu_addById', icon: <IconLink size={menuIconSize} />, action: 'id' },
        { labelKey: 'attachMenu_addByUrl', icon: <IconYoutube size={menuIconSize} />, action: 'url' },
        { labelKey: 'attachMenu_createText', icon: <IconFileEdit size={menuIconSize} />, action: 'text' }
    ];

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled}
                className={`${buttonBaseClass} text-[var(--theme-icon-attach)] ${isOpen ? 'bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)]' : 'bg-transparent hover:bg-[var(--theme-bg-tertiary)]'}`}
                aria-label={t('attachMenu_aria')}
                title={t('attachMenu_title')}
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
                <Plus size={attachIconSize} strokeWidth={2} />
            </button>
            {isOpen && (
                <div ref={menuRef} className="absolute bottom-full left-0 mb-2 w-60 bg-[var(--theme-bg-primary)] border border-[var(--theme-border-secondary)] rounded-xl shadow-premium z-20 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-bottom-left" role="menu">
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
