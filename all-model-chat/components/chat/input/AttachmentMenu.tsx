import React, { useState, useRef, useEffect } from 'react';
import { Plus, UploadCloud, Image, FileVideo, Camera, Mic, Link2, FileSignature } from 'lucide-react';
import { translations } from '../../../utils/appUtils';

export type AttachmentAction = 'upload' | 'gallery' | 'video' | 'camera' | 'recorder' | 'id' | 'text';

interface AttachmentMenuProps {
    onAction: (action: AttachmentAction) => void;
    disabled: boolean;
    t: (key: keyof typeof translations) => string;
    isPipActive?: boolean;
}

const attachIconSize = 18;
const buttonBaseClass = "h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-input)]";

export const AttachmentMenu: React.FC<AttachmentMenuProps> = ({ onAction, disabled, t, isPipActive }) => {
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
        { labelKey: 'attachMenu_upload', icon: <UploadCloud size={16}/>, action: 'upload' },
        { labelKey: 'attachMenu_gallery', icon: <Image size={16}/>, action: 'gallery' },
        { labelKey: 'attachMenu_uploadVideo', icon: <FileVideo size={16}/>, action: 'video' },
        { labelKey: 'attachMenu_takePhoto', icon: <Camera size={16}/>, action: 'camera' },
        { labelKey: 'attachMenu_recordAudio', icon: <Mic size={16}/>, action: 'recorder' },
        { labelKey: 'attachMenu_addById', icon: <Link2 size={16}/>, action: 'id' },
        { labelKey: 'attachMenu_createText', icon: <FileSignature size={16}/>, action: 'text' }
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
                <Plus size={attachIconSize} />
            </button>
            {isOpen && (
                <div ref={menuRef} className={`absolute ${isPipActive ? 'top-full mt-2' : 'bottom-full mb-2'} left-0 w-56 bg-[var(--theme-bg-primary)] border border-[var(--theme-border-secondary)] rounded-lg shadow-premium z-20 py-1`} role="menu">
                    {menuItems.map(item => (
                        <button key={item.action} onClick={() => handleAction(item.action)} className="w-full text-left px-3 py-2 text-sm text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] flex items-center gap-3" role="menuitem">
                            {item.icon} <span>{t(item.labelKey)}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};