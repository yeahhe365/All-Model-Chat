import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { Terminal, Trash2, ClipboardCopy, Settings, Wand2, Edit3, PictureInPicture, PictureInPicture2, Scissors, ClipboardPaste } from 'lucide-react';
import { getResponsiveValue } from '../../utils/appUtils';

const CommandIcon: React.FC<{ iconName: string }> = ({ iconName }) => {
    const iconProps = { size: getResponsiveValue(14, 16) };
    switch (iconName) {
        case 'Terminal': return <Terminal {...iconProps} />;
        case 'Trash2': return <Trash2 {...iconProps} />;
        case 'ClipboardCopy': return <ClipboardCopy {...iconProps} />;
        case 'Settings': return <Settings {...iconProps} />;
        case 'Wand2': return <Wand2 {...iconProps} />;
        case 'Edit3': return <Edit3 {...iconProps} />;
        case 'PictureInPicture': return <PictureInPicture {...iconProps} />;
        case 'PictureInPicture2': return <PictureInPicture2 {...iconProps} />;
        case 'Scissors': return <Scissors {...iconProps} />;
        case 'ClipboardPaste': return <ClipboardPaste {...iconProps} />;
        default: return null;
    }
};

export interface ContextMenuItem {
    label: string;
    icon: string;
    onClick: () => void;
    isDanger?: boolean;
}

interface ContextMenuProps {
    isOpen: boolean;
    position: { x: number; y: number };
    onClose: () => void;
    items: ContextMenuItem[];
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ isOpen, position, onClose, items }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [adjustedPosition, setAdjustedPosition] = useState({ x: 0, y: 0 });

    useLayoutEffect(() => {
        if (isOpen && menuRef.current) {
            const menuRect = menuRef.current.getBoundingClientRect();
            const { innerWidth, innerHeight } = window;

            let newX = position.x;
            let newY = position.y;

            if (position.x + menuRect.width > innerWidth) {
                newX = innerWidth - menuRect.width - 10;
            }
            if (position.y + menuRect.height > innerHeight) {
                newY = innerHeight - menuRect.height - 10;
            }

            setAdjustedPosition({ x: newX < 0 ? 10 : newX, y: newY < 0 ? 10 : newY });
        }
    }, [isOpen, position]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) {
        return null;
    }

    return (
        <div
            ref={menuRef}
            className="fixed z-[100] bg-[var(--theme-bg-primary)] border border-[var(--theme-border-secondary)] rounded-lg shadow-premium py-1.5 min-w-[180px] modal-enter-animation"
            style={{ 
                top: adjustedPosition.y, 
                left: adjustedPosition.x,
                // Start with opacity 0 to prevent flicker before position is adjusted
                opacity: adjustedPosition.x === 0 && adjustedPosition.y === 0 ? 0 : 1, 
             }}
            role="menu"
            aria-orientation="vertical"
        >
            <ul className="space-y-1">
                {items.map((item, index) => (
                    <li key={index}>
                        <button
                            onClick={() => {
                                item.onClick();
                                onClose();
                            }}
                            className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-3 transition-colors rounded-sm ${
                                item.isDanger
                                    ? 'text-[var(--theme-text-danger)] hover:bg-[var(--theme-bg-danger)] hover:text-white'
                                    : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-primary)]'
                            }`}
                            role="menuitem"
                        >
                            <CommandIcon iconName={item.icon} />
                            <span>{item.label}</span>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};
