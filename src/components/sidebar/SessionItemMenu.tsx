
import React, { useEffect, useRef, useState } from 'react';
import { SquarePen, Trash2, Pin, PinOff, Download, Copy } from 'lucide-react';
import { SavedChatSession } from '../../types';
import { translations } from '../../utils/appUtils';

interface SessionItemMenuProps {
  session: SavedChatSession;
  menuRef: React.RefObject<HTMLDivElement>;
  triggerRef?: React.RefObject<HTMLButtonElement>;
  onRequestClose: () => void;
  onStartEdit: () => void;
  onTogglePin: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onDelete: () => void;
  t: (key: keyof typeof translations, fallback?: string) => string;
}

export const SessionItemMenu: React.FC<SessionItemMenuProps> = ({
  session,
  menuRef,
  triggerRef,
  onRequestClose,
  onStartEdit,
  onTogglePin,
  onDuplicate,
  onExport,
  onDelete,
  t,
}) => {
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const menuItems = [
    {
      label: t('edit'),
      icon: <SquarePen size={14} />,
      onSelect: onStartEdit,
      className:
        'w-full text-left px-3 py-1.5 text-sm text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] flex items-center gap-2',
    },
    {
      label: session.isPinned ? t('history_unpin') : t('history_pin'),
      icon: session.isPinned ? <PinOff size={14} /> : <Pin size={14} />,
      onSelect: onTogglePin,
      className:
        'w-full text-left px-3 py-1.5 text-sm text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] flex items-center gap-2',
    },
    {
      label: t('history_duplicate'),
      icon: <Copy size={14} />,
      onSelect: onDuplicate,
      className:
        'w-full text-left px-3 py-1.5 text-sm text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] flex items-center gap-2',
    },
    {
      label: t('export_chat', 'Export Chat'),
      icon: <Download size={14} />,
      onSelect: onExport,
      className:
        'w-full text-left px-3 py-1.5 text-sm text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] flex items-center gap-2',
      title: t('export_chat', 'Export Chat'),
    },
    {
      label: t('delete'),
      icon: <Trash2 size={14} />,
      onSelect: onDelete,
      className:
        'w-full text-left px-3 py-1.5 text-sm text-[var(--theme-icon-error)] hover:bg-[var(--theme-bg-danger)] hover:text-[var(--theme-text-accent)] flex items-center gap-2',
    },
  ];

  useEffect(() => {
    itemRefs.current[0]?.focus();
  }, []);

  const closeMenu = () => {
    triggerRef?.current?.focus();
    onRequestClose();
  };

  const handleKeyDown = (index: number) => (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((index + 1) % menuItems.length);
      itemRefs.current[(index + 1) % menuItems.length]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const nextIndex = (index - 1 + menuItems.length) % menuItems.length;
      setHighlightedIndex(nextIndex);
      itemRefs.current[nextIndex]?.focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      setHighlightedIndex(0);
      itemRefs.current[0]?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      const lastIndex = menuItems.length - 1;
      setHighlightedIndex(lastIndex);
      itemRefs.current[lastIndex]?.focus();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      menuItems[index].onSelect();
    }
  };

  return (
    <div
      ref={menuRef}
      className="absolute right-3 top-9 z-10 w-40 bg-[var(--theme-bg-primary)] border border-[var(--theme-border-secondary)] rounded-md shadow-lg py-1"
      role="menu"
    >
      {menuItems.map((item, index) => (
        <button
          key={item.label}
          ref={(element) => {
            itemRefs.current[index] = element;
          }}
          onClick={item.onSelect}
          onKeyDown={handleKeyDown(index)}
          className={item.className}
          role="menuitem"
          tabIndex={index === highlightedIndex ? 0 : -1}
          title={item.title}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
};
