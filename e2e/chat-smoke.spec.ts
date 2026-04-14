import { expect, test } from '@playwright/test';

const SESSION_ID = 'e2e-pyodide-session';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const installMockWorker = () => {
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
    };

    installMockWorker();
  });
});

test('loads the chat shell and executes a python code block through the browser UI', async ({ page }) => {
  await page.goto('/e2e-seed.html');

  await page.evaluate(async ({ sessionId }) => {
    const dbName = 'AllModelChatDB';
    const dbVersion = 3;
    const sessionStoreName = 'sessions';
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

    const session = {
      id: sessionId,
      title: 'E2E Pyodide Session',
      timestamp: Date.now(),
      messages: [
        {
          id: 'msg-python',
          role: 'model',
          content: '```python\nprint("hello from mocked pyodide")\n```',
          timestamp: new Date(),
        },
      ],
      settings: {
        modelId: 'gemini-2.5-flash',
        temperature: 1,
        topP: 0.95,
        topK: 64,
        showThoughts: true,
        systemInstruction: '',
        ttsVoice: 'Aoede',
        thinkingBudget: 0,
        thinkingLevel: 'HIGH',
        lockedApiKey: null,
        isGoogleSearchEnabled: false,
        isCodeExecutionEnabled: false,
        isUrlContextEnabled: false,
        isDeepSearchEnabled: false,
        isRawModeEnabled: false,
        hideThinkingInContext: false,
        safetySettings: [],
        mediaResolution: 'MEDIA_RESOLUTION_UNSPECIFIED',
      },
    };

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(
        [sessionStoreName, groupStoreName, scenarioStoreName],
        'readwrite',
      );
      tx.objectStore(sessionStoreName).put(session);
      tx.objectStore(groupStoreName).clear();
      tx.objectStore(scenarioStoreName).clear();
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });

    sessionStorage.setItem('activeChatSessionId', sessionId);
  }, { sessionId: SESSION_ID });

  await page.goto(`/chat/${SESSION_ID}`);

  await expect(page.getByLabel('Chat message input')).toBeVisible();
  await expect(page.getByText('E2E Pyodide Session')).toBeVisible();

  const runButton = page.getByTitle('Run Python Code');
  await expect(runButton).toBeVisible();
  await runButton.click();

  await expect(page.getByText('Local Python Output')).toBeVisible();
  await expect(page.getByText('hello from mocked pyodide')).toBeVisible();
});
