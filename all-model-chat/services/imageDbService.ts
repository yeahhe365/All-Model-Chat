import { UploadedFile } from '../types';

const DB_NAME = 'ImageStoreDB';
const DB_VERSION = 1;
const STORE_NAME = 'images';

interface StoredImage {
    id: string; // file.id
    sessionId: string;
    dataUrl: string;
}

class ImageDbService {
    private dbPromise: Promise<IDBDatabase>;

    constructor() {
        this.dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('IndexedDB error:', request.error);
                reject('Error opening IndexedDB.');
            };

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    store.createIndex('sessionId', 'sessionId', { unique: false });
                }
            };
        });
    }

    private async getStore(mode: IDBTransactionMode): Promise<IDBObjectStore> {
        const db = await this.dbPromise;
        return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
    }

    async addImage(sessionId: string, file: UploadedFile): Promise<void> {
        if (!file.dataUrl || !file.dataUrl.startsWith('data:image')) return;
        
        const store = await this.getStore('readwrite');
        const imageToStore: StoredImage = {
            id: file.id,
            sessionId: sessionId,
            dataUrl: file.dataUrl,
        };
        store.put(imageToStore);
    }

    async getImage(id: string): Promise<StoredImage | undefined> {
        const store = await this.getStore('readonly');
        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getImagesForSession(sessionId: string): Promise<StoredImage[]> {
        const store = await this.getStore('readonly');
        const index = store.index('sessionId');
        return new Promise((resolve, reject) => {
            const request = index.getAll(sessionId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    async deleteImagesForSession(sessionId: string): Promise<void> {
        const store = await this.getStore('readwrite');
        const index = store.index('sessionId');
        const request = index.openKeyCursor(IDBKeyRange.only(sessionId));

        request.onsuccess = () => {
            const cursor = request.result;
            if (cursor) {
                store.delete(cursor.primaryKey);
                cursor.continue();
            }
        };
        
        return new Promise((resolve, reject) => {
            const transaction = store.transaction;
            transaction.oncomplete = () => resolve();
            transaction.onerror = (event) => {
                console.error(`Error deleting images for session ${sessionId}:`, (event.target as IDBRequest).error);
                reject((event.target as IDBRequest).error);
            };
        });
    }

    async getAllSessionIds(): Promise<string[]> {
        const store = await this.getStore('readonly');
        const index = store.index('sessionId');
        return new Promise((resolve, reject) => {
            const keys: string[] = [];
            const request = index.openKeyCursor(null, 'nextunique');
            request.onsuccess = () => {
                const cursor = request.result;
                if (cursor) {
                    keys.push(cursor.key as string);
                    cursor.continue();
                } else {
                    resolve(keys);
                }
            };
            request.onerror = () => reject(request.error);
        });
    }
}

export const imageDbService = new ImageDbService();
