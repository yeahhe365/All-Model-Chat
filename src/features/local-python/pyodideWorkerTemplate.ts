// This string stays as plain worker JavaScript because Pyodide needs a runtime base URL before importScripts().
// __PYODIDE_BASE_URL__ is replaced by buildPyodideWorkerScript at runtime.
export const PYODIDE_WORKER_CODE_TEMPLATE = `
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
    await pyodide.loadPackage(['micropip', 'pandas', 'numpy', 'matplotlib']);
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
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    txt: 'text/plain',
    csv: 'text/csv',
    json: 'application/json',
    py: 'text/x-python',
    js: 'text/javascript',
    html: 'text/html',
    md: 'text/markdown',
    pdf: 'application/pdf',
    zip: 'application/zip',
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
