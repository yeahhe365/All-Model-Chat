
import { AppSettings, ChatGroup, SavedChatSession, SavedScenario } from '../types';
import { LogEntry } from '../services/logService';

const DB_NAME = 'AllModelChatDB';
const DB_VERSION = 2;

const SESSIONS_STORE = 'sessions';
const GROUPS_STORE = 'groups';
const SCENARIOS_STORE = 'scenarios';
const KEY_VALUE_STORE = 'keyValueStore';
const LOGS_STORE = 'logs';

const LOCK_NAME = 'all_model_chat_db_write_lock';

let dbPromise: Promise<IDBDatabase> | null = null;

const getDb = (): Promise<IDBDatabase> => {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
          db.createObjectStore(SESSIONS_STORE, { keyPath: 'id' });
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
      };
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

async function put<T>(storeName: string, value: T): Promise<void> {
  return withWriteLock(async () => {
    const db = await getDb();
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(value);
    return transactionToPromise(tx);
  });
}

async function deleteItem(storeName: string, key: string): Promise<void> {
  return withWriteLock(async () => {
      const db = await getDb();
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).delete(key);
      return transactionToPromise(tx);
  });
}

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

// Lazy loading specific function
async function getAllSessionsMetadata(): Promise<SavedChatSession[]> {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(SESSIONS_STORE, 'readonly');
        const store = transaction.objectStore(SESSIONS_STORE);
        const request = store.openCursor();
        const results: SavedChatSession[] = [];

        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
                // Destructure messages out to save memory, mark as partial
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { messages, ...metadata } = cursor.value as SavedChatSession;
                results.push({ ...metadata, messages: [], isPartial: true });
                cursor.continue();
            } else {
                resolve(results);
            }
        };
        request.onerror = () => reject(request.error);
    });
}

async function getSessionById(id: string): Promise<SavedChatSession | undefined> {
    const db = await getDb();
    return requestToPromise(db.transaction(SESSIONS_STORE, 'readonly').objectStore(SESSIONS_STORE).get(id));
}

// Smart save that handles partial updates via merge
async function saveSessionSmart(session: SavedChatSession): Promise<void> {
    if (!session.isPartial) {
        // Full object, safe to put directly
        return put(SESSIONS_STORE, session);
    }
    
    // Logic for partial objects (Metadata updates):
    // 1. Fetch existing full object from DB
    // 2. Merge metadata fields
    // 3. Put back
    return withWriteLock(async () => {
        const db = await getDb();
        const tx = db.transaction(SESSIONS_STORE, 'readwrite');
        const store = tx.objectStore(SESSIONS_STORE);
        
        try {
            const existingRequest = store.get(session.id);
            const existingSession = await new Promise<SavedChatSession>((resolve, reject) => {
                existingRequest.onsuccess = () => resolve(existingRequest.result);
                existingRequest.onerror = () => reject(existingRequest.error);
            });

            if (existingSession) {
                // Merge: Keep existing messages, update everything else from the partial session
                // We assume the partial session has the updated title, group, pinned status etc.
                const mergedSession = {
                    ...existingSession,
                    ...session,
                    messages: existingSession.messages, // RESTORE MESSAGES
                    isPartial: undefined // Remove partial flag for storage
                };
                delete mergedSession.isPartial;
                
                store.put(mergedSession);
            } else {
                // Edge case: Partial session exists in state but not DB? 
                // This shouldn't happen unless deleted concurrently.
                // If it does, we can't save it without losing messages, so we log warning or ignore.
                console.warn(`Attempted to save partial session ${session.id} but it does not exist in DB.`);
            }
            
            return transactionToPromise(tx);
        } catch (e) {
            console.error("Failed to perform smart save", e);
            throw e;
        }
    });
}


export const dbService = {
  getAllSessions: () => getAll<SavedChatSession>(SESSIONS_STORE),
  getAllSessionsMetadata, // Export new lazy method
  getSessionById,         // Export specific fetcher
  setAllSessions: (sessions: SavedChatSession[]) => setAll<SavedChatSession>(SESSIONS_STORE, sessions),
  saveSession: saveSessionSmart, // Replace raw put with smart save
  deleteSession: (id: string) => deleteItem(SESSIONS_STORE, id),
  
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
  clearAllData: () => withWriteLock(async () => {
      const db = await getDb();
      const storeNames = [SESSIONS_STORE, GROUPS_STORE, SCENARIOS_STORE, KEY_VALUE_STORE, LOGS_STORE];
      const tx = db.transaction(storeNames, 'readwrite');
      for (const storeName of storeNames) tx.objectStore(storeName).clear();
      return transactionToPromise(tx);
  }),
};
