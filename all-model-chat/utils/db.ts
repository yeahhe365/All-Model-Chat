
import { AppSettings, ChatGroup, SavedChatSession, SavedScenario } from '../types';
import { LogEntry } from '../services/logService';

const DB_NAME = 'AllModelChatDB';
const DB_VERSION = 2; // Incremented for logs support

const SESSIONS_STORE = 'sessions';
const GROUPS_STORE = 'groups';
const SCENARIOS_STORE = 'scenarios';
const KEY_VALUE_STORE = 'keyValueStore';
const LOGS_STORE = 'logs';

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
        
        // V1 Stores
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

        // V2 Store: Logs
        if (!db.objectStoreNames.contains(LOGS_STORE)) {
          const logStore = db.createObjectStore(LOGS_STORE, { keyPath: 'id', autoIncrement: true });
          logStore.createIndex('timestamp', 'timestamp', { unique: false });
          logStore.createIndex('level', 'level', { unique: false });
          logStore.createIndex('category', 'category', { unique: false });
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

async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await getDb();
  return requestToPromise(db.transaction(storeName, 'readonly').objectStore(storeName).getAll());
}

async function setAll<T>(storeName: string, values: T[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  store.clear();
  values.forEach(value => store.put(value));
  return transactionToPromise(tx);
}

async function getKeyValue<T>(key: string): Promise<T | undefined> {
  const db = await getDb();
  return requestToPromise(db.transaction(KEY_VALUE_STORE, 'readonly').objectStore(KEY_VALUE_STORE).get(key));
}

async function setKeyValue<T>(key: string, value: T): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(KEY_VALUE_STORE, 'readwrite');
  tx.objectStore(KEY_VALUE_STORE).put(value, key);
  return transactionToPromise(tx);
}

// --- Log Specific Methods ---

async function addLogs(logs: LogEntry[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(LOGS_STORE, 'readwrite');
  const store = tx.objectStore(LOGS_STORE);
  logs.forEach(log => store.add(log));
  return transactionToPromise(tx);
}

async function getLogs(limit = 500, offset = 0): Promise<LogEntry[]> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(LOGS_STORE, 'readonly');
    const store = tx.objectStore(LOGS_STORE);
    const index = store.index('timestamp');
    
    // Open cursor in reverse (prev) to get newest logs first
    const request = index.openCursor(null, 'prev');
    const results: LogEntry[] = [];
    let hasAdvanced = false;

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (!cursor) {
        resolve(results);
        return;
      }

      if (offset > 0 && !hasAdvanced) {
        hasAdvanced = true;
        cursor.advance(offset);
        return;
      }

      results.push(cursor.value);
      if (results.length < limit) {
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

async function clearLogs(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(LOGS_STORE, 'readwrite');
  tx.objectStore(LOGS_STORE).clear();
  return transactionToPromise(tx);
}

async function pruneLogs(olderThan: number): Promise<void> {
    const db = await getDb();
    const tx = db.transaction(LOGS_STORE, 'readwrite');
    const store = tx.objectStore(LOGS_STORE);
    const index = store.index('timestamp');
    const range = IDBKeyRange.upperBound(new Date(olderThan));
    
    // Efficient delete via range
    const request = index.openKeyCursor(range);
    
    request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
            store.delete(cursor.primaryKey);
            cursor.continue();
        }
    };
    
    return transactionToPromise(tx);
}

// --- General ---

async function clearAllData(): Promise<void> {
  const db = await getDb();
  const storeNames = [SESSIONS_STORE, GROUPS_STORE, SCENARIOS_STORE, KEY_VALUE_STORE, LOGS_STORE];
  const tx = db.transaction(storeNames, 'readwrite');
  for (const storeName of storeNames) {
    tx.objectStore(storeName).clear();
  }
  return transactionToPromise(tx);
}

export const dbService = {
  getAllSessions: () => getAll<SavedChatSession>(SESSIONS_STORE),
  setAllSessions: (sessions: SavedChatSession[]) => setAll<SavedChatSession>(SESSIONS_STORE, sessions),
  getAllGroups: () => getAll<ChatGroup>(GROUPS_STORE),
  setAllGroups: (groups: ChatGroup[]) => setAll<ChatGroup>(GROUPS_STORE, groups),
  getAllScenarios: () => getAll<SavedScenario>(SCENARIOS_STORE),
  setAllScenarios: (scenarios: SavedScenario[]) => setAll<SavedScenario>(SCENARIOS_STORE, scenarios),
  getAppSettings: () => getKeyValue<AppSettings>('appSettings'),
  setAppSettings: (settings: AppSettings) => setKeyValue<AppSettings>('appSettings', settings),
  getActiveSessionId: () => getKeyValue<string | null>('activeSessionId'),
  setActiveSessionId: (id: string | null) => setKeyValue<string | null>('activeSessionId', id),
  // Log specific
  addLogs,
  getLogs,
  clearLogs,
  pruneLogs,
  clearAllData,
};
