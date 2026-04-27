import { logService } from './logService';
import { UploadedFile } from '../types';

// Worker code template. __PYODIDE_BASE_URL__ will be replaced at runtime.
const WORKER_CODE_TEMPLATE = `
const PYODIDE_BASE_URL = "__PYODIDE_BASE_URL__";
importScripts(PYODIDE_BASE_URL + "pyodide.js");

let pyodide = null;
let pyodideReadyPromise = null;

async function loadPyodideAndPackages() {
  if (!pyodide) {
    pyodide = await loadPyodide({
        indexURL: PYODIDE_BASE_URL,
    });
    // Pre-load common data packages for speed
    await pyodide.loadPackage(["micropip", "pandas", "numpy", "matplotlib"]); 
  }
  return pyodide;
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function getMimeType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const mimeMap = {
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'svg': 'image/svg+xml',
        'txt': 'text/plain',
        'csv': 'text/csv',
        'json': 'application/json',
        'py': 'text/x-python',
        'js': 'text/javascript',
        'html': 'text/html',
        'md': 'text/markdown',
        'pdf': 'application/pdf',
        'zip': 'application/zip'
    };
    return mimeMap[ext] || 'application/octet-stream';
}

function ensureDir(path) {
    const segments = path.split('/').filter(Boolean);
    let current = '';
    for (const segment of segments) {
        current += '/' + segment;
        try {
            pyodide.FS.mkdir(current);
        } catch (error) {
            if (error && error.errno === 20) {
                continue;
            }
            throw error;
        }
    }
}

function removePath(path) {
    try {
        const stat = pyodide.FS.stat(path);
        if (pyodide.FS.isDir(stat.mode)) {
            const entries = pyodide.FS.readdir(path);
            for (const entry of entries) {
                if (entry === '.' || entry === '..') continue;
                removePath(path + '/' + entry);
            }
            pyodide.FS.rmdir(path);
            return;
        }
        pyodide.FS.unlink(path);
    } catch (error) {
        // Best-effort cleanup
    }
}

function listFilesRecursively(basePath, currentPath = '.') {
    const files = [];
    const entries = pyodide.FS.readdir(currentPath);
    for (const entry of entries) {
        if (entry === '.' || entry === '..') continue;
        const absolutePath = currentPath === '.' ? './' + entry : currentPath + '/' + entry;
        const stat = pyodide.FS.stat(absolutePath);
        if (pyodide.FS.isDir(stat.mode)) {
            files.push(...listFilesRecursively(basePath, absolutePath));
        } else if (pyodide.FS.isFile(stat.mode)) {
            const relativePath = absolutePath.replace(/^\\.\\//, '');
            files.push(relativePath);
        }
    }
    return files;
}

async function installDependencies(code) {
    try {
        await pyodide.loadPackagesFromImports(code);
        const packagesToLoad = [];
        const packagesToInstall = [];

        if (code.includes('matplotlib')) {
            packagesToLoad.push('matplotlib');
        }
        if (code.includes('pandas')) {
            packagesToLoad.push('pandas');
        }
        if (code.includes('numpy')) {
            packagesToLoad.push('numpy');
        }
        
        if (code.includes('sklearn') || code.includes('scikit-learn')) {
            packagesToInstall.push('scikit-learn');
        }
        if (code.includes('scipy')) {
            packagesToInstall.push('scipy');
        }
        if (code.includes('seaborn')) {
            packagesToInstall.push('seaborn');
        }

        if (packagesToLoad.length > 0) {
            await pyodide.loadPackage([...new Set(packagesToLoad)]);
        }

        if (packagesToInstall.length === 0) {
            return;
        }

        // Load micropip lazily so simple scripts without extra dependencies do not fail.
        await pyodide.loadPackage('micropip');
        const micropip = pyodide.pyimport("micropip");
        
        await micropip.install(packagesToInstall);
    } catch (e) {
        console.warn("Dependency resolution warning:", e);
        throw new Error("Failed to install dependencies: " + e.message);
    }
}

self.onmessage = async (event) => {
  const { type, id, code, files } = event.data;

  try {
    if (!pyodideReadyPromise) {
      pyodideReadyPromise = loadPyodideAndPackages();
    }
    await pyodideReadyPromise;

    if (type === 'MOUNT_FILES') {
        if (files && Array.isArray(files)) {
            for (const file of files) {
                // file.data is ArrayBuffer transferred
                pyodide.FS.writeFile(file.name, new Uint8Array(file.data));
            }
        }
        self.postMessage({ id, status: 'success', type: 'MOUNT_COMPLETE' });
        return;
    }

    const previousDir = pyodide.FS.cwd();
    const runDir = '/tmp/local-python-' + id;

    removePath(runDir);
    ensureDir(runDir);

    try {
      if (files && Array.isArray(files)) {
          for (const file of files) {
              const normalizedName = String(file.name || '').replace(/^\\/+/, '');
              if (!normalizedName) continue;
              const parentDir = normalizedName.includes('/')
                  ? runDir + '/' + normalizedName.split('/').slice(0, -1).join('/')
                  : runDir;
              ensureDir(parentDir);
              pyodide.FS.writeFile(runDir + '/' + normalizedName, new Uint8Array(file.data));
          }
      }

      pyodide.FS.chdir(runDir);

      const initialFiles = new Set();
      try {
          const fsFiles = listFilesRecursively(runDir);
          for (const file of fsFiles) initialFiles.add(file);
      } catch (e) { /* ignore */ }

      // Reset stdout/stderr capture
      let stdout = [];
      pyodide.setStdout({ batched: (msg) => stdout.push(msg) });
      pyodide.setStderr({ batched: (msg) => stdout.push(msg) });

      // Auto-install packages detected in imports
      await installDependencies(code);

      // Setup matplotlib backend if needed
      await pyodide.runPythonAsync(\`
        try:
          import matplotlib
          matplotlib.use("Agg")
          import matplotlib.pyplot as plt
          plt.clf()
        except ImportError:
          pass
      \`);

      // Execute User Code
      const result = await pyodide.runPythonAsync(code);
      
      // Check for generated plots via matplotlib
      let image = null;
      const hasPlot = pyodide.runPython(\`
        try:
          import matplotlib.pyplot as plt
          len(plt.get_fignums()) > 0
        except:
          False
      \`);

      if (hasPlot) {
         pyodide.runPython(\`
           import io, base64
           buf = io.BytesIO()
           plt.savefig(buf, format='png', bbox_inches='tight')
           buf.seek(0)
           img_str = base64.b64encode(buf.read()).decode('utf-8')
           plt.clf()
         \`);
         image = pyodide.globals.get('img_str');
         pyodide.runPython("del img_str"); // Cleanup
      }

      // Check for new files generated in the execution workspace
      const generatedFiles = [];
      try {
          const finalFiles = listFilesRecursively(runDir);
          for (const filePath of finalFiles) {
              if (!initialFiles.has(filePath)) {
                   const content = pyodide.FS.readFile(filePath);
                   generatedFiles.push({
                       name: filePath,
                       data: arrayBufferToBase64(content),
                       type: getMimeType(filePath)
                   });
              }
          }
      } catch (e) {
          console.error("Error reading output files", e);
      }

      if (image && generatedFiles.some((file) => file.type.startsWith('image/'))) {
          image = null;
      }

      self.postMessage({ 
        id, 
        status: 'success', 
        output: stdout.join('\\n'), 
        image: image,
        files: generatedFiles,
        result: result !== undefined ? String(result) : undefined
      });
    } finally {
      try {
          pyodide.FS.chdir(previousDir);
      } catch (error) {
          // ignore best-effort restore
      }
      removePath(runDir);
    }

  } catch (err) {
    self.postMessage({ id, status: 'error', error: err.message });
  }
};
`;

const DEFAULT_PYODIDE_BASE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/';

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

export const buildPyodideWorkerScript = (baseUri: string) => {
  const pyodideBaseUrl = /(?:\/pyodide\/|\/full\/)$/.test(baseUri) ? baseUri : new URL('pyodide/', baseUri).toString();

  return {
    pyodideBaseUrl,
    workerCode: WORKER_CODE_TEMPLATE.replace(/__PYODIDE_BASE_URL__/g, pyodideBaseUrl),
  };
};

const getBrowserAppBaseUri = () => {
  return DEFAULT_PYODIDE_BASE_URL;
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
    this.createObjectUrl = createObjectUrl ?? ((blob) => URL.createObjectURL(blob));
    this.revokeObjectUrl = revokeObjectUrl ?? ((url) => URL.revokeObjectURL(url));
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
      const appBaseUri = this.baseUri ?? getBrowserAppBaseUri();
      const { pyodideBaseUrl, workerCode } = buildPyodideWorkerScript(appBaseUri);
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
          console.warn('File mount timed out');
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
