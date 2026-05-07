import type { StoreApi } from 'zustand';
import type { StateStorage } from 'zustand/middleware';
import { broadcastSyncMessage, getChatSyncChannel } from './chatSyncChannel';
import type { SyncMessage } from '../types/sync';

type StorageArea = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

interface CreatePersistedStateStorageOptions {
  debounceMs?: number;
  notifyUpdate?: (storageKey: string) => void;
  storageArea?: StorageArea;
}

type PersistedStoreApi<T> = StoreApi<T> & {
  persist: {
    rehydrate: () => Promise<void> | void;
  };
};

const PERSISTED_STATE_ORIGIN_ID =
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const getDefaultStorageArea = (): StorageArea | null => {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  return localStorage;
};

export const readPersistentStorageItem = (key: string, storageArea = getDefaultStorageArea()) => {
  try {
    return storageArea?.getItem(key) ?? null;
  } catch {
    return null;
  }
};

export const removePersistentStorageItem = (key: string, storageArea = getDefaultStorageArea()) => {
  try {
    storageArea?.removeItem(key);
  } catch {
    // Ignore storage failures in restricted browser contexts.
  }
};

const notifyPersistedStateUpdate = (storageKey: string) => {
  broadcastSyncMessage({
    type: 'PERSISTED_STATE_UPDATED',
    storageKey,
    originId: PERSISTED_STATE_ORIGIN_ID,
  });
};

export const createPersistedStateStorage = ({
  debounceMs = 0,
  notifyUpdate = notifyPersistedStateUpdate,
  storageArea,
}: CreatePersistedStateStorageOptions = {}): StateStorage => {
  const pendingWrites = new Map<string, string>();
  const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const resolveStorageArea = () => storageArea ?? getDefaultStorageArea();

  const clearPendingWrite = (key: string) => {
    const timer = pendingTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      pendingTimers.delete(key);
    }
    pendingWrites.delete(key);
  };

  const flushWrite = (key: string) => {
    const value = pendingWrites.get(key);
    const resolvedStorageArea = resolveStorageArea();
    if (value === undefined || !resolvedStorageArea) {
      clearPendingWrite(key);
      return;
    }

    pendingTimers.delete(key);
    pendingWrites.delete(key);

    try {
      if (resolvedStorageArea.getItem(key) === value) {
        return;
      }
      resolvedStorageArea.setItem(key, value);
      notifyUpdate(key);
    } catch {
      // Ignore storage failures in restricted browser contexts.
    }
  };

  return {
    getItem: (key) => {
      try {
        return resolveStorageArea()?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    setItem: (key, value) => {
      const resolvedStorageArea = resolveStorageArea();
      if (!resolvedStorageArea) {
        return;
      }

      if (debounceMs <= 0) {
        clearPendingWrite(key);
        try {
          if (resolvedStorageArea.getItem(key) === value) {
            return;
          }
          resolvedStorageArea.setItem(key, value);
          notifyUpdate(key);
        } catch {
          // Ignore storage failures in restricted browser contexts.
        }
        return;
      }

      clearPendingWrite(key);
      pendingWrites.set(key, value);
      pendingTimers.set(
        key,
        setTimeout(() => {
          flushWrite(key);
        }, debounceMs),
      );
    },
    removeItem: (key) => {
      clearPendingWrite(key);
      try {
        resolveStorageArea()?.removeItem(key);
        notifyUpdate(key);
      } catch {
        // Ignore storage failures in restricted browser contexts.
      }
    },
  };
};

export const registerPersistedStoreSync = <T>(store: PersistedStoreApi<T>, storageKey: string) => {
  if (typeof BroadcastChannel === 'undefined') {
    return () => {};
  }

  const channel = getChatSyncChannel();
  const handleMessage = (event: MessageEvent<SyncMessage>) => {
    const message = event.data;
    if (
      message.type !== 'PERSISTED_STATE_UPDATED' ||
      message.storageKey !== storageKey ||
      message.originId === PERSISTED_STATE_ORIGIN_ID
    ) {
      return;
    }

    void store.persist.rehydrate();
  };

  channel.addEventListener('message', handleMessage);
  return () => channel.removeEventListener('message', handleMessage);
};
