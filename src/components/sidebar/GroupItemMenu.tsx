
import React, { useEffect, useRef, useState } from 'react';
import { SquarePen, Trash2 } from 'lucide-react';
import { translations } from '../../utils/appUtils';

interface GroupItemMenuProps {
  menuRef: React.RefObject<HTMLDivElement>;
  triggerRef?: React.RefObject<HTMLButtonElement>;
  onRequestClose: () => void;
  onStartEdit: () => void;
  onDelete: () => void;
  t: (key: keyof typeof translations) => string;
}

export const GroupItemMenu: React.FC<GroupItemMenuProps> = ({
  menuRef,
  triggerRef,
  onRequestClose,
  onStartEdit,
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
      const nextIndex = (index + 1) % menuItems.length;
      setHighlightedIndex(nextIndex);
      itemRefs.current[nextIndex]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const nextIndex = (index - 1 + menuItems.length) % menuItems.length;
      setHighlightedIndex(nextIndex);
      itemRefs.current[nextIndex]?.focus();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      menuItems[index].onSelect();
    }
  };

  return (
    <div className="relative z-10">
      <div
        ref={menuRef}
        className="absolute right-3 -top-1 w-40 bg-[var(--theme-bg-primary)] border border-[var(--theme-border-secondary)] rounded-md shadow-lg py-1"
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
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
