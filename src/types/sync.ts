export type SyncMessage =
  | { type: 'SETTINGS_UPDATED' }
  | { type: 'SESSIONS_UPDATED' }
  | { type: 'GROUPS_UPDATED' }
  | { type: 'SESSION_CONTENT_UPDATED'; sessionId: string }
  | { type: 'SESSION_LOADING'; sessionId: string; isLoading: boolean }
  | { type: 'PERSISTED_STATE_UPDATED'; storageKey: string; originId: string };
