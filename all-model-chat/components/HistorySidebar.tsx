

import React, { useState, useEffect, useRef } from 'react';
import { SavedChatSession } from '../types';
import { SquarePen, Trash2, X, Search, Menu, MoreHorizontal, Pin, PinOff } from 'lucide-react';
import { translations } from '../utils/appUtils';

interface HistorySidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  sessions: SavedChatSession[];
  activeSessionId: string | null;
  loadingSessionIds: Set<string>;
  generatingTitleSessionIds: Set<string>;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  onDeleteSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, newTitle: string) => void;
  onTogglePinSession: (sessionId: string) => void;
  themeColors: {
    bgPrimary: string;
    bgSecondary: string;
    bgTertiary: string;
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    textLink: string;
    borderPrimary: string;
    borderSecondary: string;
    iconHistory: string;
  };
  t: (key: keyof typeof translations, fallback?: string) => string;
  language: 'en' | 'zh';
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  isOpen,
  onToggle,
  sessions,
  activeSessionId,
  loadingSessionIds,
  generatingTitleSessionIds,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onRenameSession,
  onTogglePinSession,
  themeColors,
  t,
  language,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [editingSession, setEditingSession] = useState<{ id: string, title: string } | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  
  const [newlyTitledSessionId, setNewlyTitledSessionId] = useState<string | null>(null);
  const prevGeneratingTitleSessionIdsRef = useRef<Set<string>>(new Set());


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };
    if (activeMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeMenu]);

  useEffect(() => {
    if (editingSession) {
      editInputRef.current?.focus();
    }
  }, [editingSession]);

  useEffect(() => {
    const prevIds = prevGeneratingTitleSessionIdsRef.current;
    
    // Find IDs that were in the previous set but not in the current one
    const completedIds = new Set<string>();
    prevIds.forEach(id => {
      if (!generatingTitleSessionIds.has(id)) {
        completedIds.add(id);
      }
    });

    completedIds.forEach(completedId => {
      setNewlyTitledSessionId(completedId);
      setTimeout(() => {
        setNewlyTitledSessionId(prev => (prev === completedId ? null : prev));
      }, 1500); // Animation duration
    });

    prevGeneratingTitleSessionIdsRef.current = generatingTitleSessionIds;
  }, [generatingTitleSessionIds]);

  const handleStartEdit = (session: SavedChatSession) => {
    setEditingSession({ id: session.id, title: session.title });
    setActiveMenu(null); // Close menu
  };

  const handleRenameConfirm = () => {
    if (editingSession && editingSession.title.trim()) {
      onRenameSession(editingSession.id, editingSession.title.trim());
    }
    setEditingSession(null);
  };

  const handleRenameCancel = () => {
    setEditingSession(null);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleRenameConfirm();
    } else if (e.key === 'Escape') {
      handleRenameCancel();
    }
  };

  const toggleMenu = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setActiveMenu(activeMenu === sessionId ? null : sessionId);
  };

  const filteredSessions = sessions.filter(session => {
    if (!searchQuery.trim()) {
      return true;
    }
    const query = searchQuery.toLowerCase();
    if (session.title.toLowerCase().includes(query)) {
      return true;
    }
    return session.messages.some(message =>
      message.content.toLowerCase().includes(query)
    );
  });
  
  const sortedSessions = [...filteredSessions].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.timestamp - a.timestamp;
  });

  return (
    <aside
      className={`h-full flex flex-col w-64 bg-[var(--theme-bg-secondary)] shadow-lg ease-in-out duration-300 absolute top-0 left-0 z-30 transition-transform transform sm:relative sm:transform-none sm:top-auto sm:left-auto sm:z-auto sm:transition-all ${isOpen ? 'translate-x-0' : '-translate-x-full'} sm:w-64 md:w-72 sm:flex-shrink-0 ${isOpen ? 'sm:ml-0' : 'sm:-ml-64 md:-ml-72'} ${isOpen ? 'border-r border-[var(--theme-border-primary)]' : 'sm:border-r-0'}`}
      role="complementary" aria-label={t('history_title')} aria-hidden={!isOpen}
    >
      <div className="p-2 sm:p-3 flex items-center justify-between flex-shrink-0 h-[60px] border-b border-[var(--theme-border-primary)]">
        <div className="flex items-center gap-2 pl-2">
            <img src="/logo.svg" alt="All Model Chat Logo" className="w-6 h-6" />
            <span className="text-lg font-semibold text-[var(--theme-text-primary)]">All Model Chat</span>
        </div>
        <button onClick={onToggle} className="p-2 text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] rounded-md" aria-label={isOpen ? t('historySidebarClose') : t('historySidebarOpen')}>
          <Menu size={20} />
        </button>
      </div>
      <div className="px-3 pt-3">
        <button onClick={onNewChat} className="flex items-center gap-3 w-full text-left px-3 py-2 text-sm bg-transparent border border-transparent rounded-lg hover:bg-[var(--theme-bg-tertiary)] hover:border-[var(--theme-border-secondary)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--theme-border-focus)] transition-colors" aria-label={t('headerNewChat_aria')}>
          <SquarePen size={18} className="text-[var(--theme-text-secondary)]" />
          <span className="text-[var(--theme-text-link)]">{t('headerNewChat')}</span>
        </button>
      </div>
      <div className="px-3 pt-2">
        {isSearching ? (
          <div className="flex items-center gap-2 w-full text-left px-2 py-1 text-sm bg-[var(--theme-bg-primary)] border border-[var(--theme-border-focus)] rounded-lg shadow-sm transition-all duration-200">
            <Search size={18} className="text-[var(--theme-text-tertiary)] flex-shrink-0" />
            <input
              type="text"
              placeholder={t('history_search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-0 rounded-md py-1 text-sm focus:ring-0 outline-none text-[var(--theme-text-primary)] placeholder:text-[var(--theme-text-tertiary)]"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Escape') setIsSearching(false); }}
            />
            <button onClick={() => { setIsSearching(false); setSearchQuery(''); }} className="p-1.5 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] rounded-md" aria-label={t('history_search_clear_aria')}>
              <X size={18} />
            </button>
          </div>
        ) : (
          <button onClick={() => setIsSearching(true)} className="flex items-center gap-3 w-full text-left px-3 py-2 text-sm bg-transparent border border-transparent rounded-lg hover:bg-[var(--theme-bg-tertiary)] hover:border-[var(--theme-border-secondary)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--theme-border-focus)] transition-colors" aria-label={t('history_search_aria')}>
            <Search size={18} className="text-[var(--theme-text-secondary)]" />
            <span className="text-[var(--theme-text-link)]">{t('history_search_button', 'Search')}</span>
          </button>
        )}
      </div>
      <div className="px-4 pt-3 pb-2">
        <h3 className="text-xs font-semibold text-[var(--theme-text-tertiary)] tracking-wider uppercase">{t('history_recent_chats')}</h3>
      </div>
      <div className="flex-grow overflow-y-auto custom-scrollbar">
        {sessions.length === 0 && !searchQuery ? (
          <p className="p-4 text-xs sm:text-sm text-center text-[var(--theme-text-tertiary)]">{t('history_empty')}</p>
        ) : sortedSessions.length === 0 ? (
          <p className="p-4 text-xs sm:text-sm text-center text-[var(--theme-text-tertiary)]">{t('history_search_no_results')}</p>
        ) : (
          <ul className="py-1 px-2">
            {sortedSessions.map((session) => {
                const isGeneratingTitle = generatingTitleSessionIds.has(session.id);
                const isNewlyTitled = newlyTitledSessionId === session.id;
              
                return (
                    <li key={session.id} className={`group relative rounded-lg my-0.5 ${session.id === activeSessionId ? 'bg-[var(--theme-bg-tertiary)]' : ''} ${isNewlyTitled ? 'title-update-animate' : ''}`}>
                    <div className={`w-full flex items-center justify-between text-left px-3 py-2 text-sm transition-colors rounded-lg ${session.id === activeSessionId ? 'text-[var(--theme-text-primary)]' : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-primary)]'}`}>
                      {editingSession?.id === session.id ? (
                        <input ref={editInputRef} type="text" value={editingSession.title} onChange={(e) => setEditingSession({ ...editingSession, title: e.target.value })} onBlur={handleRenameConfirm} onKeyDown={handleRenameKeyDown} className="flex-grow bg-transparent border border-[var(--theme-border-focus)] rounded-md px-1 py-0 text-sm w-full" />
                      ) : (
                        <button onClick={() => onSelectSession(session.id)} className="flex items-center flex-grow min-w-0" aria-current={session.id === activeSessionId ? "page" : undefined}>
                          {session.isPinned && <Pin size={12} className="mr-2 text-[var(--theme-text-link)] flex-shrink-0" />}
                          <span className="font-medium truncate" title={session.title}>
                             {isGeneratingTitle ? (
                                <div className="flex items-center gap-2 text-xs text-[var(--theme-text-tertiary)]">
                                    <div className="loading-dots-container"><div className="loading-dot"></div><div className="loading-dot"></div><div className="loading-dot"></div></div>
                                    <span>{t('generatingTitle')}</span>
                                </div>
                                ) : (
                                session.title
                             )}
                          </span>
                        </button>
                      )}
                      {loadingSessionIds.has(session.id) ? (
                        <div className="loading-dots-container"><div className="loading-dot"></div><div className="loading-dot"></div><div className="loading-dot"></div></div>
                      ) : !isGeneratingTitle && (
                        <button onClick={(e) => toggleMenu(e, session.id)} className="p-1 rounded-full text-[var(--theme-text-tertiary)] opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--theme-border-focus)]">
                          <MoreHorizontal size={16} />
                        </button>
                      )}
                    </div>
                    {activeMenu === session.id && (
                      <div ref={menuRef} className="absolute right-3 top-9 z-10 w-40 bg-[var(--theme-bg-primary)] border border-[var(--theme-border-secondary)] rounded-md shadow-lg py-1">
                        <button onClick={() => handleStartEdit(session)} className="w-full text-left px-3 py-1.5 text-sm text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] flex items-center gap-2"><SquarePen size={14} /> <span>{t('history_edit_title')}</span></button>
                        <button onClick={() => { onTogglePinSession(session.id); setActiveMenu(null); }} className="w-full text-left px-3 py-1.5 text-sm text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] flex items-center gap-2">
                          {session.isPinned ? <PinOff size={14} /> : <Pin size={14} />} <span>{session.isPinned ? t('history_unpin') : t('history_pin')}</span>
                        </button>
                        <button onClick={() => { onDeleteSession(session.id); setActiveMenu(null); }} className="w-full text-left px-3 py-1.5 text-sm text-[var(--theme-icon-error)] hover:bg-[var(--theme-bg-danger)] hover:text-[var(--theme-text-danger)] flex items-center gap-2"><Trash2 size={14} /> <span>{t('history_delete')}</span></button>
                      </div>
                    )}
                  </li>
                )
            })}
          </ul>
        )}
      </div>
    </aside>
  );
};