
import React from 'react';
import { SavedChatSession, ChatGroup, ThemeColors } from '../../types';
import { translations } from '../../utils/appUtils';
import { SidebarHeader } from './SidebarHeader';
import { SidebarActions } from './SidebarActions';
import { SessionItem } from './SessionItem';
import { GroupItem } from './GroupItem';
import { Search, Settings } from 'lucide-react';
import { IconNewChat, IconSidebarToggle } from '../icons/CustomIcons';
import { useHistorySidebarLogic } from '../../hooks/useHistorySidebarLogic';

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
    generatingTitleSessionIds, onOpenExportModal, onAddNewGroup,
    onDeleteGroup, onToggleGroupExpansion, themeId, t, 
    onNewChat, onDeleteSession, onTogglePinSession, onDuplicateSession, 
    onOpenSettingsModal
  } = props;

  const {
    searchQuery, setSearchQuery,
    isSearching, setIsSearching,
    editingItem, setEditingItem,
    activeMenu, setActiveMenu,
    dragOverId, setDragOverId,
    newlyTitledSessionId,
    menuRef, editInputRef,
    sessionsByGroupId,
    sortedGroups,
    categorizedUngroupedSessions,
    handleStartEdit,
    handleRenameConfirm,
    handleRenameKeyDown,
    toggleMenu,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleMainDragLeave,
    handleMiniSearchClick,
    handleEmptySpaceClick,
    handleSessionSelect,
  } = useHistorySidebarLogic(props);

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
