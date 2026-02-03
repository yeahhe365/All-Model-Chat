
import React from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { SavedChatSession, ChatGroup } from '../../types';
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
  t: (key: keyof typeof translations, fallback?: string) => string;
  language: 'en' | 'zh';
  themeId: string;
  newChatShortcut?: string;
}

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

// Internal component to handle auto-animate for a list of sessions in a category
const SessionListGroup = ({ 
    title, 
    sessions, 
    sessionItemProps 
}: { 
    title: string; 
    sessions: SavedChatSession[]; 
    sessionItemProps: any 
}) => {
    const [parent] = useAutoAnimate<HTMLUListElement>({ duration: 200 });
    return (
        <div>
            <div className="px-3 pt-4 pb-1 text-sm font-medium text-[var(--theme-text-primary)]">{title}</div>
            <ul ref={parent}>
                {sessions.map(session => (
                    <SessionItem key={session.id} session={session} {...sessionItemProps} />
                ))}
            </ul>
        </div>
    );
};

export const HistorySidebar: React.FC<HistorySidebarProps> = (props) => {
  const { 
    isOpen, onToggle, sessions, groups, activeSessionId, loadingSessionIds,
    generatingTitleSessionIds, onOpenExportModal, onAddNewGroup,
    onDeleteGroup, onToggleGroupExpansion, themeId, t, 
    onNewChat, onDeleteSession, onTogglePinSession, onDuplicateSession, 
    onOpenSettingsModal, newChatShortcut
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

  const [listParentRef] = useAutoAnimate<HTMLDivElement>({ duration: 200 });

  return (
    <aside
      className={`h-full flex flex-col ${themeId === 'onyx' ? 'bg-[var(--theme-bg-primary)]' : 'bg-[var(--theme-bg-secondary)]'} flex-shrink-0
                 transition-[width,transform] duration-300 ease-[cubic-bezier(0.19,1,0.22,1)] will-change-[width,transform] transform-gpu
                 absolute md:static top-0 left-0 z-50
                 overflow-hidden
                 ${isOpen ? 'w-64 md:w-72 translate-x-0' : 'w-64 md:w-[68px] -translate-x-full md:translate-x-0'}
                 
                 border-r border-[var(--theme-border-primary)]`}
      role="complementary" aria-label={t('history_title')}
    >
      {isOpen ? (
        // Fixed width container inside ensures text doesn't reflow/wrap weirdly during the collapse animation
        <div className="w-64 md:w-72 h-full flex flex-col shrink-0 min-w-[16rem] md:min-w-[18rem] opacity-100 transition-opacity duration-200">
            <SidebarHeader isOpen={isOpen} onToggle={onToggle} t={t} />
            <SidebarActions 
                onNewChat={onNewChat}
                onAddNewGroup={onAddNewGroup}
                isSearching={isSearching}
                setIsSearching={setIsSearching}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                t={t}
                newChatShortcut={newChatShortcut}
            />
            <div 
                className="flex-grow overflow-y-auto custom-scrollbar p-2"
                onClick={handleEmptySpaceClick}
            >
                {sessions.length === 0 && !searchQuery ? (
                <p className="p-4 text-xs sm:text-sm text-center text-[var(--theme-text-tertiary)]">{t('history_empty')}</p>
                ) : (
                <div 
                    ref={listParentRef}
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
                        <SessionListGroup 
                            title={t('history_pinned')} 
                            sessions={pinnedUngrouped} 
                            sessionItemProps={sessionItemSharedProps} 
                        />
                    )}
                    
                    {categoryOrder.map(categoryName => (
                        <SessionListGroup 
                            key={categoryName}
                            title={categoryName} 
                            sessions={categories[categoryName]} 
                            sessionItemProps={sessionItemSharedProps} 
                        />
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
            className="hidden md:flex flex-col items-center py-4 h-full gap-4 w-full min-w-[68px] cursor-pointer hover:bg-[var(--theme-bg-tertiary)]/30 transition-colors animate-in fade-in duration-200"
            onClick={onToggle}
          >
              <MiniSidebarButton onClick={onToggle} icon={IconSidebarToggle} title={t('historySidebarOpen')} />
              
              <div className="w-8 h-px bg-[var(--theme-border-primary)] my-1"></div>
              
              <MiniSidebarButton onClick={onNewChat} icon={IconNewChat} title={`${t('newChat')} ${newChatShortcut ? `(${newChatShortcut})` : ''}`} />
              <MiniSidebarButton onClick={handleMiniSearchClick} icon={Search} title={t('history_search_button')} />
              
              <div className="mt-auto">
                  <MiniSidebarButton onClick={onOpenSettingsModal} icon={Settings} title={t('settingsTitle')} />
              </div>
          </div>
      )}
    </aside>
  );
};