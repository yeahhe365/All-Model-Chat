
import React from 'react';
import { SquarePen, Trash2 } from 'lucide-react';
import { translations } from '../../utils/translations';
import { MENU_ITEM_BUTTON_CLASS, MENU_ITEM_DEFAULT_STATE_CLASS, MENU_ITEM_DANGER_STATE_CLASS } from '../../constants/appConstants';

interface GroupItemMenuProps {
  menuRef: React.RefObject<HTMLDivElement>;
  onStartEdit: () => void;
  onDelete: () => void;
  t: (key: keyof typeof translations) => string;
}

export const GroupItemMenu: React.FC<GroupItemMenuProps> = ({ menuRef, onStartEdit, onDelete, t }) => (
    <div ref={menuRef} className="relative z-10">
        <div className="absolute right-3 -top-1 w-40 bg-[var(--theme-bg-primary)] border border-[var(--theme-border-secondary)] rounded-md shadow-lg py-1">
            <button onClick={onStartEdit} className={`${MENU_ITEM_BUTTON_CLASS} ${MENU_ITEM_DEFAULT_STATE_CLASS}`}><SquarePen size={14} /> <span>{t('edit')}</span></button>
            <button onClick={onDelete} className={`${MENU_ITEM_BUTTON_CLASS} ${MENU_ITEM_DANGER_STATE_CLASS}`}><Trash2 size={14} /> <span>{t('delete')}</span></button>
        </div>
    </div>
);
