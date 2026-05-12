import { logService } from '@/services/logService';
import { createManagedObjectUrl, releaseManagedObjectUrl } from '@/services/objectUrlManager';
import { type UploadedFile } from '@/types';
import { getPyodideBaseUrl } from '@/runtime/runtimeConfig';
import { PYODIDE_WORKER_CODE_TEMPLATE } from './pyodideWorkerTemplate';

export interface PyodideFile {
  name: string;
  data: string; // Base64
  type: string;
}

export interface ExecutionResult {
  output: string;
  image?: string;
  files?: PyodideFile[];
  result?: string;
  error?: string;
  status: 'success' | 'error';
}

interface PyodideServiceDependencies {
  baseUri?: string;
  createWorker?: (url: string) => Worker;
  createObjectUrl?: (blob: Blob) => string;
  revokeObjectUrl?: (url: string) => void;
  setTimeoutFn?: typeof setTimeout;
  createRequestId?: () => string;
}

interface RunPythonOptions {
  files?: UploadedFile[];
  abortSignal?: AbortSignal;
}

interface BuildPyodideWorkerScriptOptions {
  baseUriIsPyodideBaseUrl?: boolean;
}

const ensureTrailingSlash = (value: string) => value.replace(/\/?$/, '/');

export const buildPyodideWorkerScript = (baseUri: string, options: BuildPyodideWorkerScriptOptions = {}) => {
  const normalizedBaseUri =
    options.baseUriIsPyodideBaseUrl || /(?:\/pyodide|\/full)\/?$/.test(baseUri)
      ? ensureTrailingSlash(baseUri)
      : new URL('pyodide/', baseUri).toString();

  return {
    pyodideBaseUrl: normalizedBaseUri,
    workerCode: PYODIDE_WORKER_CODE_TEMPLATE.replace(/__PYODIDE_BASE_URL__/g, normalizedBaseUri),
  };
};

const getBrowserPyodideBaseUri = () => {
  const runtimePyodideBaseUrl = getPyodideBaseUrl();
  if (runtimePyodideBaseUrl) {
    return { baseUri: runtimePyodideBaseUrl, baseUriIsPyodideBaseUrl: true };
  }

  const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'http://localhost';
  return {
    baseUri: new URL('pyodide/', new URL(import.meta.env.BASE_URL || '/', origin)).toString(),
    baseUriIsPyodideBaseUrl: true,
  };
};

export class PyodideService {
  private worker: Worker | null = null;
  private pendingPromises = new Map<
    string,
    { resolve: (val: void | ExecutionResult) => void; reject: (err: unknown) => void }
  >();
  private activeRequestId: string | null = null;
  private readonly baseUri: string | undefined;
  private readonly createWorker: (url: string) => Worker;
  private readonly createObjectUrl: (blob: Blob) => string;
  private readonly revokeObjectUrl: (url: string) => void;
  private readonly setTimeoutFn: typeof setTimeout;
  private readonly createRequestId: () => string;

  constructor({
    baseUri,
    createWorker,
    createObjectUrl,
    revokeObjectUrl,
    setTimeoutFn,
    createRequestId,
  }: PyodideServiceDependencies = {}) {
    this.baseUri = baseUri;
    this.createWorker = createWorker ?? ((url) => new Worker(url));
    this.createObjectUrl = createObjectUrl ?? createManagedObjectUrl;
    this.revokeObjectUrl = revokeObjectUrl ?? releaseManagedObjectUrl;
    this.setTimeoutFn = setTimeoutFn ?? globalThis.setTimeout.bind(globalThis);
    this.createRequestId = createRequestId ?? (() => Math.random().toString(36).substring(7));
  }

  private normalizeWorkerError(error: unknown, fallbackMessage: string) {
    if (error instanceof Error) {
      return error;
    }

    if (typeof error === 'string') {
      return new Error(error);
    }

    if (
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof (error as { message?: unknown }).message === 'string'
    ) {
      return new Error((error as { message: string }).message);
    }

    return new Error(fallbackMessage);
  }

  private createAbortError() {
    const abortError = new Error('Execution aborted.');
    abortError.name = 'AbortError';
    return abortError;
  }

  private beginRequest(id: string) {
    if (this.activeRequestId) {
      throw new Error('Pyodide request already in progress');
    }

    this.activeRequestId = id;
  }

  private completeRequest(id: string) {
    if (this.activeRequestId === id) {
      this.activeRequestId = null;
    }
  }

  private terminateWorker() {
    if (!this.worker) {
      return;
    }

    this.worker.onmessage = null;
    this.worker.onerror = null;
    this.worker.onmessageerror = null;
    this.worker.terminate();
    this.worker = null;
  }

  private resetWorker(reason: unknown, options?: { skipRejectIds?: string[] }) {
    const normalizedError = this.normalizeWorkerError(reason, 'Pyodide worker terminated unexpectedly.');
    const skipRejectIds = new Set(options?.skipRejectIds ?? []);

    this.terminateWorker();
    this.activeRequestId = null;

    for (const [id, promise] of this.pendingPromises.entries()) {
      if (skipRejectIds.has(id)) {
        continue;
      }

      promise.reject(normalizedError);
      this.pendingPromises.delete(id);
    }
  }

  private initWorker() {
    if (!this.worker) {
      const workerScriptInput = this.baseUri
        ? { baseUri: this.baseUri, baseUriIsPyodideBaseUrl: false }
        : getBrowserPyodideBaseUri();
      const { pyodideBaseUrl, workerCode } = buildPyodideWorkerScript(workerScriptInput.baseUri, {
        baseUriIsPyodideBaseUrl: workerScriptInput.baseUriIsPyodideBaseUrl,
      });
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const url = this.createObjectUrl(blob);

      this.worker = this.createWorker(url);
      this.worker.onmessage = this.handleMessage.bind(this);
      this.worker.onerror = (event) => {
        this.resetWorker(event, { skipRejectIds: [] });
      };
      this.worker.onmessageerror = (event) => {
        this.resetWorker(event, { skipRejectIds: [] });
      };

      // Clean up the object URL after worker creation
      this.revokeObjectUrl(url);

      logService.info('Pyodide Worker initialized (Local Mode)', { baseUrl: pyodideBaseUrl });
    }
  }

  private handleMessage(event: MessageEvent) {
    const { id, status, output, image, files, result, error, type } = event.data;
    const promise = this.pendingPromises.get(id);

    if (promise) {
      this.pendingPromises.delete(id);
      this.completeRequest(id);

      if (status === 'success') {
        if (type === 'MOUNT_COMPLETE') {
          promise.resolve(undefined);
        } else {
          promise.resolve({ output, image, files, result, status: 'success' });
        }
      } else {
        promise.reject(error);
      }
    }
  }

  public async mountFiles(files: UploadedFile[]): Promise<void> {
    this.initWorker();
    const id = this.createRequestId();

    // Filter and read files that have raw data
    const filesToMount = await Promise.all(
      files.map(async (f) => {
        if (!f.rawFile) return null;
        // Only mount text or basic data types, avoid massive videos unless necessary
        // For now we assume if it's passed here, it's intended for analysis
        const buffer = await f.rawFile.arrayBuffer();
        return { name: f.name, data: buffer };
      }),
    );

    const validFiles = filesToMount.filter((f): f is { name: string; data: ArrayBuffer } => f !== null);

    if (validFiles.length === 0) return;

    return new Promise<void>((resolve, reject) => {
      try {
        this.beginRequest(id);
      } catch (error) {
        reject(error);
        return;
      }

      this.pendingPromises.set(id, { resolve: resolve as (val: void | ExecutionResult) => void, reject });

      // Use transferables for efficiency to avoid copying large buffers
      const buffers = validFiles.map((f) => f.data);

      this.worker?.postMessage(
        {
          type: 'MOUNT_FILES',
          id,
          files: validFiles,
        },
        buffers,
      );

      // Shorter timeout for mounting
      this.setTimeoutFn(() => {
        if (this.pendingPromises.has(id)) {
          this.pendingPromises.delete(id);
          this.completeRequest(id);
          this.resetWorker(new Error('File mount timed out'), { skipRejectIds: [id] });
          // Don't reject, just warn, as execution might still work if files weren't critical
          logService.warn('File mount timed out');
          resolve();
        }
      }, 10000);
    });
  }

  private async readRawFileBuffer(rawFile: Blob, abortSignal?: AbortSignal): Promise<ArrayBuffer> {
    const abortError = this.createAbortError();

    if (abortSignal?.aborted) {
      throw abortError;
    }

    const streamFn = (rawFile as Blob & { stream?: () => ReadableStream<Uint8Array> }).stream;
    if (!abortSignal || typeof streamFn !== 'function') {
      const buffer = await rawFile.arrayBuffer();
      if (abortSignal?.aborted) {
        throw abortError;
      }
      return buffer;
    }

    const reader = streamFn.call(rawFile).getReader();
    let rejectAbort: ((reason?: unknown) => void) | null = null;
    const abortPromise = new Promise<never>((_, reject) => {
      rejectAbort = reject;
    });
    const handleAbort = () => {
      void reader.cancel(abortError).catch(() => undefined);
      rejectAbort?.(abortError);
    };
    abortSignal.addEventListener('abort', handleAbort, { once: true });

    try {
      const chunks: Uint8Array[] = [];
      let totalLength = 0;

      while (true) {
        const { done, value } = await Promise.race([reader.read(), abortPromise]);
        if (done) {
          break;
        }

        if (value) {
          chunks.push(value);
          totalLength += value.byteLength;
        }
      }

      if (abortSignal.aborted) {
        throw abortError;
      }

      const combined = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.byteLength;
      }

      return combined.buffer;
    } catch (error) {
      if (abortSignal.aborted) {
        throw abortError;
      }
      throw error;
    } finally {
      abortSignal.removeEventListener('abort', handleAbort);
      try {
        reader.releaseLock();
      } catch {
        // no-op
      }
    }
  }

  private async prepareExecutionFiles(files: UploadedFile[] = [], abortSignal?: AbortSignal) {
    const preparedFiles: Array<{ name: string; data: ArrayBuffer }> = [];
    const abortError = this.createAbortError();

    for (const file of files) {
      if (!file.rawFile) continue;
      if (abortSignal?.aborted) {
        throw abortError;
      }

      const buffer = await this.readRawFileBuffer(file.rawFile, abortSignal);
      preparedFiles.push({ name: file.name, data: buffer });
    }

    return preparedFiles;
  }

  public async runPython(code: string, options: RunPythonOptions = {}): Promise<ExecutionResult> {
    this.initWorker();
    const id = this.createRequestId();
    const abortSignal = options.abortSignal;
    const abortError = this.createAbortError();

    if (abortSignal?.aborted) {
      throw abortError;
    }
    this.beginRequest(id);

    try {
      const files = await this.prepareExecutionFiles(options.files, abortSignal);
      if (abortSignal?.aborted) {
        throw abortError;
      }

      return await new Promise<ExecutionResult>((resolve, reject) => {
        const cleanupAbortListener = () => {
          abortSignal?.removeEventListener('abort', handleAbort);
        };
        const resolveWithCleanup = (value: void | ExecutionResult) => {
          cleanupAbortListener();
          resolve(value as ExecutionResult);
        };
        const rejectWithCleanup = (error: unknown) => {
          cleanupAbortListener();
          reject(error);
        };
        const handleAbort = () => {
          if (!this.pendingPromises.has(id)) {
            return;
          }
          this.resetWorker(abortError);
        };

        abortSignal?.addEventListener('abort', handleAbort, { once: true });

        this.pendingPromises.set(id, {
          resolve: resolveWithCleanup as (val: void | ExecutionResult) => void,
          reject: rejectWithCleanup,
        });
        try {
          const buffers = files.map((file) => file.data);
          this.worker?.postMessage({ id, type: 'RUN_PYTHON', code, files }, buffers);
        } catch (error) {
          this.pendingPromises.delete(id);
          this.completeRequest(id);
          rejectWithCleanup(error);
          return;
        }

        // Timeout safety
        this.setTimeoutFn(() => {
          if (this.pendingPromises.has(id)) {
            this.pendingPromises.delete(id);
            this.completeRequest(id);
            this.resetWorker(new Error('Execution timed out (60s)'), { skipRejectIds: [id] });
            rejectWithCleanup(new Error('Execution timed out (60s)'));
          }
        }, 60000);
      });
    } catch (error) {
      this.completeRequest(id);
      throw error;
    }
  }
}

export const pyodideService = new PyodideService();
