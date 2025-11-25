
import { useState, useCallback } from 'react';

interface UseFileDragDropProps {
    onFilesDropped: (files: FileList | File[]) => Promise<void>;
}

export const useFileDragDrop = ({ onFilesDropped }: UseFileDragDropProps) => {
    const [isAppDraggingOver, setIsAppDraggingOver] = useState<boolean>(false);

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

    const handleAppDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsAppDraggingOver(false);
        const files = e.dataTransfer.files;
        if (files?.length) {
            await onFilesDropped(files);
        }
    }, [onFilesDropped]);

    return {
        isAppDraggingOver,
        handleAppDragEnter,
        handleAppDragOver,
        handleAppDragLeave,
        handleAppDrop,
    };
};
