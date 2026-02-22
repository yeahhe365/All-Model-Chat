import { AppSettings, ChatGroup, SavedChatSession, SavedScenario } from '../types';
import { LogEntry } from '../services/logService';

const DB_NAME = 'AllModelChatDB';
// 将版本号从 2 升级到 3，触发 onupgradeneeded 进行数据拆表迁移
const DB_VERSION = 3; 

const SESSIONS_STORE = 'sessions';         // V3后：仅存储元数据 (ID, 标题, 设置等)
const MESSAGES_STORE = 'session_messages'; // NEW V3：存储沉重的聊天记录和附件 Blob { id: string, messages: ChatMessage[] }
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
        const oldVersion = event.oldVersion;
        const tx = (event.target as IDBOpenDBRequest).transaction!;
        
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

        // --- V3 核心升级逻辑：拆分臃肿的 Messages 数据 ---
        if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
            const messagesStore = db.createObjectStore(MESSAGES_STORE, { keyPath: 'id' });
            
            // 如果是从 v1 或 v2 升级上来的旧用户，进行数据迁移剥离
            if (oldVersion > 0 && oldVersion < 3) {
                const sessionsStore = tx.objectStore(SESSIONS_STORE);
                sessionsStore.openCursor().onsuccess = (e) => {
                    const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
                    if (cursor) {
                        const session = cursor.value;
                        if (session.messages !== undefined) {
                            // 1. 将海量对话记录转移到新表
                            messagesStore.put({ id: session.id, messages: session.messages });
                            // 2. 从原表中删除 messages 属性，使其变成轻量级元数据表
                            delete session.messages;
                            cursor.update(session);
                        }
                        cursor.continue();
                    }
                };
            }
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
  // 注意：这个方法用于导出全量数据，需要合并两张表
  getAllSessions: async (): Promise<SavedChatSession[]> => {
      const db = await getDb();
      return new Promise((resolve, reject) => {
          const tx = db.transaction([SESSIONS_STORE, MESSAGES_STORE], 'readonly');
          const metaReq = tx.objectStore(SESSIONS_STORE).getAll();
          const msgReq = tx.objectStore(MESSAGES_STORE).getAll();
          
          tx.oncomplete = () => {
              const metas = metaReq.result as any[];
              const msgs = msgReq.result as any[];
              const msgMap = new Map(msgs.map(m => [m.id, m.messages]));
              
              const fullSessions = metas.map(meta => ({
                  ...meta,
                  messages: msgMap.get(meta.id) || []
              }));
              resolve(fullSessions);
          };
          tx.onerror = () => reject(tx.error);
      });
  },
  
  // 组装合并 Session
  getSession: async (id: string): Promise<SavedChatSession | undefined> => {
      const db = await getDb();
      return new Promise((resolve, reject) => {
          const tx = db.transaction([SESSIONS_STORE, MESSAGES_STORE], 'readonly');
          const metadataReq = tx.objectStore(SESSIONS_STORE).get(id);
          const messagesReq = tx.objectStore(MESSAGES_STORE).get(id);

          tx.oncomplete = () => {
              const metadata = metadataReq.result;
              const messageData = messagesReq.result;

              if (!metadata) {
                  resolve(undefined);
                  return;
              }

              resolve({
                  ...metadata,
                  messages: messageData?.messages || []
              });
          };
          tx.onerror = () => reject(tx.error);
      });
  },

  // ✨ 最重要的修复：极速加载侧边栏！仅从轻量表拉取。
  getAllSessionMetadata: async (): Promise<SavedChatSession[]> => {
      const db = await getDb();
      // SESSIONS_STORE 里面现在没有任何 Blob 和长文本，getAll 将在几毫秒内完成
      const metadataList = await requestToPromise(db.transaction(SESSIONS_STORE, 'readonly').objectStore(SESSIONS_STORE).getAll());
      // 返回时补充一个空的 messages 数组，以满足 Typescript 类型和 UI 组件解构的要求
      return metadataList.map((meta: any) => ({ ...meta, messages: [] }));
  },

  // 搜索逻辑：先搜元数据，没搜到再去重型消息表搜
  searchSessions: async (query: string): Promise<string[]> => {
      const db = await getDb();
      const lowerQuery = query.toLowerCase();
      
      return new Promise((resolve, reject) => {
          const tx = db.transaction([SESSIONS_STORE, MESSAGES_STORE], 'readonly');
          const sessionStore = tx.objectStore(SESSIONS_STORE);
          const messageStore = tx.objectStore(MESSAGES_STORE);
          const results = new Set<string>();
          
          // 1. 先搜索标题
          sessionStore.openCursor().onsuccess = (e) => {
              const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
              if (cursor) {
                  if (cursor.value.title?.toLowerCase().includes(lowerQuery)) {
                      results.add(cursor.value.id);
                  }
                  cursor.continue();
              } else {
                  // 2. 然后搜索内容体（即使这样也比之前全量反序列化到 JS 里进行 find 要节省海量内存）
                  messageStore.openCursor().onsuccess = (msgE) => {
                      const msgCursor = (msgE.target as IDBRequest<IDBCursorWithValue>).result;
                      if (msgCursor) {
                          if (!results.has(msgCursor.value.id)) {
                              const msgs = msgCursor.value.messages || [];
                              const match = msgs.some((m: any) => 
                                  (m.content && m.content.toLowerCase().includes(lowerQuery)) || 
                                  (m.thoughts && m.thoughts.toLowerCase().includes(lowerQuery))
                              );
                              if (match) results.add(msgCursor.value.id);
                          }
                          msgCursor.continue();
                      } else {
                          resolve(Array.from(results));
                      }
                  };
              }
          };
          tx.onerror = () => reject(tx.error);
      });
  },

  // 覆盖写入双表
  setAllSessions: (sessions: SavedChatSession[]) => withWriteLock(async () => {
      const db = await getDb();
      const tx = db.transaction([SESSIONS_STORE, MESSAGES_STORE], 'readwrite');
      const sStore = tx.objectStore(SESSIONS_STORE);
      const mStore = tx.objectStore(MESSAGES_STORE);
      
      sStore.clear();
      mStore.clear();
      
      sessions.forEach(session => {
          const { messages, ...metadata } = session;
          sStore.put(metadata);
          mStore.put({ id: session.id, messages: messages || [] });
      });
      
      return transactionToPromise(tx);
  }),

  // 单个保存
  saveSession: (session: SavedChatSession) => withWriteLock(async () => {
      const db = await getDb();
      const tx = db.transaction([SESSIONS_STORE, MESSAGES_STORE], 'readwrite');
      
      const { messages, ...metadata } = session;
      
      tx.objectStore(SESSIONS_STORE).put(metadata);
      tx.objectStore(MESSAGES_STORE).put({ id: session.id, messages: messages || [] });
      
      return transactionToPromise(tx);
  }),

  // 同步删除双表
  deleteSession: (id: string) => withWriteLock(async () => {
      const db = await getDb();
      const tx = db.transaction([SESSIONS_STORE, MESSAGES_STORE], 'readwrite');
      tx.objectStore(SESSIONS_STORE).delete(id);
      tx.objectStore(MESSAGES_STORE).delete(id);
      return transactionToPromise(tx);
  }),
  
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
      // 加入了新表 MESSAGES_STORE
      const storeNames = [SESSIONS_STORE, MESSAGES_STORE, GROUPS_STORE, SCENARIOS_STORE, KEY_VALUE_STORE, LOGS_STORE];
      const tx = db.transaction(storeNames, 'readwrite');
      for (const storeName of storeNames) tx.objectStore(storeName).clear();
      return transactionToPromise(tx);
  }),
};
