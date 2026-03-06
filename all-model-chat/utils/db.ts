import { AppSettings, ChatGroup, SavedChatSession, SavedScenario } from '../types';
import { LogEntry } from '../services/logService';

const DB_NAME = 'AllModelChatDB';
const DB_VERSION = 4; // Bumped to 4 for messages separation

const SESSIONS_STORE = 'sessions';
const GROUPS_STORE = 'groups';
const SCENARIOS_STORE = 'scenarios';
const KEY_VALUE_STORE = 'keyValueStore';
const LOGS_STORE = 'logs';
const MESSAGES_STORE = 'messages';

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
        const tx = (event.target as IDBOpenDBRequest).transaction;
        
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
        if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
          const msgStore = db.createObjectStore(MESSAGES_STORE, { keyPath: 'id' });
          msgStore.createIndex('sessionId', 'sessionId', { unique: false });
        }

        // Migrate existing sessions to separate messages
        if (event.oldVersion < 4 && tx) {
          const sessionStore = tx.objectStore(SESSIONS_STORE);
          const msgStore = tx.objectStore(MESSAGES_STORE);
          
          sessionStore.openCursor().onsuccess = (e) => {
            const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
              const session = cursor.value;
              if (session.messages && Array.isArray(session.messages)) {
                session.messages.forEach((msg: any) => {
                  msgStore.put({ ...msg, sessionId: session.id });
                });
                delete session.messages;
                cursor.update(session);
              }
              cursor.continue();
            }
          };
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

export const dbService = {
  getAllSessions: async () => {
    const sessions = await getAll<SavedChatSession>(SESSIONS_STORE);
    const allMessages = await getAll<any>(MESSAGES_STORE);
    
    // Group messages by sessionId
    const messagesBySession = new Map<string, any[]>();
    allMessages.forEach(msg => {
      if (!messagesBySession.has(msg.sessionId)) {
        messagesBySession.set(msg.sessionId, []);
      }
      messagesBySession.get(msg.sessionId)!.push(msg);
    });

    // Attach and sort messages
    return sessions.map(s => {
      const msgs = messagesBySession.get(s.id) || [];
      msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      return { ...s, messages: msgs };
    });
  },
  
  // New method: Fetches a single session by ID
  getSession: async (id: string) => {
    const session = await getItem<SavedChatSession>(SESSIONS_STORE, id);
    if (session) {
      const messages = await dbService.getMessagesBySession(id);
      session.messages = messages;
    }
    return session;
  },

  getMessagesBySession: async (sessionId: string): Promise<any[]> => {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(MESSAGES_STORE, 'readonly');
      const store = tx.objectStore(MESSAGES_STORE);
      const index = store.index('sessionId');
      const request = index.getAll(sessionId);
      request.onsuccess = () => {
        const msgs = request.result || [];
        msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        resolve(msgs);
      };
      request.onerror = () => reject(request.error);
    });
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
            const { messages, ...rest } = cursor.value;
            // Return with empty messages to save memory
            results.push({ ...rest, messages: [] });
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
      
      // First search metadata
      const metadataResults = await new Promise<string[]>((resolve, reject) => {
          const tx = db.transaction(SESSIONS_STORE, 'readonly');
          const store = tx.objectStore(SESSIONS_STORE);
          const request = store.openCursor();
          const results: string[] = [];
          
          request.onsuccess = (event) => {
              const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
              if (cursor) {
                  const session = cursor.value as SavedChatSession;
                  if (session.title?.toLowerCase().includes(lowerQuery)) {
                      results.push(session.id);
                  }
                  cursor.continue();
              } else {
                  resolve(results);
              }
          };
          request.onerror = () => reject(request.error);
      });

      // Then search messages
      const messageResults = await new Promise<string[]>((resolve, reject) => {
          const tx = db.transaction(MESSAGES_STORE, 'readonly');
          const store = tx.objectStore(MESSAGES_STORE);
          const request = store.openCursor();
          const results: Set<string> = new Set();
          
          request.onsuccess = (event) => {
              const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
              if (cursor) {
                  const msg = cursor.value;
                  if ((msg.content && msg.content.toLowerCase().includes(lowerQuery)) || 
                      (msg.thoughts && msg.thoughts.toLowerCase().includes(lowerQuery))) {
                      results.add(msg.sessionId);
                  }
                  cursor.continue();
              } else {
                  resolve(Array.from(results));
              }
          };
          request.onerror = () => reject(request.error);
      });

      return Array.from(new Set([...metadataResults, ...messageResults]));
  },

  setAllSessions: async (sessions: SavedChatSession[]) => {
    const metadata = sessions.map(({ messages, ...rest }) => rest);
    await setAll(SESSIONS_STORE, metadata);
    
    // Clear and set messages
    await withWriteLock(async () => {
      const db = await getDb();
      const tx = db.transaction(MESSAGES_STORE, 'readwrite');
      const store = tx.objectStore(MESSAGES_STORE);
      store.clear();
      sessions.forEach(session => {
        if (session.messages) {
          session.messages.forEach(msg => {
            store.put({ ...msg, sessionId: session.id });
          });
        }
      });
      return transactionToPromise(tx);
    });
  },
  
  saveSession: async (session: SavedChatSession) => {
    const { messages, ...metadata } = session;
    await put(SESSIONS_STORE, metadata);
    if (messages && messages.length > 0) {
      await withWriteLock(async () => {
        const db = await getDb();
        const tx = db.transaction(MESSAGES_STORE, 'readwrite');
        const store = tx.objectStore(MESSAGES_STORE);
        messages.forEach(msg => {
          store.put({ ...msg, sessionId: session.id });
        });
        return transactionToPromise(tx);
      });
    }
  },

  saveSessionMetadata: async (metadata: any) => {
    await put(SESSIONS_STORE, metadata);
  },

  saveMessage: async (sessionId: string, message: any) => {
    await put(MESSAGES_STORE, { ...message, sessionId });
  },

  deleteMessage: async (messageId: string) => {
    await deleteItem(MESSAGES_STORE, messageId);
  },

  deleteSession: async (id: string) => {
    await deleteItem(SESSIONS_STORE, id);
    await withWriteLock(async () => {
      const db = await getDb();
      const tx = db.transaction(MESSAGES_STORE, 'readwrite');
      const store = tx.objectStore(MESSAGES_STORE);
      const index = store.index('sessionId');
      const request = index.openKeyCursor(IDBKeyRange.only(id));
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          store.delete(cursor.primaryKey);
          cursor.continue();
        }
      };
      return transactionToPromise(tx);
    });
  },
  
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
      const storeNames = [SESSIONS_STORE, GROUPS_STORE, SCENARIOS_STORE, KEY_VALUE_STORE, LOGS_STORE, MESSAGES_STORE];
      const tx = db.transaction(storeNames, 'readwrite');
      for (const storeName of storeNames) tx.objectStore(storeName).clear();
      return transactionToPromise(tx);
  }),
};
