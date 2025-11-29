
import React from 'react';
import { Pin, MoreHorizontal } from 'lucide-react';
import { SavedChatSession } from '../../types';
import { translations } from '../../utils/appUtils';
import { SessionItemMenu } from './SessionItemMenu';
import { LoadingDots } from '../shared/LoadingDots';

interface SessionItemProps {
  session: SavedChatSession;
  activeSessionId: string | null;
  editingItem: { type: 'session' | 'group', id: string, title: string } | null;
  activeMenu: string | null;
  loadingSessionIds: Set<string>;
  generatingTitleSessionIds: Set<string>;
  newlyTitledSessionId: string | null;
  editInputRef: React.RefObject<HTMLInputElement>;
  menuRef: React.RefObject<HTMLDivElement>;
  onSelectSession: (sessionId: string) => void;
  onTogglePinSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onOpenExportModal: () => void;
  handleStartEdit: (item: SavedChatSession) => void;
  handleRenameConfirm: () => void;
  handleRenameKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  setEditingItem: (item: { type: 'session' | 'group', id: string, title: string } | null) => void;
  toggleMenu: (e: React.MouseEvent, id: string) => void;
  setActiveMenu: (id: string | null) => void;
  handleDragStart: (e: React.DragEvent, sessionId: string) => void;
  t: (key: keyof typeof translations, fallback?: string) => string;
}

export const SessionItem: React.FC<SessionItemProps> = (props) => {
  const {
    session, activeSessionId, editingItem, activeMenu, loadingSessionIds,
    generatingTitleSessionIds, newlyTitledSessionId, editInputRef, menuRef,
    onSelectSession, onTogglePinSession, onDeleteSession, onOpenExportModal,
    handleStartEdit, handleRenameConfirm, handleRenameKeyDown, setEditingItem,
    toggleMenu, setActiveMenu, handleDragStart, t
  } = props;

  return (
    <li
      draggable="true"
      onDragStart={(e) => handleDragStart(e, session.id)}
      className={`group relative rounded-lg my-0.5 cursor-grab active:cursor-grabbing ${session.id === activeSessionId ? 'bg-[var(--theme-bg-tertiary)]' : ''} ${newlyTitledSessionId === session.id ? 'title-update-animate' : ''}`}
    >
      <div className={`w-full flex items-center justify-between text-left px-1 py-2 text-sm transition-colors rounded-lg ${session.id === activeSessionId ? 'text-[var(--theme-text-primary)]' : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-primary)]'}`}>
        {editingItem?.type === 'session' && editingItem.id === session.id ? (
          <input ref={editInputRef} type="text" value={editingItem.title} onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })} onBlur={handleRenameConfirm} onKeyDown={handleRenameKeyDown} className="flex-grow bg-transparent border border-[var(--theme-border-focus)] rounded-md px-1 py-0 text-sm w-full" />
        ) : (
          <button onClick={() => onSelectSession(session.id)} className="flex items-center flex-grow min-w-0" aria-current={session.id === activeSessionId ? "page" : undefined}>
            {session.isPinned && <Pin size={12} className="mr-2 text-[var(--theme-text-link)] flex-shrink-0" strokeWidth={2} />}
            <span className="font-medium truncate" title={session.title}>
              {generatingTitleSessionIds.has(session.id) ? (
                <div className="flex items-center gap-2 text-xs text-[var(--theme-text-tertiary)]"><LoadingDots /><span>{t('generatingTitle')}</span></div>
              ) : (session.title)}
            </span>
          </button>
        )}
        {loadingSessionIds.has(session.id) ? (
          <LoadingDots />
        ) : !generatingTitleSessionIds.has(session.id) && (
          <button onClick={(e) => toggleMenu(e, session.id)} className="p-1 rounded-full text-[var(--theme-text-tertiary)] opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--theme-border-focus)]"><MoreHorizontal size={16} strokeWidth={2} /></button>
        )}
      </div>
      {activeMenu === session.id && (
        <SessionItemMenu
          session={session}
          menuRef={menuRef}
          onStartEdit={() => { handleStartEdit(session); setActiveMenu(null); }}
          onTogglePin={() => { onTogglePinSession(session.id); setActiveMenu(null); }}
          onExport={() => { onSelectSession(session.id); onOpenExportModal(); setActiveMenu(null); }}
          onDelete={() => { onDeleteSession(session.id); setActiveMenu(null); }}
          t={t}
        />
      )}
    </li>
  );
};