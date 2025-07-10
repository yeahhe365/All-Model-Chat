import React, { useState } from 'react';
import { SavedChatSession } from '../types';
import { Edit3, Trash2, X, Search, Menu } from 'lucide-react';
import { translations } from '../utils/appUtils';

interface HistorySidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  sessions: SavedChatSession[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  onDeleteSession: (sessionId: string) => void;
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
  t: (key: keyof typeof translations) => string;
  language: 'en' | 'zh';
  isLoading: boolean;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  isOpen,
  onToggle,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  themeColors,
  t,
  language,
  isLoading,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const deleteIconSize = window.innerWidth < 640 ? 12 : 14;

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

  return (
    <aside
        className={`
          h-full flex flex-col 
          w-64 bg-[var(--theme-bg-secondary)] 
          shadow-lg ease-in-out duration-300
          
          absolute top-0 left-0 z-30 transition-transform transform 
          sm:relative sm:transform-none sm:top-auto sm:left-auto sm:z-auto sm:transition-all
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}

          sm:w-64 md:w-72 sm:flex-shrink-0
          ${isOpen ? 'sm:ml-0' : 'sm:-ml-64 md:-ml-72'}
          
          ${isOpen ? 'border-r border-[var(--theme-border-primary)]' : 'sm:border-r-0'}
        `}
        role="complementary"
        aria-label={t('history_title')}
        aria-hidden={!isOpen}
    >
      <div className="p-2 sm:p-3 flex items-center flex-shrink-0 h-[60px] border-b border-[var(--theme-border-primary)]">
        {isSearching ? (
            <div className="w-full flex items-center gap-2">
                <Search size={20} className="text-[var(--theme-text-tertiary)] flex-shrink-0" />
                <input
                    type="text"
                    placeholder={t('history_search_placeholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent border-0 rounded-md py-1.5 text-sm focus:ring-0 outline-none text-[var(--theme-text-primary)] placeholder:text-[var(--theme-text-tertiary)] transition-colors"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Escape') setIsSearching(false); }}
                />
                <button
                    onClick={() => {
                        setIsSearching(false);
                        setSearchQuery('');
                    }}
                    className="p-1.5 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] rounded-md"
                    aria-label={t('history_search_clear_aria')}
                >
                    <X size={20} />
                </button>
            </div>
        ) : (
            <div className="w-full flex justify-between items-center">
                <button
                    onClick={onToggle}
                    className="p-2 text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] rounded-md"
                    aria-label={isOpen ? t('historySidebarClose') : t('historySidebarOpen')}
                >
                    <Menu size={20} />
                </button>
                <button
                    onClick={() => setIsSearching(true)}
                    className="p-2 text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] rounded-md"
                    aria-label={t('history_search_aria')}
                >
                    <Search size={20} />
                </button>
            </div>
        )}
      </div>
      
      <div className="px-3 pt-3">
        <button
          onClick={onNewChat}
          className="flex items-center gap-3 w-full text-left px-3 py-2 text-sm text-[var(--theme-text-secondary)] font-medium bg-[var(--theme-bg-primary)] border border-[var(--theme-border-secondary)] rounded-lg hover:bg-[var(--theme-bg-tertiary)] hover:border-[var(--theme-border-focus)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--theme-border-focus)] shadow-sm transition-all"
          aria-label={t('headerNewChat_aria')}
        >
          <Edit3 size={18} />
          <span>{t('headerNewChat')}</span>
        </button>
      </div>

      <div className="px-4 pt-4 pb-2">
        <h3 className="text-xs font-semibold text-[var(--theme-text-tertiary)] tracking-wider uppercase">{t('history_recent_chats')}</h3>
      </div>

      <div className="flex-grow overflow-y-auto custom-scrollbar">
        {sessions.length === 0 && !searchQuery ? (
          <p className="p-4 text-xs sm:text-sm text-center text-[var(--theme-text-tertiary)]">{t('history_empty')}</p>
        ) : filteredSessions.length === 0 ? (
            <p className="p-4 text-xs sm:text-sm text-center text-[var(--theme-text-tertiary)]">{t('history_search_no_results')}</p>
        ) : (
          <ul className="py-1 px-2">
            {filteredSessions.map((session) => (
              <li key={session.id}>
                <button
                  onClick={() => onSelectSession(session.id)}
                  className={`w-full text-left px-3 py-2 text-sm group transition-colors focus:outline-none rounded-lg my-0.5
                    ${session.id === activeSessionId 
                      ? 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)]' 
                      : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-primary)]'
                    }`
                  }
                  aria-current={session.id === activeSessionId ? "page" : undefined}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium truncate block flex-grow pr-2" title={session.title}>
                      {session.title}
                    </span>
                    {isLoading && session.id === activeSessionId ? (
                        <div className="loading-dots-container">
                            <div className="loading-dot"></div>
                            <div className="loading-dot"></div>
                            <div className="loading-dot"></div>
                        </div>
                    ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent selecting the session
                            onDeleteSession(session.id);
                          }}
                          className={`p-1 rounded-full text-[var(--theme-text-tertiary)] opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-inset
                            ${session.id === activeSessionId ? 'hover:bg-black/10 dark:hover:bg-white/10 focus:ring-white/50' : 'hover:bg-[var(--theme-bg-input)] focus:ring-[var(--theme-border-focus)]'}
                          `}
                          aria-label={t('history_delete_aria').replace('{title}', session.title)}
                          title={t('history_delete_title')}
                        >
                          <Trash2 size={deleteIconSize} />
                        </button>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
};