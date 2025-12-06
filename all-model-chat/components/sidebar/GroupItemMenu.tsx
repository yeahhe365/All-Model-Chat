
import React from 'react';
import { SquarePen, Trash2 } from 'lucide-react';
import { translations } from '../../utils/appUtils';

interface GroupItemMenuProps {
  menuRef: React.RefObject<HTMLDivElement>;
  onStartEdit: () => void;
  onDelete: () => void;
  t: (key: keyof typeof translations) => string;
}

export const GroupItemMenu: React.FC<GroupItemMenuProps> = ({ menuRef, onStartEdit, onDelete, t }) => (
    <div ref={menuRef} className="relative z-10">
        <div className="absolute right-3 -top-1 w-40 bg-[var(--theme-bg-primary)] border border-[var(--theme-border-secondary)] rounded-md shadow-lg py-1">
            <button onClick={onStartEdit} className="w-full text-left px-3 py-1.5 text-sm text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] flex items-center gap-2"><SquarePen size={14} /> <span>{t('edit')}</span></button>
            <button onClick={onDelete} className="w-full text-left px-3 py-1.5 text-sm text-[var(--theme-icon-error)] hover:bg-[var(--theme-bg-danger)] hover:text-[var(--theme-text-accent)] flex items-center gap-2"><Trash2 size={14} /> <span>{t('delete')}</span></button>
        </div>
    </div>
);
