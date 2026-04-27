import { ACTIVE_CHAT_SESSION_ID_KEY } from '../constants/appConstants';

export type SessionHistoryMode = 'auto' | 'push' | 'replace' | 'none';

export const syncActiveSessionRoute = (
  activeSessionId: string | null,
  historyMode: SessionHistoryMode = 'auto',
) => {
  if (activeSessionId) {
    try {
      sessionStorage.setItem(ACTIVE_CHAT_SESSION_ID_KEY, activeSessionId);
    } catch {
      // Ignore sessionStorage sync failures.
    }

    if (historyMode === 'none') {
      return;
    }

    const targetPath = `/chat/${activeSessionId}`;
    try {
      if (window.location.pathname !== targetPath) {
        const method =
          historyMode === 'push'
            ? 'pushState'
            : historyMode === 'replace'
              ? 'replaceState'
              : window.location.pathname.startsWith('/chat/')
                ? 'replaceState'
                : 'pushState';
        window.history[method]({ sessionId: activeSessionId }, '', targetPath);
      }
    } catch {
      // Ignore history sync failures.
    }
    return;
  }

  try {
    sessionStorage.removeItem(ACTIVE_CHAT_SESSION_ID_KEY);
  } catch {
    // Ignore sessionStorage sync failures.
  }

  if (historyMode === 'none') {
    return;
  }

  try {
    if (window.location.pathname !== '/') {
      const method = historyMode === 'replace' ? 'replaceState' : 'pushState';
      window.history[method]({}, '', '/');
    }
  } catch {
    // Ignore history sync failures.
  }
};
