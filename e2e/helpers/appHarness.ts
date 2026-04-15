import type { Page } from '@playwright/test';

const DB_NAME = 'AllModelChatDB';
const DB_VERSION = 4;
const ACTIVE_SESSION_STORAGE_KEY = 'activeChatSessionId';

export interface SeededSession {
  id: string;
  title: string;
  timestamp?: number;
  messages: Array<{
    id: string;
    role: 'user' | 'model' | 'error';
    content: string;
    timestamp?: string;
    files?: unknown[];
  }>;
  settings: Record<string, unknown>;
}

export type SeededAppSettings = Record<string, unknown>;

export async function installMockPyodideWorker(page: Page) {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;

    class MockPyodideWorker {
      private delegate: Worker | null = null;
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;

      constructor(scriptUrl: string | URL, options?: WorkerOptions) {
        const url = String(scriptUrl);

        if (!url.startsWith('blob:')) {
          this.delegate = new NativeWorker(scriptUrl, options);
          this.delegate.onmessage = (event) => this.onmessage?.(event);
          this.delegate.onerror = (event) => this.onerror?.(event);
        }
      }

      postMessage(message: Record<string, unknown>, transfer?: Transferable[]) {
        if (this.delegate) {
          this.delegate.postMessage(message, transfer ?? []);
          return;
        }

        if (message.type === 'MOUNT_FILES') {
          queueMicrotask(() => {
            this.onmessage?.(
              new MessageEvent('message', {
                data: { id: message.id, status: 'success', type: 'MOUNT_COMPLETE' },
              }),
            );
          });
          return;
        }

        queueMicrotask(() => {
          this.onmessage?.(
            new MessageEvent('message', {
              data: {
                id: message.id,
                status: 'success',
                output: 'hello from mocked pyodide',
                files: [],
              },
            }),
          );
        });
      }

      terminate() {
        this.delegate?.terminate();
      }

      addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
        if (this.delegate) {
          this.delegate.addEventListener(type, listener);
          return;
        }

        if (type === 'message') {
          this.onmessage =
            typeof listener === 'function'
              ? (listener as (event: MessageEvent) => void)
              : (event) => listener.handleEvent(event);
        }

        if (type === 'error') {
          this.onerror =
            typeof listener === 'function'
              ? (listener as (event: Event) => void)
              : (event) => listener.handleEvent(event);
        }
      }

      removeEventListener() {}
    }

    Object.defineProperty(window, 'Worker', {
      configurable: true,
      writable: true,
      value: MockPyodideWorker,
    });
  });
}

export async function seedAppState(
  page: Page,
  options: {
    session?: SeededSession;
    appSettings?: SeededAppSettings;
  } = {},
) {
  await page.goto('/e2e-seed.html');

  await page.evaluate(
    async ({ dbName, dbVersion, activeSessionStorageKey, session, appSettings }) => {
      const sessionStoreName = 'sessions';
      const filesStoreName = 'files';
      const groupStoreName = 'groups';
      const scenarioStoreName = 'scenarios';
      const keyValueStoreName = 'keyValueStore';
      const logsStoreName = 'logs';

      await new Promise<void>((resolve) => {
        const deleteRequest = indexedDB.deleteDatabase(dbName);
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => resolve();
        deleteRequest.onblocked = () => resolve();
      });

      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);

        request.onupgradeneeded = () => {
          const nextDb = request.result;

          if (!nextDb.objectStoreNames.contains(sessionStoreName)) {
            nextDb.createObjectStore(sessionStoreName, { keyPath: 'id' });
          }
          if (!nextDb.objectStoreNames.contains(filesStoreName)) {
            const filesStore = nextDb.createObjectStore(filesStoreName, { keyPath: 'id' });
            filesStore.createIndex('sessionId', 'sessionId', { unique: false });
          }
          if (!nextDb.objectStoreNames.contains(groupStoreName)) {
            nextDb.createObjectStore(groupStoreName, { keyPath: 'id' });
          }
          if (!nextDb.objectStoreNames.contains(scenarioStoreName)) {
            nextDb.createObjectStore(scenarioStoreName, { keyPath: 'id' });
          }
          if (!nextDb.objectStoreNames.contains(keyValueStoreName)) {
            nextDb.createObjectStore(keyValueStoreName);
          }
          if (!nextDb.objectStoreNames.contains(logsStoreName)) {
            const logStore = nextDb.createObjectStore(logsStoreName, {
              keyPath: 'id',
              autoIncrement: true,
            });
            logStore.createIndex('timestamp', 'timestamp', { unique: false });
          }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(
          [sessionStoreName, filesStoreName, groupStoreName, scenarioStoreName, keyValueStoreName],
          'readwrite',
        );
        tx.objectStore(filesStoreName).clear();
        tx.objectStore(groupStoreName).clear();
        tx.objectStore(scenarioStoreName).clear();

        if (appSettings) {
          tx.objectStore(keyValueStoreName).put(appSettings, 'appSettings');
        }

        if (session) {
          tx.objectStore(sessionStoreName).put({
            ...session,
            timestamp: session.timestamp ?? Date.now(),
            messages: session.messages.map((message) => ({
              ...message,
              timestamp: message.timestamp ? new Date(message.timestamp) : new Date(),
            })),
          });
          sessionStorage.setItem(activeSessionStorageKey, session.id);
        } else {
          tx.objectStore(sessionStoreName).clear();
          sessionStorage.removeItem(activeSessionStorageKey);
        }

        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    },
    {
      dbName: DB_NAME,
      dbVersion: DB_VERSION,
      activeSessionStorageKey: ACTIVE_SESSION_STORAGE_KEY,
      session: options.session,
      appSettings: options.appSettings,
    },
  );
}

export async function mockGeminiTextResponses(
  page: Page,
  options: {
    nonStreamText?: string;
    streamedChunks?: string[];
  },
) {
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    const normalizedUrl = url.toLowerCase();

    if (!normalizedUrl.includes('generatecontent')) {
      await route.continue();
      return;
    }

    if (
      normalizedUrl.includes('streamgeneratecontent') ||
      normalizedUrl.includes('generatecontentstream')
    ) {
      const chunks = options.streamedChunks ?? ['Streamed ', 'response'];
      const body = `${chunks
        .map(
          (chunk) =>
            `data: ${JSON.stringify({
              candidates: [{ content: { parts: [{ text: chunk }] } }],
            })}\n\n`,
        )
        .join('')}data: ${JSON.stringify({
        candidates: [{ content: { parts: [] } }],
        usageMetadata: {
          promptTokenCount: 4,
          candidatesTokenCount: 2,
          totalTokenCount: 6,
        },
      })}\n\n`;

      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body,
        headers: {
          'access-control-allow-origin': '*',
          'cache-control': 'no-cache',
        },
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: {
        'access-control-allow-origin': '*',
      },
      body: JSON.stringify({
        candidates: [
          {
            content: {
              parts: [{ text: options.nonStreamText ?? 'Mocked non-stream response' }],
            },
          },
        ],
        usageMetadata: {
          promptTokenCount: 4,
          candidatesTokenCount: 2,
          totalTokenCount: 6,
        },
      }),
    });
  });
}
