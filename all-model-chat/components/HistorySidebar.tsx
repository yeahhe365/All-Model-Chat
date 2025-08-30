import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SavedChatSession, ChatGroup } from '../types';
import { translations } from '../utils/appUtils';
import { SidebarHeader } from './sidebar/SidebarHeader';
import { SidebarActions } from './sidebar/SidebarActions';
import { SessionItem } from './sidebar/SessionItem';
import { GroupItem } from './sidebar/GroupItem';

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
  themeId: string;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = (props) => {
  const { 
    isOpen, onToggle, sessions, groups, activeSessionId, loadingSessionIds,
    generatingTitleSessionIds, onSelectSession, onOpenExportModal, onAddNewGroup,
    onDeleteGroup, onRenameGroup, onMoveSessionToGroup, onToggleGroupExpansion,
    themeId, t, language, onNewChat, onDeleteSession, onRenameSession, onTogglePinSession
  } = props;

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
    if (type === 'session') setEditingSession({ id: item.id, title: (item as SavedChatSession).title });
    else setEditingGroup({ id: item.id, title: (item as ChatGroup).title });
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
    map.forEach(sessionList => sessionList.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.timestamp - a.timestamp;
    }));
    return map;
  }, [filteredSessions, groups]);

  const sortedGroups = useMemo(() => [...groups].sort((a,b) => b.timestamp - a.timestamp), [groups]);

  const categorizedUngroupedSessions = useMemo(() => {
    const ungroupedSessions = sessionsByGroupId.get(null) || [];
    const unpinned = ungroupedSessions.filter(s => !s.isPinned);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgoStart = new Date(todayStart);
    sevenDaysAgoStart.setDate(todayStart.getDate() - 7);
    const thirtyDaysAgoStart = new Date(todayStart);
    thirtyDaysAgoStart.setDate(todayStart.getDate() - 30);

    const categories: { [key: string]: SavedChatSession[] } = {};

    const categoryKeys = {
      today: t('history_today', 'Today'),
      sevenDays: t('history_7_days', 'Previous 7 Days'),
      thirtyDays: t('history_30_days', 'Previous 30 Days'),
    };

    unpinned.forEach(session => {
      const sessionDate = new Date(session.timestamp);
      let categoryName: string;

      if (sessionDate >= todayStart) {
        categoryName = categoryKeys.today;
      } else if (sessionDate >= sevenDaysAgoStart) {
        categoryName = categoryKeys.sevenDays;
      } else if (sessionDate >= thirtyDaysAgoStart) {
        categoryName = categoryKeys.thirtyDays;
      } else {
        categoryName = new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN-u-nu-hanidec' : 'en-US', {
          year: 'numeric',
          month: 'long',
        }).format(sessionDate);
      }
      if (!categories[categoryName]) {
        categories[categoryName] = [];
      }
      categories[categoryName].push(session);
    });

    const staticOrder = [categoryKeys.today, categoryKeys.sevenDays, categoryKeys.thirtyDays];
    const monthCategories = Object.keys(categories).filter(name => !staticOrder.includes(name))
      .sort((a, b) => {
        const dateA = new Date(categories[a][0].timestamp);
        const dateB = new Date(categories[b][0].timestamp);
        return dateB.getTime() - dateA.getTime();
      });

    const categoryOrder = [...staticOrder, ...monthCategories].filter(name => categories[name] && categories[name].length > 0);
    
    return { categories, categoryOrder };
}, [sessionsByGroupId, t, language]);


  const handleDragStart = (e: React.DragEvent, sessionId: string) => { e.dataTransfer.setData('sessionId', sessionId); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = (e: React.DragEvent, groupId: string | null) => {
    e.preventDefault();
    const sessionId = e.dataTransfer.getData('sessionId');
    const targetGroupId = groupId === 'all-conversations' ? null : groupId;
    if (sessionId) onMoveSessionToGroup(sessionId, targetGroupId);
    setDragOverId(null);
  };

  const ungroupedSessions = sessionsByGroupId.get(null) || [];
  const pinnedUngrouped = ungroupedSessions.filter(s => s.isPinned);
  const { categories, categoryOrder } = categorizedUngroupedSessions;

  const sessionItemSharedProps = {
    activeSessionId, editingSession, activeMenu, loadingSessionIds,
    generatingTitleSessionIds, newlyTitledSessionId, editInputRef, menuRef,
    onSelectSession, onTogglePinSession, onDeleteSession, onOpenExportModal,
    handleStartEdit: (item: SavedChatSession) => handleStartEdit('session', item),
    handleRenameConfirm, handleRenameKeyDown, setEditingSession, toggleMenu, setActiveMenu, handleDragStart, t
  };

  return (
    <aside
      className={`h-full flex flex-col ${themeId === 'onyx' ? 'bg-[var(--theme-bg-primary)]' : 'bg-[var(--theme-bg-secondary)]'} shadow-lg flex-shrink-0
                 transition-all duration-300 ease-in-out
                 absolute md:static top-0 left-0 z-30
                 transform md:transform-none
                 w-64 md:w-72
                 ${isOpen ? 'translate-x-0 md:ml-0' : '-translate-x-full md:-ml-72'}
                 ${isOpen ? 'border-r border-[var(--theme-border-primary)]' : ''}`}
      role="complementary" aria-label={t('history_title')}
    >
      <SidebarHeader isOpen={isOpen} onToggle={onToggle} t={t} />
      <SidebarActions 
        onNewChat={onNewChat}
        onAddNewGroup={onAddNewGroup}
        isSearching={isSearching}
        setIsSearching={setIsSearching}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        t={t}
      />
      <div className="flex-grow overflow-y-auto custom-scrollbar p-2">
        {sessions.length === 0 && !searchQuery ? (
          <p className="p-4 text-xs sm:text-sm text-center text-[var(--theme-text-tertiary)]">{t('history_empty')}</p>
        ) : (
          <div onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, 'all-conversations')} onDragEnter={() => setDragOverId('all-conversations')} onDragLeave={() => setDragOverId(null)} className={`rounded-lg transition-colors ${dragOverId === 'all-conversations' ? 'bg-[var(--theme-bg-accent)] bg-opacity-20' : ''}`}>
            {sortedGroups.map(group => (
              <GroupItem 
                key={group.id}
                group={group}
                sessions={sessionsByGroupId.get(group.id) || []}
                editingGroup={editingGroup}
                dragOverId={dragOverId}
                onToggleGroupExpansion={onToggleGroupExpansion}
                handleGroupStartEdit={(item) => handleStartEdit('group', item)}
                handleDrop={handleDrop}
                handleDragOver={handleDragOver}
                setDragOverId={setDragOverId}
                setEditingGroup={setEditingGroup}
                onDeleteGroup={onDeleteGroup}
                {...sessionItemSharedProps}
              />
            ))}
            
            {pinnedUngrouped.length > 0 && (
                <div>
                    <div className="px-3 pt-4 pb-1 text-sm font-medium text-[var(--theme-text-primary)]">{t('history_pinned')}</div>
                    <ul>
                        {pinnedUngrouped.map(session => <SessionItem key={session.id} session={session} {...sessionItemSharedProps} />)}
                    </ul>
                </div>
            )}
            
            {categoryOrder.map(categoryName => (
                <div key={categoryName}>
                    <div className="px-3 pt-4 pb-1 text-sm font-medium text-[var(--theme-text-primary)]">{categoryName}</div>
                    <ul>
                        {categories[categoryName].map(session => <SessionItem key={session.id} session={session} {...sessionItemSharedProps} />)}
                    </ul>
                </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};
