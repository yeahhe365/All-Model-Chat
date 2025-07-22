import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SavedChatSession, ChatGroup } from '../types';
import { SquarePen, Trash2, X, Search, PanelLeftClose, MoreHorizontal, Pin, PinOff, Download, FolderPlus, ChevronDown } from 'lucide-react';
import { translations } from '../utils/appUtils';
import { APP_LOGO_SVG_DATA_URI } from '../constants/appConstants';

interface HistorySidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  sessions: SavedChatSession[];
  groups: ChatGroup[];
  activeSessionId: string | null;
  loadingSessionIds: Set<string>;
  generatingTitleSessionIds: Set<string>;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  onDeleteSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, newTitle: string) => void;
  onTogglePinSession: (sessionId: string) => void;
  onOpenExportModal: () => void;
  onAddNewGroup: () => void;
  onDeleteGroup: (groupId: string) => void;
  onRenameGroup: (groupId: string, newTitle: string) => void;
  onMoveSessionToGroup: (sessionId: string, groupId: string | null) => void;
  onToggleGroupExpansion: (groupId: string) => void;
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
  isOpen, onToggle, sessions, groups, activeSessionId, loadingSessionIds,
  generatingTitleSessionIds, onSelectSession, onNewChat, onDeleteSession,
  onRenameSession, onTogglePinSession, onOpenExportModal, onAddNewGroup,
  onDeleteGroup, onRenameGroup, onMoveSessionToGroup, onToggleGroupExpansion,
  themeColors, t, language
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [editingSession, setEditingSession] = useState<{ id: string, title: string } | null>(null);
  const [editingGroup, setEditingGroup] = useState<{ id: string, title: string } | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const [newlyTitledSessionId, setNewlyTitledSessionId] = useState<string | null>(null);
  const prevGeneratingTitleSessionIdsRef = useRef<Set<string>>(new Set());
  const [isAllConversationsExpanded, setIsAllConversationsExpanded] = useState(true);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setActiveMenu(null);
    };
    if (activeMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenu]);

  useEffect(() => {
    if (editingSession || editingGroup) editInputRef.current?.focus();
  }, [editingSession, editingGroup]);
  
  useEffect(() => {
    const prevIds = prevGeneratingTitleSessionIdsRef.current;
    const completedIds = new Set<string>();
    prevIds.forEach(id => { if (!generatingTitleSessionIds.has(id)) completedIds.add(id); });
    completedIds.forEach(completedId => {
      setNewlyTitledSessionId(completedId);
      setTimeout(() => setNewlyTitledSessionId(p => (p === completedId ? null : p)), 1500);
    });
    prevGeneratingTitleSessionIdsRef.current = generatingTitleSessionIds;
  }, [generatingTitleSessionIds]);

  const handleStartEdit = (type: 'session' | 'group', item: SavedChatSession | ChatGroup) => {
    if (type === 'session') setEditingSession({ id: item.id, title: item.title });
    else setEditingGroup({ id: item.id, title: item.title });
    setActiveMenu(null);
  };

  const handleRenameConfirm = () => {
    if (editingSession && editingSession.title.trim()) onRenameSession(editingSession.id, editingSession.title.trim());
    if (editingGroup && editingGroup.title.trim()) onRenameGroup(editingGroup.id, editingGroup.title.trim());
    setEditingSession(null);
    setEditingGroup(null);
  };
  
  const handleRenameCancel = () => { setEditingSession(null); setEditingGroup(null); };

  const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleRenameConfirm();
    else if (e.key === 'Escape') handleRenameCancel();
  };

  const toggleMenu = (e: React.MouseEvent, id: string) => { e.stopPropagation(); setActiveMenu(activeMenu === id ? null : id); };

  const filteredSessions = useMemo(() => sessions.filter(session => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    if (session.title.toLowerCase().includes(query)) return true;
    return session.messages.some(message => message.content.toLowerCase().includes(query));
  }), [sessions, searchQuery]);

  const sessionsByGroupId = useMemo(() => {
    const map = new Map<string | null, SavedChatSession[]>();
    map.set(null, []); // For ungrouped sessions
    groups.forEach(group => map.set(group.id, []));
    filteredSessions.forEach(session => {
      const key = session.groupId && map.has(session.groupId) ? session.groupId : null;
      map.get(key)?.push(session);
    });
    map.forEach(sessionList => sessionList.sort((a, b) => b.timestamp - a.timestamp));
    return map;
  }, [filteredSessions, groups]);

  const sortedGroups = useMemo(() => [...groups].sort((a,b) => b.timestamp - a.timestamp), [groups]);

  const handleDragStart = (e: React.DragEvent, sessionId: string) => { e.dataTransfer.setData('sessionId', sessionId); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = (e: React.DragEvent, groupId: string | null) => {
    e.preventDefault();
    const sessionId = e.dataTransfer.getData('sessionId');
    const targetGroupId = groupId === 'all-conversations' ? null : groupId;
    if (sessionId) onMoveSessionToGroup(sessionId, targetGroupId);
    setDragOverId(null);
  };

  const renderSessionItem = (session: SavedChatSession) => (
    <li
      key={session.id}
      draggable="true" onDragStart={(e) => handleDragStart(e, session.id)}
      className={`group relative rounded-lg my-0.5 ${session.id === activeSessionId ? 'bg-[var(--theme-bg-tertiary)]' : ''} ${newlyTitledSessionId === session.id ? 'title-update-animate' : ''}`}
    >
      <div className={`w-full flex items-center justify-between text-left pl-3 pr-1.5 py-2 text-sm transition-colors rounded-lg ${session.id === activeSessionId ? 'text-[var(--theme-text-primary)]' : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-primary)]'}`}>
        {editingSession?.id === session.id ? (
          <input ref={editInputRef} type="text" value={editingSession.title} onChange={(e) => setEditingSession({ ...editingSession, title: e.target.value })} onBlur={handleRenameConfirm} onKeyDown={handleRenameKeyDown} className="flex-grow bg-transparent border border-[var(--theme-border-focus)] rounded-md px-1 py-0 text-sm w-full" />
        ) : (
          <button onClick={() => onSelectSession(session.id)} className="flex items-center flex-grow min-w-0" aria-current={session.id === activeSessionId ? "page" : undefined}>
            {session.isPinned && <Pin size={12} className="mr-2 text-[var(--theme-text-link)] flex-shrink-0" />}
            <span className="font-medium truncate" title={session.title}>
              {generatingTitleSessionIds.has(session.id) ? (
                <div className="flex items-center gap-2 text-xs text-[var(--theme-text-tertiary)]"><div className="loading-dots-container"><div className="loading-dot"></div><div className="loading-dot"></div><div className="loading-dot"></div></div><span>{t('generatingTitle')}</span></div>
              ) : (session.title)}
            </span>
          </button>
        )}
        {loadingSessionIds.has(session.id) ? (
          <div className="loading-dots-container"><div className="loading-dot"></div><div className="loading-dot"></div><div className="loading-dot"></div></div>
        ) : !generatingTitleSessionIds.has(session.id) && (
          <button onClick={(e) => toggleMenu(e, session.id)} className="p-1 rounded-full text-[var(--theme-text-tertiary)] opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--theme-border-focus)]"><MoreHorizontal size={16} /></button>
        )}
      </div>
      {activeMenu === session.id && (
        <div ref={menuRef} className="absolute right-3 top-9 z-10 w-40 bg-[var(--theme-bg-primary)] border border-[var(--theme-border-secondary)] rounded-md shadow-lg py-1">
          <button onClick={() => handleStartEdit('session', session)} className="w-full text-left px-3 py-1.5 text-sm text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] flex items-center gap-2"><SquarePen size={14} /> <span>{t('history_edit_title')}</span></button>
          <button onClick={() => { onTogglePinSession(session.id); setActiveMenu(null); }} className="w-full text-left px-3 py-1.5 text-sm text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] flex items-center gap-2">{session.isPinned ? <PinOff size={14} /> : <Pin size={14} />} <span>{session.isPinned ? t('history_unpin') : t('history_pin')}</span></button>
          <button onClick={() => { onSelectSession(session.id); onOpenExportModal(); setActiveMenu(null); }} disabled={session.messages.length === 0} className="w-full text-left px-3 py-1.5 text-sm text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed" title={session.messages.length === 0 ? t('chat_is_empty', 'Chat is empty') : t('export_chat', 'Export Chat')}><Download size={14} /> <span>{t('export_chat', 'Export Chat')}</span></button>
          <button onClick={() => { onDeleteSession(session.id); setActiveMenu(null); }} className="w-full text-left px-3 py-1.5 text-sm text-[var(--theme-icon-error)] hover:bg-[var(--theme-bg-danger)] hover:text-[var(--theme-text-danger)] flex items-center gap-2"><Trash2 size={14} /> <span>{t('history_delete')}</span></button>
        </div>
      )}
    </li>
  );
  
  const renderGroup = (group: ChatGroup, groupSessions: SavedChatSession[] | undefined) => (
    <div key={group.id} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, group.id)} onDragEnter={() => setDragOverId(group.id)} onDragLeave={() => setDragOverId(null)} className={`rounded-lg transition-colors ${dragOverId === group.id ? 'bg-[var(--theme-bg-accent)] bg-opacity-20' : ''}`}>
      <details open={group.isExpanded ?? true} className="group/details">
        <summary 
            className="list-none flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-[var(--theme-bg-tertiary)] group"
            onClick={(e) => {
                e.preventDefault();
                if (group.id === 'all-conversations') {
                    setIsAllConversationsExpanded(prev => !prev);
                } else {
                    onToggleGroupExpansion(group.id);
                }
            }}
        >
          <div className="flex items-center gap-2 min-w-0">
             <ChevronDown size={16} className="text-[var(--theme-text-tertiary)] transition-transform group-open/details:rotate-180 flex-shrink-0" />
             {editingGroup?.id === group.id ? (
                <input ref={editInputRef} type="text" value={editingGroup.title} onChange={(e) => setEditingGroup({...editingGroup, title: e.target.value})} onBlur={handleRenameConfirm} onKeyDown={handleRenameKeyDown} onClick={e => e.stopPropagation()} className="bg-transparent border border-[var(--theme-border-focus)] rounded-md px-1 py-0 text-sm w-full font-semibold" />
             ) : (
                <span className="font-semibold text-sm truncate text-[var(--theme-text-secondary)]">{group.title}</span>
             )}
          </div>
          {group.id !== 'all-conversations' && (
            <button onClick={(e) => toggleMenu(e, group.id)} className="p-1 rounded-full text-[var(--theme-text-tertiary)] opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"><MoreHorizontal size={16} /></button>
          )}
        </summary>
        {activeMenu === group.id && (
          <div ref={menuRef} className="relative z-10">
            <div className="absolute right-3 -top-1 w-40 bg-[var(--theme-bg-primary)] border border-[var(--theme-border-secondary)] rounded-md shadow-lg py-1">
              <button onClick={() => handleStartEdit('group', group)} className="w-full text-left px-3 py-1.5 text-sm text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] flex items-center gap-2"><SquarePen size={14} /> <span>{t('history_edit_title')}</span></button>
              <button onClick={() => { onDeleteGroup(group.id); setActiveMenu(null); }} className="w-full text-left px-3 py-1.5 text-sm text-[var(--theme-icon-error)] hover:bg-[var(--theme-bg-danger)] hover:text-[var(--theme-text-danger)] flex items-center gap-2"><Trash2 size={14} /> <span>{t('history_delete')}</span></button>
            </div>
          </div>
        )}
        <ul className="pl-3">{groupSessions?.map(renderSessionItem)}</ul>
      </details>
    </div>
  );

  const ungroupedSessions = sessionsByGroupId.get(null);

  return (
    <aside
      className={`h-full flex flex-col w-64 bg-[var(--theme-bg-secondary)] shadow-lg ease-in-out duration-300 absolute top-0 left-0 z-30 transition-transform transform sm:relative sm:transform-none sm:top-auto sm:left-auto sm:z-auto sm:transition-all ${isOpen ? 'translate-x-0' : '-translate-x-full'} sm:w-64 md:w-72 sm:flex-shrink-0 ${isOpen ? 'sm:ml-0' : 'sm:-ml-64 md:-ml-72'} ${isOpen ? 'border-r border-[var(--theme-border-primary)]' : 'sm:border-r-0'}`}
      role="complementary" aria-label={t('history_title')} aria-hidden={!isOpen}
    >
      <div className="p-2 sm:p-3 flex items-center justify-between flex-shrink-0 h-[60px]">
        <a href="https://all-model-chat.pages.dev/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 pl-2 no-underline hover:opacity-80 transition-opacity">
            <img src={APP_LOGO_SVG_DATA_URI} alt="All Model Chat Logo" className="w-6 h-6" />
            <span className="text-lg font-semibold text-[var(--theme-text-primary)]">All Model Chat</span>
        </a>
        <button onClick={onToggle} className="p-2 text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] rounded-md" aria-label={isOpen ? t('historySidebarClose') : t('historySidebarOpen')}><PanelLeftClose size={20} /></button>
      </div>
      <div className="px-3 pt-3 flex items-center gap-2">
        <button onClick={onNewChat} className="flex-grow flex items-center gap-3 w-full text-left px-3 py-2 text-sm bg-transparent border border-transparent rounded-lg hover:bg-[var(--theme-bg-tertiary)] hover:border-[var(--theme-border-secondary)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--theme-border-focus)] transition-colors" aria-label={t('headerNewChat_aria')}><SquarePen size={18} className="text-[var(--theme-text-secondary)]" /><span className="text-[var(--theme-text-link)]">{t('headerNewChat')}</span></button>
        <button onClick={onAddNewGroup} className="flex-shrink-0 p-2 text-[var(--theme-text-secondary)] bg-transparent border border-transparent rounded-lg hover:bg-[var(--theme-bg-tertiary)] hover:border-[var(--theme-border-secondary)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--theme-border-focus)] transition-colors" title="New Group"><FolderPlus size={18} /></button>
      </div>
      <div className="px-3 pt-2">
        {isSearching ? (
          <div className="flex items-center gap-2 w-full text-left px-2 py-1 text-sm bg-[var(--theme-bg-primary)] border border-[var(--theme-border-focus)] rounded-lg shadow-sm transition-all duration-200">
            <Search size={18} className="text-[var(--theme-text-tertiary)] flex-shrink-0" />
            <input type="text" placeholder={t('history_search_placeholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-transparent border-0 rounded-md py-1 text-sm focus:ring-0 outline-none text-[var(--theme-text-primary)] placeholder:text-[var(--theme-text-tertiary)]" autoFocus onKeyDown={(e) => { if (e.key === 'Escape') setIsSearching(false); }} />
            <button onClick={() => { setIsSearching(false); setSearchQuery(''); }} className="p-1.5 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] rounded-md" aria-label={t('history_search_clear_aria')}><X size={18} /></button>
          </div>
        ) : (
          <button onClick={() => setIsSearching(true)} className="flex items-center gap-3 w-full text-left px-3 py-2 text-sm bg-transparent border border-transparent rounded-lg hover:bg-[var(--theme-bg-tertiary)] hover:border-[var(--theme-border-secondary)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--theme-border-focus)] transition-colors" aria-label={t('history_search_aria')}><Search size={18} className="text-[var(--theme-text-secondary)]" /><span className="text-[var(--theme-text-link)]">{t('history_search_button', 'Search')}</span></button>
        )}
      </div>
      <div className="flex-grow overflow-y-auto custom-scrollbar p-2">
        {sessions.length === 0 && !searchQuery ? (
          <p className="p-4 text-xs sm:text-sm text-center text-[var(--theme-text-tertiary)]">{t('history_empty')}</p>
        ) : (
          <>
            {sortedGroups.map(group => renderGroup(group, sessionsByGroupId.get(group.id)))}
            {ungroupedSessions && ungroupedSessions.length > 0 && renderGroup(
              { id: 'all-conversations', title: t('history_allConversations', 'All Conversations'), timestamp: 0, isExpanded: isAllConversationsExpanded },
              ungroupedSessions
            )}
          </>
        )}
      </div>
    </aside>
  );
};
