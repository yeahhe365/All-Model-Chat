
import { fileToString } from './domainUtils';
import JSZip from 'jszip';
import { ProjectContext, ProjectContextFile, FileTreeNode } from '../types/chat';

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

// Internal node type for legacy tree building (kept for backward compat)
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

// Entry type for agentic mode (stores File ref instead of content getter)
interface AgenticEntry {
    path: string;
    file: File;
    size: number;
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

export const generateZipContext = async (zipFile: File): Promise<File> => {
    const zip = await JSZip.loadAsync(zipFile);
    const zipObjects = Object.values(zip.files) as JSZip.JSZipObject[];

    const entries: ProcessingEntry[] = zipObjects
        .filter(obj => !obj.dir) // Filter out directory entries
        .map(obj => ({
            path: obj.name,
            getContent: async () => {
                // Read as Uint8Array first to detect binary content
                const data = await obj.async('uint8array');

                // Heuristic: Check for null bytes (0x00) in the first 8KB to detect binary files
                const checkLimit = Math.min(data.length, 8000);
                for (let i = 0; i < checkLimit; i++) {
                    if (data[i] === 0x00) {
                        return `[Binary content skipped for file: ${obj.name}]`;
                    }
                }

                // If safe, decode as UTF-8 text
                return new TextDecoder().decode(data);
            }
        }));

    let rootName = zipFile.name.replace(/\.zip$/i, '');
    return processFileEntries(entries, rootName);
};

/**
 * Build a ProjectContext from a ZIP file (agentic mode).
 * This avoids converting content into a single text file and instead
 * creates file references for on-demand reading via read_file.
 */
export const buildProjectContextFromZip = async (zipFile: File): Promise<ProjectContext> => {
    const zip = await JSZip.loadAsync(zipFile);
    const zipObjects = Object.values(zip.files).filter(obj => !obj.dir);

    const entries: { file: File, path: string }[] = [];

    for (const obj of zipObjects) {
        const blob = await obj.async('blob');
        const filename = obj.name.split('/').pop() || obj.name;
        const file = new File([blob], filename, { type: blob.type || '' });
        entries.push({ file, path: obj.name });
    }

    const context = buildProjectContext(entries);

    // If no explicit root folder exists, use zip filename as root
    if (context.rootName === 'Project') {
        const zipRootName = zipFile.name.replace(/\.zip$/i, '') || 'Project';
        if (zipRootName !== context.rootName) {
            context.rootName = zipRootName;
            const lines = context.fileTree.split('\n');
            context.fileTree = lines.length > 1
                ? `${zipRootName}\n${lines.slice(1).join('\n')}`
                : zipRootName;
        }
    }

    return context;
};

// ============ Agentic Folder Access Functions ============

/**
 * Build a ProjectContext for agentic file access.
 * Unlike generateFolderContext, this does NOT read file contents.
 * It only builds the tree structure and stores file references for on-demand reading.
 */
export const buildProjectContext = (files: { file: File, path: string }[]): ProjectContext => {
    const fileMap = new Map<string, ProjectContextFile>();
    const nodeMap = new Map<string, FileTreeNode>();
    const roots: FileTreeNode[] = [];

    let totalSize = 0;
    let totalFiles = 0;

    // Max file size for text extraction (2MB)
    const MAX_TEXT_SIZE = 2 * 1024 * 1024;

    for (const { file, path } of files) {
        // Apply same filtering as legacy mode
        if (shouldIgnore(path)) continue;
        if (file.size > MAX_TEXT_SIZE) continue;

        totalSize += file.size;
        totalFiles++;

        // Store file reference for later reading
        fileMap.set(path, {
            path,
            size: file.size,
            fileRef: file,
        });

        // Build tree structure
        const parts = path.split('/').filter(p => p);
        let currentPath = '';
        let parentNode: FileTreeNode | undefined = undefined;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            currentPath = parts.slice(0, i + 1).join('/');

            let currentNode = nodeMap.get(currentPath);

            if (!currentNode) {
                const isDir = i < parts.length - 1;
                currentNode = {
                    name: part,
                    path: currentPath,
                    isDirectory: isDir,
                    children: isDir ? [] : undefined,
                    size: isDir ? undefined : file.size,
                };
                nodeMap.set(currentPath, currentNode);

                if (parentNode && parentNode.children) {
                    parentNode.children.push(currentNode);
                } else if (!parentNode) {
                    roots.push(currentNode);
                }
            }
            parentNode = currentNode;
        }
    }

    // Determine effective root
    let effectiveRootName = 'Project';
    let effectiveRoots = roots;

    if (roots.length === 1 && roots[0].isDirectory) {
        effectiveRootName = roots[0].name;
        effectiveRoots = roots[0].children || [];
    }

    // Sort tree nodes (directories first, then alphabetically)
    const sortNodes = (nodes: FileTreeNode[]) => {
        nodes.sort((a, b) => {
            if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
            return a.isDirectory ? -1 : 1;
        });
        nodes.forEach(node => {
            if (node.children) sortNodes(node.children);
        });
    };
    sortNodes(effectiveRoots);

    // Build ASCII tree for system prompt injection
    const buildTree = (nodes: FileTreeNode[], prefix: string): string => {
        let result = '';
        nodes.forEach((node, index) => {
            const isLast = index === nodes.length - 1;
            const connector = isLast ? '└── ' : '├── ';
            result += `${prefix}${connector}${node.name}\n`;
            if (node.isDirectory && node.children && node.children.length > 0) {
                const newPrefix = prefix + (isLast ? '    ' : '│   ');
                result += buildTree(node.children, newPrefix);
            }
        });
        return result;
    };

    const fileTree = `${effectiveRootName}\n${buildTree(effectiveRoots, '')}`;

    return {
        rootName: effectiveRootName,
        fileTree,
        treeNodes: effectiveRoots,
        fileMap,
        totalFiles,
        totalSize,
        isPersistent: false,
        createdAt: new Date(),
    };
};

/**
 * Read a single file from a ProjectContext.
 * This is the function called when AI uses the read_file tool.
 * Handles path normalization to match fileMap keys.
 */
export const readProjectFile = async (context: ProjectContext, filepath: string): Promise<string> => {
    // Normalize: remove leading/trailing slashes and './'
    let normalizedPath = filepath.replace(/^\.?\/*/, '').replace(/\/*$/, '');

    // Try exact match first
    let fileEntry = context.fileMap.get(normalizedPath);

    // If not found and path starts with rootName, try without it
    if (!fileEntry && normalizedPath.startsWith(context.rootName + '/')) {
        const withoutRoot = normalizedPath.slice(context.rootName.length + 1);
        fileEntry = context.fileMap.get(withoutRoot);
    }

    // If still not found, try adding rootName prefix (reverse case)
    if (!fileEntry) {
        const withRoot = `${context.rootName}/${normalizedPath}`;
        fileEntry = context.fileMap.get(withRoot);
    }

    // If still not found, try partial path matching (last segments)
    if (!fileEntry) {
        const pathParts = normalizedPath.split('/');
        for (const [key, value] of context.fileMap.entries()) {
            if (key.endsWith(normalizedPath) || key.endsWith('/' + pathParts.slice(-2).join('/'))) {
                fileEntry = value;
                break;
            }
        }
    }

    if (!fileEntry) {
        // Provide helpful error with available paths
        const availablePaths = Array.from(context.fileMap.keys()).slice(0, 10);
        throw new Error(`File not found: ${filepath}. Available paths include: ${availablePaths.join(', ')}`);
    }

    try {
        return await fileToString(fileEntry.fileRef);
    } catch (e) {
        throw new Error(`Failed to read file: ${filepath}`);
    }
};
