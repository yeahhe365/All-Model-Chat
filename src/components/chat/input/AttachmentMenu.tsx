
import React from 'react';
import { createPortal } from 'react-dom';
import { Plus, FolderUp } from 'lucide-react';
import { useI18n } from '../../../contexts/I18nContext';
import type { AttachmentAction } from '../../../types';
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
import { CHAT_INPUT_BUTTON_CLASS } from '../../../constants/appConstants';
import { usePortaledMenu } from '../../../hooks/ui/usePortaledMenu';

interface AttachmentMenuProps {
    onAction: (action: AttachmentAction) => void;
    disabled: boolean;
    isImageModel?: boolean;
}

const attachIconSize = 20;
const menuIconSize = 18;

export const AttachmentMenu: React.FC<AttachmentMenuProps> = ({ onAction, disabled, isImageModel }) => {
    const { t } = useI18n();
    const {
        isOpen,
        menuPosition,
        containerRef,
        buttonRef,
        menuRef,
        targetWindow,
        closeMenu,
        toggleMenu,
    } = usePortaledMenu({ constrainHeight: true });

    const handleAction = (action: AttachmentAction) => {
        closeMenu();
        onAction(action);
    };
    
    const menuItems = [
        { labelKey: 'attachMenu_upload', icon: <IconUpload size={menuIconSize} />, action: 'upload' },
        { labelKey: 'attachMenu_importFolder', icon: <FolderUp size={menuIconSize} />, action: 'folder' },
        { labelKey: 'attachMenu_importZip', icon: <IconZip size={menuIconSize} />, action: 'zip' },
        { labelKey: 'attachMenu_gallery', icon: <IconGallery size={menuIconSize} />, action: 'gallery' },
        { labelKey: 'attachMenu_takePhoto', icon: <IconCamera size={menuIconSize} />, action: 'camera' },
        { labelKey: 'attachMenu_screenshot', icon: <IconScreenshot size={menuIconSize} />, action: 'screenshot' },
        { labelKey: 'attachMenu_recordAudio', icon: <IconMicrophone size={menuIconSize} />, action: 'recorder' },
        { labelKey: 'attachMenu_addById', icon: <IconLink size={menuIconSize} />, action: 'id' },
        { labelKey: 'attachMenu_createText', icon: <IconFileEdit size={menuIconSize} />, action: 'text' }
    ] as const;

    const filteredMenuItems = isImageModel
        ? menuItems.filter((item) =>
            item.action === 'upload'
            || item.action === 'gallery'
            || item.action === 'camera'
            || item.action === 'screenshot'
            || item.action === 'id'
        )
        : menuItems;

    return (
        <div className="relative" ref={containerRef}>
            <button
                ref={buttonRef}
                type="button"
                onClick={toggleMenu}
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
                    {filteredMenuItems.map(item => (
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
