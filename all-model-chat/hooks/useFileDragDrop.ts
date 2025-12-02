
import { useState, useCallback } from 'react';
import { generateFolderContext } from '../utils/folderImportUtils';
import { UploadedFile } from '../types';
import { generateUniqueId } from '../utils/appUtils';

interface UseFileDragDropProps {
    onFilesDropped: (files: FileList | File[]) => Promise<void>;
    onAddTempFile: (file: UploadedFile) => void;
    onRemoveTempFile: (id: string) => void;
}

export const useFileDragDrop = ({ onFilesDropped, onAddTempFile, onRemoveTempFile }: UseFileDragDropProps) => {
    const [isAppDraggingOver, setIsAppDraggingOver] = useState<boolean>(false);
    const [isProcessingDrop, setIsProcessingDrop] = useState<boolean>(false);

    const handleAppDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.types.includes('Files')) {
            setIsAppDraggingOver(true);
        }
    }, []);

    const handleAppDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.types.includes('Files')) {
            e.dataTransfer.dropEffect = 'copy';
            if (!isAppDraggingOver) {
                setIsAppDraggingOver(true);
            }
        } else {
            e.dataTransfer.dropEffect = 'none';
        }
    }, [isAppDraggingOver]);

    const handleAppDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        // Only reset if leaving the main container, not entering a child
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setIsAppDraggingOver(false);
    }, []);

    // Helper to recursively read entries from a dropped directory
    const scanEntry = async (entry: any, path: string = ''): Promise<File[]> => {
        if (entry.isFile) {
            return new Promise((resolve) => {
                entry.file((file: File) => {
                    // Inject webkitRelativePath for structure preservation in generateFolderContext
                    const relativePath = path + file.name;
                    Object.defineProperty(file, 'webkitRelativePath', {
                        value: relativePath,
                        writable: true
                    });
                    resolve([file]);
                });
            });
        } else if (entry.isDirectory) {
            const dirReader = entry.createReader();
            const allEntries: any[] = [];
            
            const readEntries = async (): Promise<any[]> => {
                return new Promise((resolve, reject) => {
                    dirReader.readEntries((entries: any[]) => {
                        resolve(entries);
                    }, reject);
                });
            };

            try {
                let entries = await readEntries();
                while (entries.length > 0) {
                    allEntries.push(...entries);
                    entries = await readEntries();
                }
            } catch (e) {
                console.warn('Error reading directory entries during drop', e);
            }
            
            const filesArrays = await Promise.all(allEntries.map(child => scanEntry(child, path + entry.name + '/')));
            return filesArrays.flat();
        }
        return [];
    };

    const handleAppDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsAppDraggingOver(false);
        setIsProcessingDrop(true);

        try {
            const items = e.dataTransfer.items;
            let hasDirectory = false;

            // Check if any dropped item is a directory
            if (items) {
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    if (item.kind === 'file' && typeof item.webkitGetAsEntry === 'function') {
                        const entry = item.webkitGetAsEntry();
                        if (entry && entry.isDirectory) {
                            hasDirectory = true;
                            break;
                        }
                    }
                }
            }

            if (hasDirectory) {
                const tempId = generateUniqueId();
                onAddTempFile({
                    id: tempId,
                    name: "Processing dropped files...",
                    type: "application/x-directory", // Dummy type for icon
                    size: 0,
                    isProcessing: true,
                    uploadState: 'pending'
                });

                // Handle directory drop: recursive scan and convert to text context
                const entries = Array.from(items)
                    .filter(item => item.kind === 'file')
                    .map(item => item.webkitGetAsEntry())
                    .filter(Boolean);
                
                const filesArrays = await Promise.all(entries.map(entry => scanEntry(entry)));
                const flatFiles = filesArrays.flat();
                
                if (flatFiles.length > 0) {
                    // Convert list of files to a single text context file
                    const contextFile = await generateFolderContext(flatFiles as unknown as FileList);
                    await onFilesDropped([contextFile]);
                }
                
                onRemoveTempFile(tempId);
            } else {
                // Standard file drop
                const files = e.dataTransfer.files;
                if (files?.length) {
                    await onFilesDropped(files);
                }
            }
        } catch (error) {
            console.error("Error processing dropped files:", error);
        } finally {
            setIsProcessingDrop(false);
        }
    }, [onFilesDropped, onAddTempFile, onRemoveTempFile]);

    return {
        isAppDraggingOver,
        isProcessingDrop,
        handleAppDragEnter,
        handleAppDragOver,
        handleAppDragLeave,
        handleAppDrop,
    };
};
