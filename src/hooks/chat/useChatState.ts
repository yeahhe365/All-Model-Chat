import { useMemo } from 'react';
import { AppSettings } from '../../types';
import { useChatStore } from '../../stores/chatStore';

export const useChatState = (appSettings: AppSettings) => {
  const activeSessionId = useChatStore((s) => s.activeSessionId);
  const savedSessions = useChatStore((s) => s.savedSessions);
  const activeMessages = useChatStore((s) => s.activeMessages);

  // Computed: activeChat merges session metadata with live messages
  const activeChat = useMemo(() => {
    const metadata = savedSessions.find((s) => s.id === activeSessionId);
    if (metadata) {
      return { ...metadata, messages: activeMessages };
    }
    return undefined;
  }, [savedSessions, activeSessionId, activeMessages]);

  // Computed: current settings from active chat or app defaults
  const currentChatSettings = useMemo(() => activeChat?.settings || appSettings, [activeChat, appSettings]);

  // Computed: is the current session loading?
  const loadingSessionIds = useChatStore((s) => s.loadingSessionIds);
  const isLoading = useMemo(() => loadingSessionIds.has(activeSessionId ?? ''), [loadingSessionIds, activeSessionId]);

  return {
    // Computed (not available directly from store)
    activeChat,
    currentChatSettings,
    isLoading,

    // Convenience: reactive values for hooks that need them
    activeSessionId,
    savedSessions,
    activeMessages,
  };
};
