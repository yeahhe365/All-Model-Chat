

import React from 'react';
import { SavedChatSession } from '../types';
import { FilePlus2, Trash2, MessageSquare, X } from 'lucide-react';

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
}

const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000);
  const diffMinutes = Math.round(diffSeconds / 60);
  const diffHours = Math.round(diffMinutes / 60);
  const diffDays = Math.round(diffHours / 24);

  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};


export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  isOpen,
  onToggle,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  themeColors,
}) => {
  if (!isOpen) return null;
  const headingIconSize = window.innerWidth < 640 ? 18 : 20;
  const newChatIconSize = window.innerWidth < 640 ? 16 : 18;
  const deleteIconSize = window.innerWidth < 640 ? 12 : 14;

  return (
    <div 
        className="h-full flex flex-col w-60 sm:w-64 md:w-72 bg-[var(--theme-bg-secondary)] border-r border-[var(--theme-border-primary)] shadow-lg transition-transform duration-300 ease-in-out flex-shrink-0"
        style={{
            transform: isOpen ? 'translateX(0)' : '-translateX(100%)',
        }}
        role="complementary"
        aria-label="Chat history"
    >
      <div className="p-2 sm:p-3 border-b border-[var(--theme-border-secondary)] flex justify-between items-center flex-shrink-0">
        <h2 className="text-base sm:text-lg font-semibold text-[var(--theme-text-link)] flex items-center">
          <MessageSquare size={headingIconSize} className="mr-1.5 sm:mr-2 opacity-80" />
          History
        </h2>
        <button
          onClick={onToggle}
          className="p-1 sm:p-1.5 text-[var(--theme-icon-history)] hover:bg-[var(--theme-bg-tertiary)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--theme-border-focus)]"
          aria-label="Close history sidebar"
          title="Close History"
        >
          <X size={headingIconSize} />
        </button>
      </div>

      <button
        onClick={onNewChat}
        className="flex items-center gap-1.5 sm:gap-2 w-full text-left p-2.5 text-xs sm:text-sm text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] focus:bg-[var(--theme-bg-accent)] focus:text-[var(--theme-text-accent)] focus:outline-none transition-colors border-b border-[var(--theme-border-secondary)]"
        aria-label="Start a new chat"
      >
        <FilePlus2 size={newChatIconSize} />
        <span>New Chat</span>
      </button>

      <div className="flex-grow overflow-y-auto custom-scrollbar">
        {sessions.length === 0 ? (
          <p className="p-3 sm:p-4 text-xs sm:text-sm text-center text-[var(--theme-text-tertiary)]">No chat history yet.</p>
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
                      aria-label={`Delete chat: ${session.title}`}
                      title="Delete Chat"
                    >
                      <Trash2 size={deleteIconSize} />
                    </button>
                  </div>
                  <div className={`text-xs mt-0.5 ${session.id === activeSessionId ? 'text-white/80' : 'text-[var(--theme-text-tertiary)]'}`}>
                    {formatTimestamp(session.timestamp)}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};