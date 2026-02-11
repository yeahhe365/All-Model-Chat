
import { logService } from "../utils/appUtils";

// We use a Blob for the worker to avoid complex build configuration for worker files.
const WORKER_CODE = `
importScripts("https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js");

let pyodide = null;
let pyodideReadyPromise = null;

async function loadPyodideAndPackages() {
  if (!pyodide) {
    pyodide = await loadPyodide();
    await pyodide.loadPackage(["micropip", "pandas", "numpy"]); // Pre-load common data packages
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

self.onmessage = async (event) => {
  const { id, code } = event.data;

  try {
    if (!pyodideReadyPromise) {
      pyodideReadyPromise = loadPyodideAndPackages();
    }
    await pyodideReadyPromise;

    // Capture initial file state
    const initialFiles = new Set();
    try {
        const files = pyodide.FS.readdir('.');
        for (const f of files) initialFiles.add(f);
    } catch (e) { /* ignore */ }

    // Reset stdout/stderr capture
    let stdout = [];
    pyodide.setStdout({ batched: (msg) => stdout.push(msg) });
    pyodide.setStderr({ batched: (msg) => stdout.push(msg) });

    // Auto-install packages detected in imports
    try {
      await pyodide.loadPackagesFromImports(code);
    } catch (e) {
      // Ignore package loading errors (might be standard libs)
    }

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
            const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
            const url = URL.createObjectURL(blob);
            this.worker = new Worker(url);
            this.worker.onmessage = this.handleMessage.bind(this);
            URL.revokeObjectURL(url);
            logService.info("Pyodide Worker initialized");
        }
    }

    private handleMessage(event: MessageEvent) {
        const { id, status, output, image, files, result, error } = event.data;
        const promise = this.pendingPromises.get(id);
        
        if (promise) {
            if (status === 'success') {
                promise.resolve({ output, image, files, result });
            } else {
                promise.reject(error);
            }
            this.pendingPromises.delete(id);
        }
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
