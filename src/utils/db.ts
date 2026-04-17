import { AppSettings, ChatGroup, PersistedSessionFileRecord, SavedChatSession, SavedScenario } from '../types';
import type { LogEntry } from '../services/logService';
import {
  attachPersistedSessionFiles,
  extractPersistedSessionFileRecords,
  stripSessionFilePayloads,
} from './chat/session';

const DB_NAME = 'AllModelChatDB';
const DB_VERSION = 5;

const SESSIONS_STORE = 'sessions';
const FILES_STORE = 'files';
const GROUPS_STORE = 'groups';
const SCENARIOS_STORE = 'scenarios';
const KEY_VALUE_STORE = 'keyValueStore';
const LOGS_STORE = 'logs';
const API_USAGE_STORE = 'api_usage';

const LOCK_NAME = 'all_model_chat_db_write_lock';

let dbPromise: Promise<IDBDatabase> | null = null;

export interface ApiUsageRecord {
  id?: number;
  timestamp: number;
  modelId: string;
  promptTokens: number;
  completionTokens: number;
}

const isVersionConflictError = (error: unknown): boolean => {
  if (error instanceof DOMException) {
    return error.name === 'VersionError';
  }

  if (error instanceof Error) {
    return error.name === 'VersionError' || /requested version .* less than .* existing version/i.test(error.message);
  }

  return false;
};

const getDb = (): Promise<IDBDatabase> => {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const applyMigrations = (db: IDBDatabase, oldVersion: number) => {
        // Version 1: Initial schema
        if (oldVersion < 1) {
          db.createObjectStore(SESSIONS_STORE, { keyPath: 'id' });
          db.createObjectStore(GROUPS_STORE, { keyPath: 'id' });
          db.createObjectStore(SCENARIOS_STORE, { keyPath: 'id' });
          db.createObjectStore(KEY_VALUE_STORE);
        }

        // Version 2: Add logs store
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains(LOGS_STORE)) {
            const logStore = db.createObjectStore(LOGS_STORE, { keyPath: 'id', autoIncrement: true });
            logStore.createIndex('timestamp', 'timestamp', { unique: false });
          }
        }

        if (oldVersion < 4) {
          if (!db.objectStoreNames.contains(FILES_STORE)) {
            const fileStore = db.createObjectStore(FILES_STORE, { keyPath: 'id' });
            fileStore.createIndex('sessionId', 'sessionId', { unique: false });
          }
        }

        if (oldVersion < 5) {
          if (!db.objectStoreNames.contains(API_USAGE_STORE)) {
            const usageStore = db.createObjectStore(API_USAGE_STORE, { keyPath: 'id', autoIncrement: true });
            usageStore.createIndex('timestamp', 'timestamp', { unique: false });
          }
        }

        // Safety net: ensure all expected stores exist (e.g. if DB was partially created)
        if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
          db.createObjectStore(SESSIONS_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(FILES_STORE)) {
          const fileStore = db.createObjectStore(FILES_STORE, { keyPath: 'id' });
          fileStore.createIndex('sessionId', 'sessionId', { unique: false });
        }
        if (!db.objectStoreNames.contains(GROUPS_STORE)) {
          db.createObjectStore(GROUPS_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(SCENARIOS_STORE)) {
          db.createObjectStore(SCENARIOS_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(KEY_VALUE_STORE)) {
          db.createObjectStore(KEY_VALUE_STORE);
        }
        if (!db.objectStoreNames.contains(LOGS_STORE)) {
          const logStore = db.createObjectStore(LOGS_STORE, { keyPath: 'id', autoIncrement: true });
          logStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        if (!db.objectStoreNames.contains(API_USAGE_STORE)) {
          const usageStore = db.createObjectStore(API_USAGE_STORE, { keyPath: 'id', autoIncrement: true });
          usageStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      const openDatabase = (version?: number, allowVersionFallback: boolean = false) => {
        const request = version === undefined
          ? indexedDB.open(DB_NAME)
          : indexedDB.open(DB_NAME, version);

        request.onerror = () => {
          if (allowVersionFallback && isVersionConflictError(request.error)) {
            console.warn(
              `IndexedDB version ${DB_VERSION} is older than the stored schema. Reopening ${DB_NAME} with the browser's current version.`
            );
            openDatabase(undefined, false);
            return;
          }

          console.error('IndexedDB error:', request.error);
          reject(request.error);
        };

        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          applyMigrations(db, event.oldVersion);
        };
      };

      openDatabase(DB_VERSION, true);
    });
  }
  return dbPromise;
};

const requestToPromise = <T>(request: IDBRequest<T>): Promise<T> => {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const transactionToPromise = (tx: IDBTransaction): Promise<void> => {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
};

/**
 * Ensures that write operations across tabs do not interleave and cause data loss.
 */
async function withWriteLock<T>(callback: () => Promise<T>): Promise<T> {
    if ('locks' in navigator) {
        return navigator.locks.request(LOCK_NAME, { mode: 'exclusive' }, callback);
    }
    return callback();
}

async function getItem<T>(storeName: string, key: string): Promise<T | undefined> {
  const db = await getDb();
  return requestToPromise(db.transaction(storeName, 'readonly').objectStore(storeName).get(key));
}

async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await getDb();
  return requestToPromise(db.transaction(storeName, 'readonly').objectStore(storeName).getAll());
}

async function setAll<T>(storeName: string, values: T[]): Promise<void> {
  return withWriteLock(async () => {
    const db = await getDb();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.clear();
    values.forEach(value => store.put(value));
    return transactionToPromise(tx);
  });
}

const getSessionFileRecords = async (sessionId: string): Promise<PersistedSessionFileRecord[]> => {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILES_STORE, 'readonly');
    const index = tx.objectStore(FILES_STORE).index('sessionId');
    const request = index.getAll(sessionId);
    request.onsuccess = () => resolve((request.result as PersistedSessionFileRecord[]) || []);
    request.onerror = () => reject(request.error);
  });
};

const persistSessionRecord = async (session: SavedChatSession): Promise<void> => {
  return withWriteLock(async () => {
    const db = await getDb();
    const tx = db.transaction([SESSIONS_STORE, FILES_STORE], 'readwrite');
    const sessionStore = tx.objectStore(SESSIONS_STORE);
    const fileStore = tx.objectStore(FILES_STORE);
    const fileIndex = fileStore.index('sessionId');

    const sanitizedSession = stripSessionFilePayloads(session);
    const fileRecords = extractPersistedSessionFileRecords(session);
    const nextFileIds = new Set(fileRecords.map((record) => record.id));

    sessionStore.put(sanitizedSession);
    fileRecords.forEach((record) => fileStore.put(record));

    const cleanupRequest = fileIndex.openCursor(IDBKeyRange.only(session.id));
    cleanupRequest.onsuccess = () => {
      const cursor = cleanupRequest.result;
      if (!cursor) {
        return;
      }

      if (!nextFileIds.has(cursor.primaryKey as string)) {
        fileStore.delete(cursor.primaryKey);
      }
      cursor.continue();
    };
    cleanupRequest.onerror = () => {
      tx.abort();
    };

    return transactionToPromise(tx);
  });
};

const persistAllSessionRecords = async (sessions: SavedChatSession[]): Promise<void> => {
  return withWriteLock(async () => {
    const db = await getDb();
    const tx = db.transaction([SESSIONS_STORE, FILES_STORE], 'readwrite');
    const sessionStore = tx.objectStore(SESSIONS_STORE);
    const fileStore = tx.objectStore(FILES_STORE);

    sessionStore.clear();
    fileStore.clear();

    sessions.forEach((session) => {
      sessionStore.put(stripSessionFilePayloads(session));
      extractPersistedSessionFileRecords(session).forEach((record) => fileStore.put(record));
    });

    return transactionToPromise(tx);
  });
};

const deleteSessionRecord = async (id: string): Promise<void> => {
  return withWriteLock(async () => {
    const db = await getDb();
    const tx = db.transaction([SESSIONS_STORE, FILES_STORE], 'readwrite');
    const sessionStore = tx.objectStore(SESSIONS_STORE);
    const fileStore = tx.objectStore(FILES_STORE);
    const fileIndex = fileStore.index('sessionId');

    sessionStore.delete(id);

    const cleanupRequest = fileIndex.openCursor(IDBKeyRange.only(id));
    cleanupRequest.onsuccess = () => {
      const cursor = cleanupRequest.result;
      if (!cursor) {
        return;
      }

      fileStore.delete(cursor.primaryKey);
      cursor.continue();
    };
    cleanupRequest.onerror = () => {
      tx.abort();
    };

    return transactionToPromise(tx);
  });
};

async function getKeyValue<T>(key: string): Promise<T | undefined> {
  const db = await getDb();
  return requestToPromise(db.transaction(KEY_VALUE_STORE, 'readonly').objectStore(KEY_VALUE_STORE).get(key));
}

async function setKeyValue<T>(key: string, value: T): Promise<void> {
  return withWriteLock(async () => {
      const db = await getDb();
      const tx = db.transaction(KEY_VALUE_STORE, 'readwrite');
      tx.objectStore(KEY_VALUE_STORE).put(value, key);
      return transactionToPromise(tx);
  });
}

export const dbService = {
  getAllSessions: async () => {
    const sessions = await getAll<SavedChatSession>(SESSIONS_STORE);
    return Promise.all(sessions.map((session) => dbService.getSession(session.id))).then((results) =>
      results.filter((session): session is SavedChatSession => !!session),
    );
  },
  
  // New method: Fetches a single session by ID
  getSession: async (id: string) => {
      const session = await getItem<SavedChatSession>(SESSIONS_STORE, id);
      if (!session) {
        return session;
      }

      const persistedRecords = await getSessionFileRecords(id);
      const inlineRecords = extractPersistedSessionFileRecords(session);
      const combinedRecords = new Map<string, PersistedSessionFileRecord>();

      persistedRecords.forEach((record) => combinedRecords.set(record.id, record));
      inlineRecords.forEach((record) => combinedRecords.set(record.id, record));

      const hydratedSession = attachPersistedSessionFiles(stripSessionFilePayloads(session), combinedRecords);

      if (inlineRecords.length > 0) {
        await persistSessionRecord(hydratedSession);
      }

      return hydratedSession;
  },

  // New method: Fetches all sessions but excludes the heavy 'messages' array
  getAllSessionMetadata: async (): Promise<SavedChatSession[]> => {
      const db = await getDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(SESSIONS_STORE, 'readonly');
        const store = tx.objectStore(SESSIONS_STORE);
        const request = store.openCursor();
        const results: SavedChatSession[] = [];
        
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            // Return with empty messages to save memory
            results.push({ ...cursor.value, messages: [] });
            cursor.continue();
          } else {
            resolve(results);
          }
        };
        request.onerror = () => reject(request.error);
      });
  },

  searchSessions: async (query: string): Promise<string[]> => {
      const db = await getDb();
      const lowerQuery = query.toLowerCase();
      return new Promise((resolve, reject) => {
          const tx = db.transaction(SESSIONS_STORE, 'readonly');
          const store = tx.objectStore(SESSIONS_STORE);
          const request = store.openCursor();
          const results: string[] = [];

          request.onsuccess = (event) => {
              const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
              if (cursor) {
                  const session = cursor.value as SavedChatSession;
                  // Fast path: check title first (cheap), then content (expensive for long messages)
                  const titleMatch = session.title?.toLowerCase().includes(lowerQuery);
                  let contentMatch = false;
                  if (!titleMatch && session.messages) {
                      for (const m of session.messages) {
                          if (m.content?.toLowerCase().includes(lowerQuery) ||
                              m.thoughts?.toLowerCase().includes(lowerQuery)) {
                              contentMatch = true;
                              break; // Stop at first match, no need to scan all messages
                          }
                      }
                  }

                  if (titleMatch || contentMatch) {
                      results.push(session.id);
                  }
                  cursor.continue();
              } else {
                  resolve(results);
              }
          };
          request.onerror = () => reject(request.error);
      });
  },

  setAllSessions: (sessions: SavedChatSession[]) => persistAllSessionRecords(sessions),
  saveSession: (session: SavedChatSession) => persistSessionRecord(session),
  deleteSession: (id: string) => deleteSessionRecord(id),
  
  getAllGroups: () => getAll<ChatGroup>(GROUPS_STORE),
  setAllGroups: (groups: ChatGroup[]) => setAll<ChatGroup>(GROUPS_STORE, groups),
  
  getAllScenarios: () => getAll<SavedScenario>(SCENARIOS_STORE),
  setAllScenarios: (scenarios: SavedScenario[]) => setAll<SavedScenario>(SCENARIOS_STORE, scenarios),
  
  getAppSettings: () => getKeyValue<AppSettings>('appSettings'),
  setAppSettings: (settings: AppSettings) => setKeyValue<AppSettings>('appSettings', settings),
  
  getActiveSessionId: () => getKeyValue<string | null>('activeSessionId'),
  setActiveSessionId: (id: string | null) => setKeyValue<string | null>('activeSessionId', id),
  
  addLogs: (logs: LogEntry[]) => withWriteLock(async () => {
      const db = await getDb();
      const tx = db.transaction(LOGS_STORE, 'readwrite');
      const store = tx.objectStore(LOGS_STORE);
      logs.forEach(log => store.add(log));
      return transactionToPromise(tx);
  }),
  getLogs: (limit = 500, offset = 0): Promise<LogEntry[]> => getDb().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(LOGS_STORE, 'readonly');
      const store = tx.objectStore(LOGS_STORE);
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev');
      const results: LogEntry[] = [];
      let hasAdvanced = false;
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (!cursor) { resolve(results); return; }
        if (offset > 0 && !hasAdvanced) { hasAdvanced = true; cursor.advance(offset); return; }
        results.push(cursor.value);
        if (results.length < limit) cursor.continue();
        else resolve(results);
      };
      request.onerror = () => reject(request.error);
  })),
  clearLogs: () => withWriteLock(async () => {
      const db = await getDb();
      const tx = db.transaction(LOGS_STORE, 'readwrite');
      tx.objectStore(LOGS_STORE).clear();
      return transactionToPromise(tx);
  }),
  pruneLogs: (olderThan: number) => withWriteLock(async () => {
      const db = await getDb();
      const tx = db.transaction(LOGS_STORE, 'readwrite');
      const store = tx.objectStore(LOGS_STORE);
      const index = store.index('timestamp');
      const range = IDBKeyRange.upperBound(new Date(olderThan));
      const request = index.openKeyCursor(range);
      request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) { store.delete(cursor.primaryKey); cursor.continue(); }
      };
      return transactionToPromise(tx);
  }),
  addApiUsageRecord: (record: ApiUsageRecord) => withWriteLock(async () => {
      const db = await getDb();
      const tx = db.transaction(API_USAGE_STORE, 'readwrite');
      tx.objectStore(API_USAGE_STORE).add(record);
      return transactionToPromise(tx);
  }),
  getApiUsageByTimeRange: (startTime: number, endTime: number): Promise<ApiUsageRecord[]> =>
    getDb().then(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(API_USAGE_STORE, 'readonly');
          const store = tx.objectStore(API_USAGE_STORE);
          const index = store.index('timestamp');
          const range = IDBKeyRange.bound(startTime, endTime);
          const request = index.getAll(range);
          request.onsuccess = () => resolve((request.result as ApiUsageRecord[]) ?? []);
          request.onerror = () => reject(request.error);
        }),
    ),
  clearApiUsage: () => withWriteLock(async () => {
      const db = await getDb();
      const tx = db.transaction(API_USAGE_STORE, 'readwrite');
      tx.objectStore(API_USAGE_STORE).clear();
      return transactionToPromise(tx);
  }),
  clearAllData: () => withWriteLock(async () => {
      const db = await getDb();
      const storeNames = [SESSIONS_STORE, FILES_STORE, GROUPS_STORE, SCENARIOS_STORE, KEY_VALUE_STORE, LOGS_STORE, API_USAGE_STORE];
      const tx = db.transaction(storeNames, 'readwrite');
      for (const storeName of storeNames) tx.objectStore(storeName).clear();
      return transactionToPromise(tx);
  }),
};
