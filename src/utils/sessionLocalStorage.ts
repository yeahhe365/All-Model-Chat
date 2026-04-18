const SESSION_LOCAL_STORAGE_KEY_PREFIXES = [
  'chatDraft_',
  'chatQuotes_',
  'chatTtsContext_',
  'chat_scroll_pos_',
] as const;

const getSessionScopedLocalStorageKeys = (sessionId: string) => {
  return SESSION_LOCAL_STORAGE_KEY_PREFIXES.map((prefix) => `${prefix}${sessionId}`);
};

export const removeSessionScopedLocalStorageEntries = (
  sessionIds: Iterable<string>,
  storage: Pick<Storage, 'removeItem'> = localStorage,
) => {
  const uniqueSessionIds = new Set(sessionIds);

  uniqueSessionIds.forEach((sessionId) => {
    if (!sessionId) {
      return;
    }

    getSessionScopedLocalStorageKeys(sessionId).forEach((key) => {
      storage.removeItem(key);
    });
  });
};
