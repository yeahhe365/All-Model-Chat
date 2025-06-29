import React from 'react';
import { SavedChatSession } from '../types';
import { FilePlus2, Trash2, MessageSquare, X } from 'lucide-react';
import { formatTimestamp, translations } from '../utils/appUtils';

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
  language
}) => {
  const headingIconSize = window.innerWidth < 640 ? 18 : 20;
  const newChatIconSize = window.innerWidth < 640 ? 16 : 18;
  const deleteIconSize = window.innerWidth < 640 ? 12 : 14;

  return (
    <aside
        className={`
          h-full flex flex-col 
          w-60 bg-[var(--theme-bg-secondary)] 
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
      <div className="p-2 sm:p-3 border-b border-[var(--theme-border-secondary)] flex justify-between items-center flex-shrink-0">
        <h2 className="text-base sm:text-lg font-semibold text-[var(--theme-text-link)] flex items-center">
          <MessageSquare size={headingIconSize} className="mr-1.5 sm:mr-2 opacity-80" />
          {t('history_title')}
        </h2>
        <button
          onClick={onToggle}
          className="p-1 sm:p-1.5 text-[var(--theme-icon-history)] hover:bg-[var(--theme-bg-tertiary)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--theme-border-focus)]"
          aria-label={t('historySidebarClose')}
          title={t('historySidebarClose_short')}
        >
          <X size={headingIconSize} />
        </button>
      </div>

      <button
        onClick={onNewChat}
        className="flex items-center gap-1.5 sm:gap-2 w-full text-left p-2.5 text-xs sm:text-sm text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] focus:bg-[var(--theme-bg-accent)] focus:text-[var(--theme-text-accent)] focus:outline-none transition-colors border-b border-[var(--theme-border-secondary)]"
        aria-label={t('headerNewChat_aria')}
      >
        <FilePlus2 size={newChatIconSize} />
        <span>{t('headerNewChat')}</span>
      </button>

      <div className="flex-grow overflow-y-auto custom-scrollbar">
        {sessions.length === 0 ? (
          <p className="p-3 sm:p-4 text-xs sm:text-sm text-center text-[var(--theme-text-tertiary)]">{t('history_empty')}</p>
        ) : (
          <ul className="py-1.5 sm:py-2">
            {sessions.map((session) => (
              <li key={session.id}>
                <button
                  onClick={() => onSelectSession(session.id)}
                  className={`w-full text-left px-2.5 py-2 text-xs group focus:outline-none transition-colors
                    ${session.id === activeSessionId 
                      ? 'bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)]' 
                      : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-primary)]'
                    }`
                  }
                  aria-current={session.id === activeSessionId ? "page" : undefined}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium truncate block flex-grow pr-1.5 sm:pr-2" title={session.title}>
                      {session.title}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent selecting the session
                        onDeleteSession(session.id);
                      }}
                      className={`p-0.5 sm:p-1 rounded-full text-[var(--theme-text-tertiary)] opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity
                        ${session.id === activeSessionId ? 'hover:bg-white/20' : 'hover:bg-[var(--theme-bg-input)]'}
                      `}
                      aria-label={t('history_delete_aria').replace('{title}', session.title)}
                      title={t('history_delete_title')}
                    >
                      <Trash2 size={deleteIconSize} />
                    </button>
                  </div>
                  <div className={`text-xs mt-0.5 ${session.id === activeSessionId ? 'text-white/80' : 'text-[var(--theme-text-tertiary)]'}`}>
                    {formatTimestamp(session.timestamp, language)}
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
