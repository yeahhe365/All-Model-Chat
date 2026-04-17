

import { logService } from "../utils/appUtils";
import { UploadedFile } from "../types";

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

async function installDependencies(code) {
    try {
        await pyodide.loadPackagesFromImports(code);
        
        // Manual mapping for common packages that might be missed or named differently
        const micropip = pyodide.pyimport("micropip");
        const packagesToInstall = [];
        
        if (code.includes('sklearn') || code.includes('scikit-learn')) {
            packagesToInstall.push('scikit-learn');
        }
        if (code.includes('scipy')) {
            packagesToInstall.push('scipy');
        }
        if (code.includes('seaborn')) {
            packagesToInstall.push('seaborn');
        }
        
        if (packagesToInstall.length > 0) {
            await micropip.install(packagesToInstall);
        }
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

    // Capture initial file state
    const initialFiles = new Set();
    try {
        const fsFiles = pyodide.FS.readdir('.');
        for (const f of fsFiles) initialFiles.add(f);
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

    // Check for new files generated in file system
    const generatedFiles = [];
    try {
        const finalFiles = pyodide.FS.readdir('.');
        for (const f of finalFiles) {
            if (f === '.' || f === '..') continue;
            if (!initialFiles.has(f)) {
                 // Check if it's a file (not directory)
                 const stat = pyodide.FS.stat(f);
                 if (pyodide.FS.isFile(stat.mode)) {
                     const content = pyodide.FS.readFile(f);
                     generatedFiles.push({
                         name: f,
                         data: arrayBufferToBase64(content),
                         type: getMimeType(f)
                     });
                 }
            }
        }
    } catch (e) {
        console.error("Error reading output files", e);
    }

    self.postMessage({ 
      id, 
      status: 'success', 
      output: stdout.join('\\n'), 
      image: image,
      files: generatedFiles,
      result: result !== undefined ? String(result) : undefined
    });

  } catch (err) {
    self.postMessage({ id, status: 'error', error: err.message });
  }
};
`;

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

export const buildPyodideWorkerScript = (baseUri: string) => {
    const pyodideBaseUrl = new URL('pyodide/', baseUri).toString();

    return {
        pyodideBaseUrl,
        workerCode: WORKER_CODE_TEMPLATE.replace(/__PYODIDE_BASE_URL__/g, pyodideBaseUrl),
    };
};

export class PyodideService {
    private worker: Worker | null = null;
    private pendingPromises = new Map<string, { resolve: (val: void | ExecutionResult) => void; reject: (err: unknown) => void }>();
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
        this.setTimeoutFn = setTimeoutFn ?? setTimeout;
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
            const { pyodideBaseUrl, workerCode } = buildPyodideWorkerScript(this.baseUri ?? document.baseURI);
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
            
            logService.info("Pyodide Worker initialized (Local Mode)", { baseUrl: pyodideBaseUrl });
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
        const filesToMount = await Promise.all(files.map(async (f) => {
            if (!f.rawFile) return null;
            // Only mount text or basic data types, avoid massive videos unless necessary
            // For now we assume if it's passed here, it's intended for analysis
            const buffer = await f.rawFile.arrayBuffer();
            return { name: f.name, data: buffer };
        }));

        const validFiles = filesToMount.filter((f): f is { name: string, data: ArrayBuffer } => f !== null);

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
             const buffers = validFiles.map(f => f.data);
             
             this.worker?.postMessage({ 
                 type: 'MOUNT_FILES', 
                 id, 
                 files: validFiles 
             }, buffers);

             // Shorter timeout for mounting
             this.setTimeoutFn(() => {
                if (this.pendingPromises.has(id)) {
                    this.pendingPromises.delete(id);
                    this.completeRequest(id);
                    this.resetWorker(new Error("File mount timed out"), { skipRejectIds: [id] });
                    // Don't reject, just warn, as execution might still work if files weren't critical
                    console.warn("File mount timed out");
                    resolve(); 
                }
            }, 10000);
        });
    }

    public async runPython(code: string): Promise<ExecutionResult> {
        this.initWorker();
        const id = this.createRequestId();
        
        return new Promise<ExecutionResult>((resolve, reject) => {
            try {
                this.beginRequest(id);
            } catch (error) {
                reject(error);
                return;
            }

            this.pendingPromises.set(id, { resolve: resolve as (val: void | ExecutionResult) => void, reject });
            this.worker?.postMessage({ id, code });
            
            // Timeout safety
            this.setTimeoutFn(() => {
                if (this.pendingPromises.has(id)) {
                    this.pendingPromises.delete(id);
                    this.completeRequest(id);
                    this.resetWorker(new Error("Execution timed out (60s)"), { skipRejectIds: [id] });
                    reject(new Error("Execution timed out (60s)"));
                }
            }, 60000);
        });
    }
}

export const pyodideService = new PyodideService();
