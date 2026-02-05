
import React, { useState, useCallback, useMemo } from 'react';
import { FileTreeNode, ProjectContext, ProjectContextReadState } from '../../types';
import { Folder, FolderOpen, File, FileCode, FileText, FileJson, ChevronRight, ChevronDown, X, RefreshCw, Loader2, Check } from 'lucide-react';

interface FolderExplorerProps {
    projectContext: ProjectContext;
    readState?: ProjectContextReadState;
    onClearProject: () => void;
    onFileClick?: (filepath: string) => void;
    t: (key: string) => string;
    themeId: string;
}

// Helper to determine file icon based on extension
const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';

    const codeExtensions = ['ts', 'tsx', 'js', 'jsx', 'py', 'java', 'cpp', 'c', 'h', 'go', 'rs', 'rb', 'php', 'swift', 'kt', 'vue', 'svelte'];
    const textExtensions = ['md', 'txt', 'rst', 'log'];
    const jsonExtensions = ['json', 'yaml', 'yml', 'toml', 'xml'];

    if (codeExtensions.includes(ext)) return FileCode;
    if (textExtensions.includes(ext)) return FileText;
    if (jsonExtensions.includes(ext)) return FileJson;
    return File;
};

// Format file size
const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Tree node component
const TreeNode: React.FC<{
    node: FileTreeNode;
    depth: number;
    expandedPaths: Set<string>;
    onToggleExpand: (path: string) => void;
    onFileClick?: (filepath: string) => void;
    readFiles?: Set<string>;
    loadingFile?: string | null;
}> = ({ node, depth, expandedPaths, onToggleExpand, onFileClick, readFiles, loadingFile }) => {
    const isExpanded = expandedPaths.has(node.path);
    const isRead = readFiles?.has(node.path);
    const isLoading = loadingFile === node.path;

    const handleClick = useCallback(() => {
        if (node.isDirectory) {
            onToggleExpand(node.path);
        } else {
            onFileClick?.(node.path);
        }
    }, [node, onToggleExpand, onFileClick]);

    const Icon = node.isDirectory
        ? (isExpanded ? FolderOpen : Folder)
        : getFileIcon(node.name);

    return (
        <div>
            <button
                onClick={handleClick}
                className={`w-full flex items-center gap-1.5 py-1 px-2 text-sm rounded-md transition-colors
                    ${node.isDirectory
                        ? 'text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)]'
                        : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-primary)]'}
                    ${isRead ? 'bg-[var(--theme-bg-accent)]/10' : ''}
                `}
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
                title={node.path}
            >
                {node.isDirectory ? (
                    <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                ) : (
                    <span className="w-4 h-4 flex-shrink-0" />
                )}
                <Icon
                    size={16}
                    className={`flex-shrink-0 ${node.isDirectory ? 'text-[var(--theme-icon-folder)]' : 'text-[var(--theme-icon-file)]'}`}
                />
                <span className="truncate flex-1 text-left">{node.name}</span>

                {/* Status indicators */}
                {isLoading && (
                    <Loader2 size={14} className="animate-spin text-[var(--theme-text-accent)] flex-shrink-0" />
                )}
                {isRead && !isLoading && (
                    <Check size={14} className="text-green-500 flex-shrink-0" />
                )}
                {!node.isDirectory && node.size && (
                    <span className="text-xs text-[var(--theme-text-tertiary)] flex-shrink-0">
                        {formatSize(node.size)}
                    </span>
                )}
            </button>

            {/* Render children if directory is expanded */}
            {node.isDirectory && isExpanded && node.children && (
                <div>
                    {node.children.map(child => (
                        <TreeNode
                            key={child.path}
                            node={child}
                            depth={depth + 1}
                            expandedPaths={expandedPaths}
                            onToggleExpand={onToggleExpand}
                            onFileClick={onFileClick}
                            readFiles={readFiles}
                            loadingFile={loadingFile}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export const FolderExplorer: React.FC<FolderExplorerProps> = ({
    projectContext,
    readState,
    onClearProject,
    onFileClick,
    t,
    themeId,
}) => {
    const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => {
        // Auto-expand first level
        const initial = new Set<string>();
        projectContext.treeNodes.forEach(node => {
            if (node.isDirectory) initial.add(node.path);
        });
        return initial;
    });

    const handleToggleExpand = useCallback((path: string) => {
        setExpandedPaths(prev => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    }, []);

    const handleExpandAll = useCallback(() => {
        const allDirs = new Set<string>();
        const collectDirs = (nodes: FileTreeNode[]) => {
            nodes.forEach(node => {
                if (node.isDirectory) {
                    allDirs.add(node.path);
                    if (node.children) collectDirs(node.children);
                }
            });
        };
        collectDirs(projectContext.treeNodes);
        setExpandedPaths(allDirs);
    }, [projectContext.treeNodes]);

    const handleCollapseAll = useCallback(() => {
        setExpandedPaths(new Set());
    }, []);

    return (
        <div className={`h-full flex flex-col border-l border-[var(--theme-border-primary)] 
            ${themeId === 'onyx' ? 'bg-[var(--theme-bg-primary)]' : 'bg-[var(--theme-bg-secondary)]'}`}>
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--theme-border-primary)]">
                <div className="flex items-center gap-2">
                    <Folder size={18} className="text-[var(--theme-icon-folder)]" />
                    <span className="font-medium text-sm text-[var(--theme-text-primary)] truncate max-w-[120px]" title={projectContext.rootName}>
                        {projectContext.rootName}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleExpandAll}
                        className="p-1.5 rounded hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition-colors"
                        title="Expand all"
                    >
                        <ChevronDown size={16} />
                    </button>
                    <button
                        onClick={handleCollapseAll}
                        className="p-1.5 rounded hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition-colors"
                        title="Collapse all"
                    >
                        <ChevronRight size={16} />
                    </button>
                    <button
                        onClick={onClearProject}
                        className="p-1.5 rounded hover:bg-red-500/10 text-[var(--theme-text-secondary)] hover:text-red-500 transition-colors"
                        title="Close project"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Stats bar */}
            <div className="px-3 py-1.5 text-xs text-[var(--theme-text-tertiary)] border-b border-[var(--theme-border-primary)] flex items-center justify-between">
                <span>{projectContext.totalFiles} files</span>
                <span>{formatSize(projectContext.totalSize)}</span>
            </div>

            {/* Tree view */}
            <div className="flex-1 overflow-y-auto custom-scrollbar py-1">
                {projectContext.treeNodes.map(node => (
                    <TreeNode
                        key={node.path}
                        node={node}
                        depth={0}
                        expandedPaths={expandedPaths}
                        onToggleExpand={handleToggleExpand}
                        onFileClick={onFileClick}
                        readFiles={readState?.readFiles}
                        loadingFile={readState?.loadingFile}
                    />
                ))}
            </div>

            {/* Read files indicator */}
            {readState && readState.readFiles.size > 0 && (
                <div className="px-3 py-2 border-t border-[var(--theme-border-primary)] text-xs text-[var(--theme-text-tertiary)]">
                    <div className="flex items-center gap-1.5">
                        <Check size={12} className="text-green-500" />
                        <span>AI read {readState.readFiles.size} file{readState.readFiles.size !== 1 ? 's' : ''}</span>
                    </div>
                </div>
            )}
        </div>
    );
};
