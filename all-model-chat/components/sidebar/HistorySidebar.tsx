
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SavedChatSession, ChatGroup, ThemeColors } from '../../types';
import { translations } from '../../utils/appUtils';
import { SidebarHeader } from './SidebarHeader';
import { SidebarActions } from './SidebarActions';
import { SessionItem } from './SessionItem';
import { GroupItem } from './GroupItem';
import { Search, Settings } from 'lucide-react';
import { IconNewChat, IconSidebarToggle } from '../icons/CustomIcons';
import { useWindowContext } from '../../contexts/WindowContext';

export interface HistorySidebarProps {
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
  onDuplicateSession: (sessionId: string) => void;
  onOpenExportModal: () => void;
  onAddNewGroup: () => void;
  onDeleteGroup: (groupId: string) => void;
  onRenameGroup: (groupId: string, newTitle: string) => void;
  onMoveSessionToGroup: (sessionId: string, groupId: string | null) => void;
  onToggleGroupExpansion: (groupId: string) => void;
  onOpenSettingsModal: () => void;
  onOpenScenariosModal: () => void;
  themeColors: ThemeColors;
  t: (key: keyof typeof translations, fallback?: string) => string;
  language: 'en' | 'zh';
  themeId: string;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = (props) => {
  const { 
    isOpen, onToggle, sessions, groups, activeSessionId, loadingSessionIds,
    generatingTitleSessionIds, onSelectSession, onOpenExportModal, onAddNewGroup,
    onDeleteGroup, onRenameGroup, onMoveSessionToGroup, onToggleGroupExpansion,
    themeId, t, language, onNewChat, onDeleteSession, onRenameSession, onTogglePinSession,
    onDuplicateSession, onOpenSettingsModal, onOpenScenariosModal
  } = props;

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [editingItem, setEditingItem] = useState<{ type: 'session' | 'group', id: string, title: string } | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const [newlyTitledSessionId, setNewlyTitledSessionId] = useState<string | null>(null);
  const prevGeneratingTitleSessionIdsRef = useRef<Set<string>>(new Set());
  
  const { document: targetDocument } = useWindowContext();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setActiveMenu(null);
    };
    if (activeMenu) targetDocument.addEventListener('mousedown', handleClickOutside);
    return () => targetDocument.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenu, targetDocument]);

  useEffect(() => {
    if (editingItem) editInputRef.current?.focus();
  }, [editingItem]);
  
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
    const title = 'title' in item ? item.title : '';
    setEditingItem({ type, id: item.id, title });
    setActiveMenu(null);
  };

  const handleRenameConfirm = () => {
    if (!editingItem || !editingItem.title.trim()) {
        setEditingItem(null);
        return;
    }
    if (editingItem.type === 'session') {
        onRenameSession(editingItem.id, editingItem.title.trim());
    } else if (editingItem.type === 'group') {
        onRenameGroup(editingItem.id, editingItem.title.trim());
    }
    setEditingItem(null);
  };
  
  const handleRenameCancel = () => { setEditingItem(null); };

  const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleRenameConfirm();
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


  const handleDragStart = (e: React.DragEvent, sessionId: string) => { 
      e.dataTransfer.setData('sessionId', sessionId);
      e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDragOver = (e: React.DragEvent) => { 
      e.preventDefault(); 
      e.dataTransfer.dropEffect = 'move';
  };
  
  const handleDrop = (e: React.DragEvent, groupId: string | null) => {
    e.preventDefault();
    e.stopPropagation(); // Stop bubbling to prevent double drops
    const sessionId = e.dataTransfer.getData('sessionId');
    const targetGroupId = groupId === 'all-conversations' ? null : groupId;
    if (sessionId) onMoveSessionToGroup(sessionId, targetGroupId);
    setDragOverId(null);
  };

  const handleMainDragLeave = (e: React.DragEvent) => {
      // Only reset if leaving the main container, not entering a child
      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
      setDragOverId(null);
  };

  const handleMiniSearchClick = () => {
      onToggle();
      setIsSearching(true);
  };

  const handleEmptySpaceClick = (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
          onToggle();
      }
  };

  const handleSessionSelect = (sessionId: string) => {
      onSelectSession(sessionId);
      // Auto-close sidebar on mobile
      if (window.innerWidth < 768) {
          onToggle();
      }
  };

  const ungroupedSessions = sessionsByGroupId.get(null) || [];
  const pinnedUngrouped = ungroupedSessions.filter(s => s.isPinned);
  const { categories, categoryOrder } = categorizedUngroupedSessions;

  const sessionItemSharedProps = {
    activeSessionId, editingItem, activeMenu, loadingSessionIds,
    generatingTitleSessionIds, newlyTitledSessionId, editInputRef, menuRef,
    onSelectSession: handleSessionSelect, onTogglePinSession, onDeleteSession, onDuplicateSession, onOpenExportModal,
    handleStartEdit: (item: SavedChatSession) => handleStartEdit('session', item),
    handleRenameConfirm, handleRenameKeyDown, setEditingItem, toggleMenu, setActiveMenu, handleDragStart, t
  };

  const MiniSidebarButton = ({ onClick, icon: Icon, title }: { onClick: () => void, icon: React.ElementType, title: string }) => (
      <button 
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="p-2.5 rounded-xl text-[var(--theme-icon-history)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors focus:outline-none focus:visible:ring-2 focus:visible:ring-[var(--theme-border-focus)]"
          title={title}
          aria-label={title}
      >
          <Icon size={20} strokeWidth={2} />
      </button>
  );

  return (
    <aside
      className={`h-full flex flex-col ${themeId === 'onyx' ? 'bg-[var(--theme-bg-primary)]' : 'bg-[var(--theme-bg-secondary)]'} flex-shrink-0
                 transition-all duration-300 ease-[cubic-bezier(0.19,1,0.22,1)]
                 absolute md:static top-0 left-0 z-50
                 overflow-hidden
                 ${isOpen ? 'w-64 md:w-72 translate-x-0' : 'w-64 md:w-[68px] -translate-x-full md:translate-x-0'}
                 
                 border-r border-[var(--theme-border-primary)]`}
      role="complementary" aria-label={t('history_title')}
    >
      {isOpen ? (
        <div className="w-64 md:w-72 h-full flex flex-col min-w-[16rem] md:min-w-[18rem]">
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
            <div 
                className="flex-grow overflow-y-auto custom-scrollbar p-2"
                onClick={handleEmptySpaceClick}
            >
                {sessions.length === 0 && !searchQuery ? (
                <p className="p-4 text-xs sm:text-sm text-center text-[var(--theme-text-tertiary)]">{t('history_empty')}</p>
                ) : (
                <div 
                    onDragOver={handleDragOver} 
                    onDrop={(e) => handleDrop(e, 'all-conversations')} 
                    onDragEnter={() => setDragOverId('all-conversations')} 
                    onDragLeave={handleMainDragLeave} 
                    className={`rounded-lg transition-colors min-h-[50px] ${dragOverId === 'all-conversations' ? 'bg-[var(--theme-bg-accent)] bg-opacity-10 ring-2 ring-[var(--theme-bg-accent)] ring-inset ring-opacity-50' : ''}`}
                >
                    {sortedGroups.map(group => (
                    <GroupItem 
                        key={group.id}
                        group={group}
                        sessions={sessionsByGroupId.get(group.id) || []}
                        editingItem={editingItem}
                        dragOverId={dragOverId}
                        onToggleGroupExpansion={onToggleGroupExpansion}
                        handleGroupStartEdit={(item) => handleStartEdit('group', item)}
                        handleDrop={handleDrop}
                        handleDragOver={handleDragOver}
                        setDragOverId={setDragOverId}
                        setEditingItem={setEditingItem}
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
            
            <div className="p-3 bg-[var(--theme-bg-secondary)]/30">
                 <button
                    onClick={onOpenSettingsModal}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded-xl transition-all duration-200 group"
                 >
                    <Settings size={20} strokeWidth={2} className="text-[var(--theme-icon-settings)] group-hover:text-[var(--theme-text-primary)] transition-colors" />
                    <span>{t('settingsTitle')}</span>
                 </button>
            </div>
        </div>
      ) : (
          <div 
            className="hidden md:flex flex-col items-center py-4 h-full gap-4 w-full min-w-[68px] cursor-pointer hover:bg-[var(--theme-bg-tertiary)]/30 transition-colors"
            onClick={onToggle}
          >
              <MiniSidebarButton onClick={onToggle} icon={IconSidebarToggle} title={t('historySidebarOpen')} />
              
              <div className="w-8 h-px bg-[var(--theme-border-primary)] my-1"></div>
              
              <MiniSidebarButton onClick={onNewChat} icon={IconNewChat} title={t('newChat')} />
              <MiniSidebarButton onClick={handleMiniSearchClick} icon={Search} title={t('history_search_button')} />
              
              <div className="mt-auto">
                  <MiniSidebarButton onClick={onOpenSettingsModal} icon={Settings} title={t('settingsTitle')} />
              </div>
          </div>
      )}
    </aside>
  );
};
