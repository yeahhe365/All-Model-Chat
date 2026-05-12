import React from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { type SavedChatSession, type ChatGroup } from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import { SidebarHeader } from './SidebarHeader';
import { SidebarActions } from './SidebarActions';
import { SessionItem } from './SessionItem';
import { GroupItem, type SessionItemPassedProps } from './GroupItem';
import { CollapsedRecentChatsButton } from './CollapsedRecentChatsButton';
import { Search, Settings } from 'lucide-react';
import { IconNewChat, IconSidebarToggle } from '@/components/icons/CustomIcons';
import { useHistorySidebarLogic } from '@/hooks/useHistorySidebarLogic';

interface HistorySidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onAutoClose: () => void;
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
  onOpenExportModal: (sessionId?: string) => void | Promise<void>;
  onAddNewGroup: () => void;
  onDeleteGroup: (groupId: string) => void;
  onRenameGroup: (groupId: string, newTitle: string) => void;
  onMoveSessionToGroup: (sessionId: string, groupId: string | null) => void;
  onToggleGroupExpansion: (groupId: string) => void;
  onOpenSettingsModal: () => void;
  themeId: string;
  newChatShortcut: string;
  searchChatsShortcut: string;
}

const MiniSidebarButton = ({
  onClick,
  icon: Icon,
  title,
  href,
}: {
  onClick: () => void;
  icon: React.ElementType;
  title: string;
  href?: string;
}) => {
  if (href) {
    return (
      <a
        href={href}
        onClick={(e) => {
          if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            onClick();
          }
        }}
        className="flex items-center justify-center p-2.5 rounded-xl text-[var(--theme-icon-history)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors focus:outline-none focus:visible:ring-2 focus:visible:ring-[var(--theme-border-focus)] no-underline cursor-pointer"
        title={title}
        aria-label={title}
      >
        <Icon size={20} strokeWidth={2} />
      </a>
    );
  }
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="flex items-center justify-center p-2.5 rounded-xl text-[var(--theme-icon-history)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors focus:outline-none focus:visible:ring-2 focus:visible:ring-[var(--theme-border-focus)] cursor-pointer"
      title={title}
      aria-label={title}
    >
      <Icon size={20} strokeWidth={2} />
    </button>
  );
};

// Internal component to handle auto-animate for a list of sessions in a category
const SessionListGroup = ({
  title,
  sessions,
  sessionItemProps,
}: {
  title: string;
  sessions: SavedChatSession[];
  sessionItemProps: SessionItemPassedProps;
}) => {
  const [parent] = useAutoAnimate<HTMLUListElement>({ duration: 200 });
  return (
    <div>
      <div className="px-3 pt-4 pb-1 text-sm font-medium text-[var(--theme-text-primary)]">{title}</div>
      <ul ref={parent}>
        {sessions.map((session) => (
          <SessionItem key={session.id} session={session} {...sessionItemProps} />
        ))}
      </ul>
    </div>
  );
};

export const HistorySidebar: React.FC<HistorySidebarProps> = (props) => {
  const { t } = useI18n();
  const {
    isOpen,
    onToggle,
    onAutoClose,
    sessions,
    groups,
    activeSessionId,
    loadingSessionIds,
    generatingTitleSessionIds,
    onOpenExportModal,
    onAddNewGroup,
    onDeleteGroup,
    onToggleGroupExpansion,
    themeId,
    onNewChat,
    onDeleteSession,
    onTogglePinSession,
    onDuplicateSession,
    onOpenSettingsModal,
    onRenameSession,
    onRenameGroup,
    onMoveSessionToGroup,
    onSelectSession,
    newChatShortcut,
    searchChatsShortcut,
  } = props;

  const {
    searchQuery,
    setSearchQuery,
    isSearching,
    setIsSearching,
    editingItem,
    setEditingItem,
    activeMenu,
    setActiveMenu,
    dragOverId,
    setDragOverId,
    newlyTitledSessionId,
    menuRef,
    editInputRef,
    searchInputRef,
    sessionsByGroupId,
    sortedGroups,
    categorizedUngroupedSessions,
    handleStartEdit,
    handleRenameConfirm,
    handleRenameKeyDown,
    toggleMenu,
    handleDragOver,
    handleDrop,
    handleMainDragLeave,
    handleMiniSearchClick,
    handleEmptySpaceClick,
    handleSessionSelect,
  } = useHistorySidebarLogic({
    isOpen,
    onToggle,
    onAutoClose,
    sessions,
    groups,
    generatingTitleSessionIds,
    onRenameSession,
    onRenameGroup,
    onMoveSessionToGroup,
    onSelectSession,
  });

  const ungroupedSessions = sessionsByGroupId.get(null) || [];
  const pinnedUngrouped = ungroupedSessions.filter((s) => s.isPinned);
  const { categories, categoryOrder } = categorizedUngroupedSessions;

  const sessionItemSharedProps = {
    activeSessionId,
    editingItem,
    activeMenu,
    loadingSessionIds,
    generatingTitleSessionIds,
    newlyTitledSessionId,
    editInputRef,
    menuRef,
    onSelectSession: handleSessionSelect,
    onTogglePinSession,
    onDeleteSession,
    onDuplicateSession,
    onOpenExportModal,
    handleStartEdit: (item: SavedChatSession) => handleStartEdit('session', item),
    handleRenameConfirm,
    handleRenameKeyDown,
    setEditingItem,
    toggleMenu,
    setActiveMenu,
  };

  const [listParentRef] = useAutoAnimate<HTMLDivElement>({ duration: 200 });
  const searchTitle = t('history_search_button') + (searchChatsShortcut ? ` (${searchChatsShortcut})` : '');

  return (
    <aside
      data-history-sidebar-root="true"
      className={`h-full flex flex-col ${themeId === 'onyx' ? 'bg-[var(--theme-bg-primary)]' : 'bg-[var(--theme-bg-secondary)]'} flex-shrink-0
                 transition-transform duration-300 ease-[cubic-bezier(0.19,1,0.22,1)] md:transition-[width] transform-gpu
                 absolute md:static top-0 left-0 z-50
                 overflow-hidden
                 ${isOpen ? 'w-64 md:w-[16.2rem] translate-x-0' : 'w-64 md:w-[52.2px] -translate-x-full md:translate-x-0'}
                 
                 border-r border-[var(--theme-border-primary)]`}
      role="complementary"
      aria-label={t('history_title')}
    >
      <div
        aria-hidden={!isOpen}
        className={`w-64 md:w-[16.2rem] h-full flex flex-col shrink-0 min-w-[16rem] md:min-w-[16.2rem] md:absolute md:inset-0 transition-opacity duration-200 ${
          isOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-100 pointer-events-auto md:opacity-0 md:pointer-events-none'
        }`}
      >
        <SidebarHeader isOpen={isOpen} onToggle={onToggle} themeId={themeId} />
        <SidebarActions
          onNewChat={onNewChat}
          onCloseSidebar={onAutoClose}
          onAddNewGroup={onAddNewGroup}
          isSearching={isSearching}
          setIsSearching={setIsSearching}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchInputRef={searchInputRef}
          newChatShortcut={newChatShortcut}
        />
        <div
          className="flex-grow overflow-y-auto custom-scrollbar p-2 cursor-ew-resize"
          onClick={handleEmptySpaceClick}
        >
          {sessions.length === 0 && !searchQuery ? (
            <p className="p-4 text-xs sm:text-sm text-center text-[var(--theme-text-tertiary)] cursor-auto">
              {t('history_empty')}
            </p>
          ) : (
            <div
              ref={listParentRef}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'all-conversations')}
              onDragEnter={() => setDragOverId('all-conversations')}
              onDragLeave={handleMainDragLeave}
              className={`rounded-lg transition-colors min-h-[50px] cursor-auto ${dragOverId === 'all-conversations' ? 'bg-[var(--theme-bg-accent)] bg-opacity-10 ring-2 ring-[var(--theme-bg-accent)] ring-inset ring-opacity-50' : ''}`}
            >
              {sortedGroups.map((group) => (
                <GroupItem
                  key={group.id}
                  group={group}
                  sessions={sessionsByGroupId.get(group.id) || []}
                  dragOverId={dragOverId}
                  onToggleGroupExpansion={onToggleGroupExpansion}
                  handleGroupStartEdit={(item) => handleStartEdit('group', item)}
                  handleDrop={handleDrop}
                  handleDragOver={handleDragOver}
                  setDragOverId={setDragOverId}
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

              {categoryOrder.map((categoryName) => (
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
            <Settings
              size={20}
              strokeWidth={2}
              className="text-[var(--theme-icon-settings)] group-hover:text-[var(--theme-text-primary)] transition-colors"
            />
            <span>{t('settingsTitle')}</span>
          </button>
        </div>
      </div>

      <div
        aria-hidden={isOpen}
        className={`hidden md:flex absolute inset-0 flex-col items-center py-4 h-full gap-[0.56rem] w-full min-w-[52.2px] cursor-ew-resize hover:bg-[var(--theme-bg-tertiary)]/30 transition-colors transition-opacity duration-200 ${
          isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
        }`}
        onClick={onToggle}
      >
        <MiniSidebarButton onClick={onToggle} icon={IconSidebarToggle} title={t('historySidebarOpen')} />

        <div className="w-8 h-px bg-[var(--theme-border-primary)] my-1"></div>

        <MiniSidebarButton
          href="/"
          onClick={onNewChat}
          icon={IconNewChat}
          title={t('newChat') + (newChatShortcut ? ` (${newChatShortcut})` : '')}
        />
        <MiniSidebarButton onClick={handleMiniSearchClick} icon={Search} title={searchTitle} />
        <CollapsedRecentChatsButton
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={handleSessionSelect}
        />

        <div className="mt-auto">
          <MiniSidebarButton onClick={onOpenSettingsModal} icon={Settings} title={t('settingsTitle')} />
        </div>
      </div>
    </aside>
  );
};
