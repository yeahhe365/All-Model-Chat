
import React from 'react';
import { SquarePen, Trash2, Pin, PinOff, Download, Copy } from 'lucide-react';
import { SavedChatSession } from '../../types';
import { translations } from '../../utils/translations';
import { MENU_ITEM_BUTTON_CLASS, MENU_ITEM_DEFAULT_STATE_CLASS, MENU_ITEM_DANGER_STATE_CLASS } from '../../constants/appConstants';

interface SessionItemMenuProps {
  session: SavedChatSession;
  menuRef: React.RefObject<HTMLDivElement>;
  onStartEdit: () => void;
  onTogglePin: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onDelete: () => void;
  t: (key: keyof typeof translations, fallback?: string) => string;
}

export const SessionItemMenu: React.FC<SessionItemMenuProps> = ({ session, menuRef, onStartEdit, onTogglePin, onDuplicate, onExport, onDelete, t }) => (
  <div ref={menuRef} className="absolute right-3 top-9 z-10 w-40 bg-[var(--theme-bg-primary)] border border-[var(--theme-border-secondary)] rounded-md shadow-lg py-1">
    <button onClick={onStartEdit} className={`${MENU_ITEM_BUTTON_CLASS} ${MENU_ITEM_DEFAULT_STATE_CLASS}`}><SquarePen size={14} /> <span>{t('edit')}</span></button>
    <button onClick={onTogglePin} className={`${MENU_ITEM_BUTTON_CLASS} ${MENU_ITEM_DEFAULT_STATE_CLASS}`}>{session.isPinned ? <PinOff size={14} /> : <Pin size={14} />} <span>{session.isPinned ? t('history_unpin') : t('history_pin')}</span></button>
    <button onClick={onDuplicate} className={`${MENU_ITEM_BUTTON_CLASS} ${MENU_ITEM_DEFAULT_STATE_CLASS}`}><Copy size={14} /> <span>{t('history_duplicate')}</span></button>
    <button onClick={onExport} className={`${MENU_ITEM_BUTTON_CLASS} ${MENU_ITEM_DEFAULT_STATE_CLASS}`} title={t('export_chat', 'Export Chat')}><Download size={14} /> <span>{t('export_chat', 'Export Chat')}</span></button>
    <button onClick={onDelete} className={`${MENU_ITEM_BUTTON_CLASS} ${MENU_ITEM_DANGER_STATE_CLASS}`}><Trash2 size={14} /> <span>{t('delete')}</span></button>
  </div>
);
