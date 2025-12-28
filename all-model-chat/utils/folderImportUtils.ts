
import { UploadedFile } from '../types';
import { fileToString } from './domainUtils';
import JSZip from 'jszip';

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

const generateContextContent = (rootName: string, roots: FileNode[], processedFiles: { path: string, content: string }[]): string => {
    const structureString = buildASCIITree(roots, rootName);
    
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
    return output;
};

export const generateFolderContext = async (files: FileList | File[] | { file: File, path: string }[]): Promise<File> => {
    // Normalize input to a consistent array
    const items = Array.isArray(files) ? files : Array.from(files);
    
    const nodeMap = new Map<string, FileNode>();
    const roots: FileNode[] = [];
    const processedFiles: { path: string, content: string }[] = [];

    // Iterate all items to build structure
    for (const item of items) {
        let file: File;
        let path: string;

        if ('file' in item && 'path' in item && typeof item.path === 'string') {
             // Custom object from Drag & Drop hook
             file = item.file;
             path = item.path;
        } else {
             // Standard File object (from input[type=file] webkitdirectory)
             file = item as File;
             path = (file as any).webkitRelativePath || file.name;
        }

        const parts = path.split('/').filter((p: string) => p);

        // Check if any part of the path is in IGNORED_DIRS
        if (parts.some((part: string) => IGNORED_DIRS.has(part))) continue;

        // Tree Building Logic
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

        // Determine if we should read the content
        const extension = `.${file.name.split('.').pop()?.toLowerCase()}`;
        const shouldReadContent = !IGNORED_EXTENSIONS.has(extension) && file.size < 2 * 1024 * 1024;

        if (shouldReadContent) {
            try {
                const content = await fileToString(file);
                processedFiles.push({ path, content });
            } catch (e) {
                console.warn(`Failed to read file ${path}`, e);
            }
        }
    }

    // Generate Output String
    let rootName = "Project";
    if (roots.length === 1 && roots[0].isDirectory) {
        // If single root folder, use its name and process children for tree to avoid redundancy
        rootName = roots[0].name;
    }

    const output = generateContextContent(rootName, roots, processedFiles);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return new File([output], `${rootName}-context-${timestamp}.txt`, { type: 'text/plain' });
};

export const generateZipContext = async (zipFile: File): Promise<File> => {
    const zip = await JSZip.loadAsync(zipFile);
    const processedFiles: { path: string, content: string }[] = [];
    const roots: FileNode[] = [];
    const nodeMap = new Map<string, FileNode>();

    const entries = Object.values(zip.files) as JSZip.JSZipObject[];

    for (const entry of entries) {
        const path = entry.name;
        // Ignore directories themselves in this loop if they are explicitly stored, 
        // we handle structure via path splitting of files/folders. 
        
        const parts = path.split('/').filter(p => p);
        
        // Filter ignored dirs
        if (parts.some(part => part.startsWith('.') || IGNORED_DIRS.has(part))) continue;

        // Tree Building Logic
        let parentNode: FileNode | undefined = undefined;
        let currentPath = '';

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            currentPath = parts.slice(0, i + 1).join('/');

            let currentNode = nodeMap.get(currentPath);

            if (!currentNode) {
                // If this is the last part, check if the entry itself is a directory
                // or if it's an intermediate path
                const isDir = i < parts.length - 1 || entry.dir;
                
                currentNode = {
                    name: part,
                    children: [],
                    isDirectory: isDir,
                };
                nodeMap.set(currentPath, currentNode);

                if (parentNode) {
                    parentNode.children.push(currentNode);
                } else {
                    // Only add top-level nodes to roots
                    if (i === 0) roots.push(currentNode);
                }
            }
            parentNode = currentNode;
        }

        // Determine content reading
        if (!entry.dir) {
            const extension = `.${path.split('.').pop()?.toLowerCase()}`;
            const shouldReadContent = !IGNORED_EXTENSIONS.has(extension);

            if (shouldReadContent) {
                try {
                    const content = await entry.async('string');
                    processedFiles.push({ path, content });
                } catch (e) {
                    console.warn(`Failed to read zip entry ${path}`, e);
                }
            }
        }
    }

    let rootName = zipFile.name.replace(/\.zip$/i, '');
    
    const output = generateContextContent(rootName, roots, processedFiles);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return new File([output], `${rootName}-context-${timestamp}.txt`, { type: 'text/plain' });
};
