
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

interface ExecutionResult {
    output: string;
    image?: string;
    files?: PyodideFile[];
    result?: string;
    error?: string;
    status: 'success' | 'error';
}

class PyodideService {
    private worker: Worker | null = null;
    private pendingPromises = new Map<string, { resolve: (val: any) => void, reject: (err: any) => void }>();

    private initWorker() {
        if (!this.worker) {
            // Dynamically construct the base URL for Pyodide based on the current location.
            // This ensures it works both in dev (localhost) and production (domain.com/base/pyodide/).
            const basePath = import.meta.env.BASE_URL || '/';
            const cleanBasePath = basePath.endsWith('/') ? basePath : basePath + '/';
            const pyodideBaseUrl = `${window.location.origin}${cleanBasePath}pyodide/`;

            const workerCode = WORKER_CODE_TEMPLATE.replace(/__PYODIDE_BASE_URL__/g, pyodideBaseUrl);
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            const url = URL.createObjectURL(blob);
            
            this.worker = new Worker(url);
            this.worker.onmessage = this.handleMessage.bind(this);
            
            // Clean up the object URL after worker creation
            URL.revokeObjectURL(url);
            
            logService.info("Pyodide Worker initialized (Local Mode)", { baseUrl: pyodideBaseUrl });
        }
    }

    private handleMessage(event: MessageEvent) {
        const { id, status, output, image, files, result, error, type } = event.data;
        const promise = this.pendingPromises.get(id);
        
        if (promise) {
            if (status === 'success') {
                if (type === 'MOUNT_COMPLETE') {
                    promise.resolve(true);
                } else {
                    promise.resolve({ output, image, files, result });
                }
            } else {
                promise.reject(error);
            }
            this.pendingPromises.delete(id);
        }
    }

    public async mountFiles(files: UploadedFile[]): Promise<void> {
        this.initWorker();
        const id = Math.random().toString(36).substring(7);

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
             this.pendingPromises.set(id, { resolve, reject });
             
             // Use transferables for efficiency to avoid copying large buffers
             const buffers = validFiles.map(f => f.data);
             
             this.worker?.postMessage({ 
                 type: 'MOUNT_FILES', 
                 id, 
                 files: validFiles 
             }, buffers);

             // Shorter timeout for mounting
             setTimeout(() => {
                if (this.pendingPromises.has(id)) {
                    this.pendingPromises.delete(id);
                    // Don't reject, just warn, as execution might still work if files weren't critical
                    console.warn("File mount timed out");
                    resolve(); 
                }
            }, 10000);
        });
    }

    public async runPython(code: string): Promise<ExecutionResult> {
        this.initWorker();
        const id = Math.random().toString(36).substring(7);
        
        return new Promise<ExecutionResult>((resolve, reject) => {
            this.pendingPromises.set(id, { resolve, reject });
            this.worker?.postMessage({ id, code });
            
            // Timeout safety
            setTimeout(() => {
                if (this.pendingPromises.has(id)) {
                    this.pendingPromises.delete(id);
                    reject(new Error("Execution timed out (60s)"));
                }
            }, 60000);
        });
    }
}

export const pyodideService = new PyodideService();
