
import React from 'react';
import { SquarePen, Trash2, Pin, PinOff, Download, Copy } from 'lucide-react';
import { SavedChatSession } from '../../types';
import { translations } from '../../utils/appUtils';

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
    <button onClick={onStartEdit} className="w-full text-left px-3 py-1.5 text-sm text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] flex items-center gap-2"><SquarePen size={14} /> <span>{t('edit')}</span></button>
    <button onClick={onTogglePin} className="w-full text-left px-3 py-1.5 text-sm text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] flex items-center gap-2">{session.isPinned ? <PinOff size={14} /> : <Pin size={14} />} <span>{session.isPinned ? t('history_unpin') : t('history_pin')}</span></button>
    <button onClick={onDuplicate} className="w-full text-left px-3 py-1.5 text-sm text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] flex items-center gap-2"><Copy size={14} /> <span>{t('history_duplicate')}</span></button>
    <button onClick={onExport} className="w-full text-left px-3 py-1.5 text-sm text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] flex items-center gap-2" title={t('export_chat', 'Export Chat')}><Download size={14} /> <span>{t('export_chat', 'Export Chat')}</span></button>
    <button onClick={onDelete} className="w-full text-left px-3 py-1.5 text-sm text-[var(--theme-icon-error)] hover:bg-[var(--theme-bg-danger)] hover:text-[var(--theme-text-accent)] flex items-center gap-2"><Trash2 size={14} /> <span>{t('delete')}</span></button>
  </div>
);
