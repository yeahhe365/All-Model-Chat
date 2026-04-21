import React from 'react';
import { Search, X } from 'lucide-react';
import { translations } from '../../utils/appUtils';
import { IconNewChat, IconNewGroup } from '../icons/CustomIcons';

interface SidebarActionsProps {
  onNewChat: () => void;
  onCloseSidebar?: () => void;
  onAddNewGroup: () => void;
  isSearching: boolean;
  searchQuery: string;
  setIsSearching: (isSearching: boolean) => void;
  setSearchQuery: (query: string) => void;
  t: (key: keyof typeof translations, fallback?: string) => string;
  newChatShortcut?: string;
}

export const SidebarActions: React.FC<SidebarActionsProps> = ({
  onNewChat,
  onCloseSidebar,
  onAddNewGroup,
  isSearching,
  searchQuery,
  setIsSearching,
  setSearchQuery,
  t,
  newChatShortcut,
}) => {
  const closeSearch = () => {
    setIsSearching(false);
    setSearchQuery('');
  };

  const handleNewChatClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      e.preventDefault();
      onNewChat();
      if (window.innerWidth < 768) {
        onCloseSidebar?.();
      }
    }
  };

  return (
    <div className="px-2 pt-2 space-y-1" data-testid="sidebar-actions-stack">
      <div>
        <a
          href="/"
          onClick={handleNewChatClick}
          className="flex-grow flex items-center gap-3 w-full text-left px-3 h-9 text-sm bg-transparent border border-transparent rounded-lg hover:bg-[var(--theme-bg-tertiary)] hover:border-[var(--theme-border-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--theme-border-focus)] transition-colors no-underline"
          aria-label={t('headerNewChat_aria')}
          title={t('newChat') + (newChatShortcut ? ` (${newChatShortcut})` : '')}
        >
          <IconNewChat size={18} className="text-[var(--theme-icon-history)]" strokeWidth={2} />
          <span className="text-[var(--theme-text-primary)]">{t('newChat')}</span>
        </a>
      </div>
      <div>
        {isSearching ? (
          <div className="flex items-center gap-2 w-full text-left px-3 h-9 text-sm bg-[var(--theme-bg-primary)] border border-[var(--theme-border-focus)] rounded-lg shadow-sm transition-all duration-200">
            <Search size={18} className="text-[var(--theme-icon-history)] flex-shrink-0" strokeWidth={2} />
            <input
              type="text"
              placeholder={t('history_search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-0 h-full py-0 text-sm focus:ring-0 outline-none text-[var(--theme-text-primary)] placeholder:text-[var(--theme-text-tertiary)]"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Escape') closeSearch();
              }}
            />
            <button
              onClick={closeSearch}
              className="h-6 w-6 flex items-center justify-center text-[var(--theme-icon-history)] hover:text-[var(--theme-text-primary)] rounded-md hover:bg-[var(--theme-bg-tertiary)]"
              aria-label={t('history_search_clear_aria')}
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsSearching(true)}
            className="flex items-center gap-3 w-full text-left px-3 h-9 text-sm bg-transparent border border-transparent rounded-lg hover:bg-[var(--theme-bg-tertiary)] hover:border-[var(--theme-border-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--theme-border-focus)] transition-colors"
            aria-label={t('history_search_aria')}
          >
            <Search size={18} className="text-[var(--theme-icon-history)]" strokeWidth={2} />
            <span className="text-[var(--theme-text-primary)]">{t('history_search_button')}</span>
          </button>
        )}
      </div>
      <div>
        <button
          onClick={onAddNewGroup}
          className="flex items-center gap-3 w-full text-left px-3 h-9 text-sm bg-transparent border border-transparent rounded-lg hover:bg-[var(--theme-bg-tertiary)] hover:border-[var(--theme-border-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--theme-border-focus)] transition-colors"
          aria-label={t('newGroup_aria', 'Create new group')}
          title={t('newGroup_button', 'New Group')}
        >
          <IconNewGroup size={18} className="text-[var(--theme-icon-history)]" strokeWidth={2} />
          <span className="text-[var(--theme-text-primary)]">{t('newGroup_button', 'New Group')}</span>
        </button>
      </div>
    </div>
  );
};
