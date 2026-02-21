// utils/folderImportUtils.ts
import { fileToString } from './domainUtils';

const IGNORED_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.ico', '.webp',
  '.mp3', '.wav', '.ogg', '.mp4', '.mov', '.avi', '.webm',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.zip', '.rar', '.7z', '.tar', '.gz',
  '.exe', '.dll', '.so', '.o', '.a', '.obj',
  '.class', '.jar', '.pyc', '.pyd',
  '.ds_store',
  '.eot', '.ttf', '.woff', '.woff2',
]);

const IGNORED_DIRS = new Set(['.git', 'node_modules', '__pycache__', '.vscode', '.idea', 'dist', 'build', 'out', 'target', 'coverage', '.next', '.nuxt']);

interface FileNode {
    name: string;
    children: FileNode[];
    isDirectory: boolean;
}

interface ProcessingEntry {
    path: string;
    // Helper to retrieve content only if the file passes filtering
    getContent: () => Promise<string>;
    size?: number;
}

// Check if a path should be ignored based on directory or extension
const shouldIgnore = (path: string): boolean => {
    const parts = path.split('/').filter(p => p);
    if (parts.some(part => IGNORED_DIRS.has(part) || part.startsWith('.'))) return true;

    const extension = `.${path.split('.').pop()?.toLowerCase()}`;
    if (IGNORED_EXTENSIONS.has(extension)) return true;

    return false;
};

function buildASCIITree(treeData: FileNode[], rootName: string = 'root'): string {
    let structure = `${rootName}\n`;
    const generateLines = (nodes: FileNode[], prefix: string) => {
        // Sort: directories first, then files, alphabetically
        nodes.sort((a, b) => {
            if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
            return a.isDirectory ? -1 : 1;
        });

        nodes.forEach((node, index) => {
            const isLast = index === nodes.length - 1;
            const connector = isLast ? '└── ' : '├── ';
            structure += `${prefix}${connector}${node.name}\n`;
            if (node.isDirectory && node.children.length > 0) {
                const newPrefix = prefix + (isLast ? '    ' : '│   ');
                generateLines(node.children, newPrefix);
            }
        });
    };
    generateLines(treeData, '');
    return structure;
}

/**
 * Unified logic to iterate entries, build the tree structure, and read content.
 */
const processFileEntries = async (entries: ProcessingEntry[], rootName: string): Promise<File> => {
    const nodeMap = new Map<string, FileNode>();
    const roots: FileNode[] = [];
    const processedFiles: { path: string, content: string }[] = [];

    // Max file size for text extraction (2MB)
    const MAX_TEXT_SIZE = 2 * 1024 * 1024;

    for (const entry of entries) {
        // 1. Filtering
        if (shouldIgnore(entry.path)) continue;
        if (entry.size !== undefined && entry.size > MAX_TEXT_SIZE) continue;

        // 2. Tree Building
        const parts = entry.path.split('/').filter(p => p);
        let parentNode: FileNode | undefined = undefined;
        let currentPath = '';

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            currentPath = parts.slice(0, i + 1).join('/');
            
            let currentNode = nodeMap.get(currentPath);
            
            if (!currentNode) {
                const isDir = i < parts.length - 1;
                currentNode = {
                    name: part,
                    children: [],
                    isDirectory: isDir,
                };
                nodeMap.set(currentPath, currentNode);

                if (parentNode) {
                    parentNode.children.push(currentNode);
                } else {
                    roots.push(currentNode);
                }
            }
            parentNode = currentNode;
        }

        // 3. Content Reading (Only for files, i.e., leaf nodes in this iteration context)
        try {
            const content = await entry.getContent();
            processedFiles.push({ path: entry.path, content });
        } catch (e) {
            console.warn(`Failed to read content for ${entry.path}`, e);
        }
    }

    // 4. Output Generation
    // Optimization: If single root folder, promote its name to rootName to avoid "Project/ProjectName/..." redundancy
    let effectiveRootName = rootName;
    let effectiveRoots = roots;

    if (roots.length === 1 && roots[0].isDirectory) {
        effectiveRootName = roots[0].name;
        effectiveRoots = roots[0].children; // Start tree from inside the folder
    }

    const structureString = buildASCIITree(effectiveRoots, effectiveRootName);
    
    let output = "File Structure:\n";
    output += structureString;
    output += "\n\nFile Contents:\n";

    // Sort files by path for consistent output
    processedFiles.sort((a, b) => a.path.localeCompare(b.path));

    for (const file of processedFiles) {
        output += `\n--- START OF FILE ${file.path} ---\n`;
        output += file.content;
        if (file.content && !file.content.endsWith('\n')) {
            output += '\n';
        }
        output += `--- END OF FILE ${file.path} ---\n`;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return new File([output], `${effectiveRootName}-context-${timestamp}.txt`, { type: 'text/plain' });
};

export const generateFolderContext = async (files: FileList | File[] | { file: File, path: string }[]): Promise<File> => {
    const items = Array.isArray(files) ? files : Array.from(files);
    
    const entries: ProcessingEntry[] = items.map(item => {
        let file: File;
        let path: string;

        if ('file' in item && 'path' in item && typeof item.path === 'string') {
             // Custom object from Drag & Drop hook
             file = item.file;
             path = item.path;
        } else {
             // Standard File object
             file = item as File;
             path = (file as any).webkitRelativePath || file.name;
        }
        
        return {
            path,
            size: file.size,
            getContent: () => fileToString(file)
        };
    });

    return processFileEntries(entries, "Project");
};

// Web Worker string for offloading JSZip operations
const ZIP_WORKER_CODE = `
const IGNORED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.ico', '.webp', '.mp3', '.wav', '.ogg', '.mp4', '.mov', '.avi', '.webm', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.zip', '.rar', '.7z', '.tar', '.gz', '.exe', '.dll', '.so', '.o', '.a', '.obj', '.class', '.jar', '.pyc', '.pyd', '.ds_store', '.eot', '.ttf', '.woff', '.woff2']);
const IGNORED_DIRS = new Set(['.git', 'node_modules', '__pycache__', '.vscode', '.idea', 'dist', 'build', 'out', 'target', 'coverage', '.next', '.nuxt']);

const shouldIgnore = (path) => {
    const parts = path.split('/').filter(p => p);
    if (parts.some(part => IGNORED_DIRS.has(part) || part.startsWith('.'))) return true;
    const extension = '.' + (path.split('.').pop() || '').toLowerCase();
    if (IGNORED_EXTENSIONS.has(extension)) return true;
    return false;
};

function buildASCIITree(treeData, rootName = 'root') {
    let structure = rootName + '\\n';
    const generateLines = (nodes, prefix) => {
        nodes.sort((a, b) => {
            if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
            return a.isDirectory ? -1 : 1;
        });
        nodes.forEach((node, index) => {
            const isLast = index === nodes.length - 1;
            const connector = isLast ? '└── ' : '├── ';
            structure += prefix + connector + node.name + '\\n';
            if (node.isDirectory && node.children.length > 0) {
                const newPrefix = prefix + (isLast ? '    ' : '│   ');
                generateLines(node.children, newPrefix);
            }
        });
    };
    generateLines(treeData, '');
    return structure;
}

self.onmessage = async function(e) {
    try {
        const { file, rootName } = e.data;
        // Dynamically import JSZip from esm.sh to avoid bundling in worker string
        const JSZipModule = await import('https://esm.sh/jszip@3.10.1');
        const JSZip = JSZipModule.default || JSZipModule;
        
        const zip = await JSZip.loadAsync(file);
        const zipObjects = Object.values(zip.files);
        
        const processedFiles = [];
        const nodeMap = new Map();
        const roots = [];

        for (const obj of zipObjects) {
            if (obj.dir) continue;
            if (shouldIgnore(obj.name)) continue;

            // Build Tree
            const parts = obj.name.split('/').filter(p => p);
            let parentNode = undefined;
            let currentPath = '';

            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                currentPath = parts.slice(0, i + 1).join('/');
                let currentNode = nodeMap.get(currentPath);
                
                if (!currentNode) {
                    const isDir = i < parts.length - 1;
                    currentNode = { name: part, children: [], isDirectory: isDir };
                    nodeMap.set(currentPath, currentNode);
                    if (parentNode) parentNode.children.push(currentNode);
                    else roots.push(currentNode);
                }
                parentNode = currentNode;
            }
            
            // Read content
            const data = await obj.async('uint8array');
            
            // Binary heuristic
            const checkLimit = Math.min(data.length, 8000);
            let isBinary = false;
            for (let i = 0; i < checkLimit; i++) {
                if (data[i] === 0x00) {
                    isBinary = true;
                    break;
                }
            }
            
            const content = isBinary ? '[Binary content skipped for file: ' + obj.name + ']' : new TextDecoder().decode(data);
            processedFiles.push({ path: obj.name, content });
        }

        let effectiveRootName = rootName;
        let effectiveRoots = roots;

        if (roots.length === 1 && roots[0].isDirectory) {
            effectiveRootName = roots[0].name;
            effectiveRoots = roots[0].children;
        }

        const structureString = buildASCIITree(effectiveRoots, effectiveRootName);
        
        let output = "File Structure:\\n" + structureString + "\\n\\nFile Contents:\\n";
        processedFiles.sort((a, b) => a.path.localeCompare(b.path));

        for (const f of processedFiles) {
            output += "\\n--- START OF FILE " + f.path + " ---\\n";
            output += f.content;
            if (f.content && !f.content.endsWith('\\n')) output += '\\n';
            output += "--- END OF FILE " + f.path + " ---\\n";
        }

        self.postMessage({ type: 'success', output });
    } catch (err) {
        self.postMessage({ type: 'error', error: err.message });
    }
};
`;

export const generateZipContext = async (zipFile: File): Promise<File> => {
    let rootName = zipFile.name.replace(/\.zip$/i, '');
    
    return new Promise<File>((resolve, reject) => {
        const blob = new Blob([ZIP_WORKER_CODE], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        // Important: type 'module' allows dynamic imports inside the worker
        const worker = new Worker(workerUrl, { type: 'module' });

        worker.onmessage = (e) => {
            if (e.data.type === 'success') {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                const file = new File([e.data.output], `${rootName}-context-${timestamp}.txt`, { type: 'text/plain' });
                resolve(file);
            } else {
                reject(new Error(e.data.error));
            }
            worker.terminate();
            URL.revokeObjectURL(workerUrl);
        };

        worker.onerror = (err) => {
            reject(err);
            worker.terminate();
            URL.revokeObjectURL(workerUrl);
        };

        // Pass the file directly to the worker
        worker.postMessage({ file: zipFile, rootName });
    });
};
