


import { UploadedFile } from '../types';
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

const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
    });
};

export const generateFolderContext = async (files: FileList): Promise<File> => {
    const fileList = Array.from(files);
    const nodeMap = new Map<string, FileNode>();
    const roots: FileNode[] = [];
    const processedFiles: { path: string, content: string }[] = [];

    // Filter valid files
    const validFiles = fileList.filter(file => {
        const path = (file as any).webkitRelativePath || file.name;
        const parts = path.split('/');
        // Check if any part of the path is in IGNORED_DIRS
        if (parts.some((part: string) => IGNORED_DIRS.has(part))) return false;
        
        const extension = `.${file.name.split('.').pop()?.toLowerCase()}`;
        return !IGNORED_EXTENSIONS.has(extension);
    });

    // Build Tree and Read Content
    for (const file of validFiles) {
        const path = (file as any).webkitRelativePath || file.name;
        const parts = path.split('/').filter((p: string) => p);

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

        // Read Content (only for files, skip large files > 2MB to be safe for text context)
        if (file.size < 2 * 1024 * 1024) {
            try {
                const content = await readFileContent(file);
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
        // For the tree visualization, we still use the calculated roots, buildASCIITree handles structure
    }

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

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return new File([output], `${rootName}-context-${timestamp}.txt`, { type: 'text/plain' });
};

export const generateZipContext = async (zipFile: File): Promise<File> => {
    const zip = await JSZip.loadAsync(zipFile);
    const processedFiles: { path: string, content: string }[] = [];
    const roots: FileNode[] = [];
    const nodeMap = new Map<string, FileNode>();

    const entries = Object.values(zip.files);

    // Filter valid entries
    const validEntries = entries.filter(entry => {
        if (entry.dir) return false;
        const path = entry.name;
        const parts = path.split('/');
        if (parts.some(part => part.startsWith('.') || IGNORED_DIRS.has(part))) return false;
        const extension = `.${path.split('.').pop()?.toLowerCase()}`;
        return !IGNORED_EXTENSIONS.has(extension);
    });

    for (const entry of validEntries) {
        const path = entry.name;
        const parts = path.split('/').filter(p => p);

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
                    // Only add top-level nodes to roots
                    if (i === 0) roots.push(currentNode);
                }
            }
            parentNode = currentNode;
        }

        // Read content
        try {
            const content = await entry.async('string');
            processedFiles.push({ path, content });
        } catch (e) {
            console.warn(`Failed to read zip entry ${path}`, e);
        }
    }

    let rootName = zipFile.name.replace(/\.zip$/i, '');
    
    // If the zip contains a single top-level directory, use that as root
    // (Similar logic to folder import, but we keep the roots as they are for buildASCIITree to work recursively)
    if (roots.length === 1 && roots[0].isDirectory) {
        // rootName = roots[0].name; // Optional: change display name to inner folder
    }

    const structureString = buildASCIITree(roots, rootName);
    
    let output = "File Structure:\n";
    output += structureString;
    output += "\n\nFile Contents:\n";

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
    return new File([output], `${rootName}-context-${timestamp}.txt`, { type: 'text/plain' });
};