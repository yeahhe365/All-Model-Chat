import React, { useState } from 'react';
import { Pin, MoreHorizontal } from 'lucide-react';
import { SavedChatSession } from '../../types';
import { translations } from '../../utils/translations';
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
  onDuplicateSession: (sessionId: string) => void;
  onOpenExportModal: (sessionId?: string) => void | Promise<void>;
  handleStartEdit: (item: SavedChatSession) => void;
  handleRenameConfirm: () => void;
  handleRenameKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  setEditingItem: (item: { type: 'session' | 'group', id: string, title: string } | null) => void;
  toggleMenu: (e: React.MouseEvent, id: string) => void;
  setActiveMenu: (id: string | null) => void;
  t: (key: keyof typeof translations, fallback?: string) => string;
}

export const SessionItem: React.FC<SessionItemProps> = (props) => {
  const {
    session, activeSessionId, editingItem, activeMenu, loadingSessionIds,
    generatingTitleSessionIds, newlyTitledSessionId, editInputRef, menuRef,
    onSelectSession, onTogglePinSession, onDeleteSession, onDuplicateSession, onOpenExportModal,
    handleStartEdit, handleRenameConfirm, handleRenameKeyDown, setEditingItem,
    toggleMenu, setActiveMenu, t
  } = props;

  const [isRightClickAnimating, setIsRightClickAnimating] = useState(false);
  const isActive = activeMenu === session.id;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsRightClickAnimating(true);
    setActiveMenu(session.id);
    setTimeout(() => setIsRightClickAnimating(false), 200);
  };

  return (
    <li
      onContextMenu={handleContextMenu}
      className={`group relative rounded-lg my-0.5 transition-colors duration-100 ease-out ${session.id === activeSessionId ? 'bg-[var(--theme-bg-tertiary)]' : ''} ${newlyTitledSessionId === session.id ? 'title-update-animate' : ''} ${isRightClickAnimating ? 'bg-[var(--theme-bg-tertiary)]' : ''} ${isActive ? 'z-20' : ''}`}
    >
      <div className={`relative w-full text-left pl-2.5 pr-1 py-2 text-sm transition-colors rounded-lg ${session.id === activeSessionId ? 'text-[var(--theme-text-primary)]' : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-primary)]'}`}>
        {editingItem?.type === 'session' && editingItem.id === session.id ? (
          <input ref={editInputRef} type="text" value={editingItem.title} onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })} onBlur={handleRenameConfirm} onKeyDown={handleRenameKeyDown} className="flex-grow bg-transparent border border-[var(--theme-border-focus)] rounded-md px-1 py-0 text-sm w-full" />
        ) : (
          <a 
            href={`/chat/${session.id}`} 
            draggable={false}
            onClick={(e) => {
              if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                e.preventDefault();
                onSelectSession(session.id);
              }
            }} 
            className="flex w-full min-w-0 items-center pr-8 no-underline text-inherit" 
            aria-current={session.id === activeSessionId ? "page" : undefined}
          >
            {session.isPinned && <Pin size={12} className="mr-2 text-[var(--theme-text-link)] flex-shrink-0" strokeWidth={2} />}
            <span className="font-medium truncate" title={session.title}>
              {generatingTitleSessionIds.has(session.id) ? (
                <div className="flex items-center gap-2 text-xs text-[var(--theme-text-tertiary)]"><LoadingDots /><span>{t('generatingTitle')}</span></div>
              ) : (session.title)}
            </span>
          </a>
        )}
        {loadingSessionIds.has(session.id) ? (
          <span className="absolute right-1 top-1/2 -translate-y-1/2">
            <LoadingDots />
          </span>
        ) : !generatingTitleSessionIds.has(session.id) && (
          <button onClick={(e) => toggleMenu(e, session.id)} className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-full text-[var(--theme-text-tertiary)] opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus:opacity-100 focus:pointer-events-auto transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--theme-border-focus)]"><MoreHorizontal size={16} strokeWidth={2} /></button>
        )}
      </div>
      {activeMenu === session.id && (
        <SessionItemMenu
          session={session}
          menuRef={menuRef}
          onStartEdit={() => { handleStartEdit(session); setActiveMenu(null); }}
          onTogglePin={() => { onTogglePinSession(session.id); setActiveMenu(null); }}
          onDuplicate={() => { onDuplicateSession(session.id); setActiveMenu(null); }}
          onExport={() => { onOpenExportModal(session.id); setActiveMenu(null); }}
          onDelete={() => { onDeleteSession(session.id); setActiveMenu(null); }}
          t={t}
        />
      )}
    </li>
  );
};
