
import React from 'react';
import { FolderPlus, Search, X } from 'lucide-react';
import { translations } from '../../utils/appUtils';
import { IconNewChat } from '../icons/CustomIcons';

interface SidebarActionsProps {
  onNewChat: () => void;
  onAddNewGroup: () => void;
  isSearching: boolean;
  searchQuery: string;
  setIsSearching: (isSearching: boolean) => void;
  setSearchQuery: (query: string) => void;
  t: (key: keyof typeof translations) => string;
}

export const SidebarActions: React.FC<SidebarActionsProps> = ({ onNewChat, onAddNewGroup, isSearching, searchQuery, setIsSearching, setSearchQuery, t }) => (
  <>
    <div className="px-2 pt-3 flex items-center gap-2">
      <button onClick={onNewChat} className="flex-grow flex items-center gap-3 w-full text-left px-3 py-2 text-sm bg-transparent border border-transparent rounded-lg hover:bg-[var(--theme-bg-tertiary)] hover:border-[var(--theme-border-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--theme-border-focus)] transition-colors" aria-label={t('headerNewChat_aria')}>
        <IconNewChat size={18} className="text-[var(--theme-icon-history)]" strokeWidth={2} />
        <span className="text-[var(--theme-text-primary)]">{t('newChat')}</span>
      </button>
      <button onClick={onAddNewGroup} className="flex-shrink-0 p-2 text-[var(--theme-icon-history)] bg-transparent border border-transparent rounded-lg hover:bg-[var(--theme-bg-tertiary)] hover:border-[var(--theme-border-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--theme-border-focus)] transition-colors" title="New Group">
        <FolderPlus size={18} strokeWidth={2} />
      </button>
    </div>
    <div className="px-2 pt-2">
      {isSearching ? (
        <div className="flex items-center gap-2 w-full text-left px-3 py-1 text-sm bg-[var(--theme-bg-primary)] border border-[var(--theme-border-focus)] rounded-lg shadow-sm transition-all duration-200">
          <Search size={18} className="text-[var(--theme-icon-history)] flex-shrink-0" strokeWidth={2} />
          <input type="text" placeholder={t('history_search_placeholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-transparent border-0 rounded-md py-1 text-sm focus:ring-0 outline-none text-[var(--theme-text-primary)] placeholder:text-[var(--theme-text-tertiary)]" autoFocus onKeyDown={(e) => { if (e.key === 'Escape') setIsSearching(false); }} />
          <button onClick={() => { setIsSearching(false); setSearchQuery(''); }} className="p-1.5 text-[var(--theme-icon-history)] hover:text-[var(--theme-text-primary)] rounded-md" aria-label={t('history_search_clear_aria')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>
      ) : (
        <button onClick={() => setIsSearching(true)} className="flex items-center gap-3 w-full text-left px-3 py-2 text-sm bg-transparent border border-transparent rounded-lg hover:bg-[var(--theme-bg-tertiary)] hover:border-[var(--theme-border-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--theme-border-focus)] transition-colors" aria-label={t('history_search_aria')}>
          <Search size={18} className="text-[var(--theme-icon-history)]" strokeWidth={2} />
          <span className="text-[var(--theme-text-primary)]">{t('history_search_button', 'Search')}</span>
        </button>
      )}
    </div>
  </>
);
