import type { SavedChatSession } from '@/types';
import type { SyncMessage } from '@/types/sync';
import { logService } from '@/services/logService';
import { dbService } from '@/services/db/dbService';
import { rehydrateSessionFiles } from '@/utils/chat/session';
import { getChatSyncChannel } from './chatSyncChannel';

type UpdaterOrValue<T> = T | ((prev: T) => T);

interface ChatSyncStore {
  getState: () => {
    activeSessionId: string | null;
    refreshSessions: () => Promise<void>;
    refreshGroups: () => Promise<void>;
    setActiveMessages: (messages: SavedChatSession['messages']) => void;
    setSavedSessions: (updater: UpdaterOrValue<SavedChatSession[]>) => void;
    setLoadingSessionIds: (updater: UpdaterOrValue<Set<string>>) => void;
  };
}

interface ChatStoreSyncDependencies {
  store: ChatSyncStore;
  localLoadingSessionIds: Set<string>;
  getChannel?: () => BroadcastChannel;
  getSession?: (sessionId: string) => Promise<SavedChatSession | null | undefined>;
  rehydrateSession?: (session: SavedChatSession) => SavedChatSession;
  logger?: Pick<typeof logService, 'info'>;
  documentRef?: Document;
}

export function setupChatStoreSync({
  store,
  localLoadingSessionIds,
  getChannel = getChatSyncChannel,
  getSession = dbService.getSession.bind(dbService),
  rehydrateSession = rehydrateSessionFiles,
  logger = logService,
  documentRef,
}: ChatStoreSyncDependencies) {
  const resolvedDocument = documentRef ?? (typeof document !== 'undefined' ? document : undefined);

  if (typeof BroadcastChannel === 'undefined' || !resolvedDocument) {
    return;
  }

  let isDirty = false;
  const channel = getChannel();
  const originalOnMessage = channel.onmessage;

  channel.onmessage = (event: MessageEvent<SyncMessage>) => {
    if (originalOnMessage) {
      originalOnMessage.call(channel, event);
    }

    const msg = event.data;

    switch (msg.type) {
      case 'SETTINGS_UPDATED':
      case 'SESSIONS_UPDATED':
        if (resolvedDocument.hidden) {
          isDirty = true;
        } else {
          store.getState().refreshSessions();
        }
        break;
      case 'GROUPS_UPDATED':
        if (resolvedDocument.hidden) {
          isDirty = true;
        } else {
          store.getState().refreshGroups();
        }
        break;
      case 'SESSION_CONTENT_UPDATED': {
        if (localLoadingSessionIds.has(msg.sessionId)) return;
        if (resolvedDocument.hidden) {
          isDirty = true;
          return;
        }

        const { activeSessionId } = store.getState();
        if (msg.sessionId === activeSessionId) {
          getSession(msg.sessionId).then((session) => {
            if (session) {
              const rehydrated = rehydrateSession(session);
              store.getState().setActiveMessages(rehydrated.messages);
              store
                .getState()
                .setSavedSessions((prev) =>
                  prev.map((old) => (old.id === msg.sessionId ? { ...rehydrated, messages: [] } : old)),
                );
            }
          });
        } else {
          store.getState().refreshSessions();
        }
        break;
      }
      case 'SESSION_LOADING': {
        store.getState().setLoadingSessionIds((prev) => {
          const next = new Set(prev);
          if (msg.isLoading) next.add(msg.sessionId);
          else next.delete(msg.sessionId);
          return next;
        });
        break;
      }
    }
  };

  resolvedDocument.addEventListener('visibilitychange', () => {
    if (resolvedDocument.visibilityState === 'visible' && isDirty) {
      logger.info('[Sync] Tab visible, syncing pending updates from DB.');
      store.getState().refreshSessions();
      store.getState().refreshGroups();
      isDirty = false;
    }
  });
}
