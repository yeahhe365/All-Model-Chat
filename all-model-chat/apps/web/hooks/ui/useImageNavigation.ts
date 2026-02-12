
import { useMemo, useCallback } from 'react';
import { UploadedFile } from '../../types';
import { SUPPORTED_IMAGE_MIME_TYPES } from '../../constants/fileConstants';

export const useImageNavigation = (
    sourceFiles: UploadedFile[], 
    currentFile: UploadedFile | null, 
    setPreviewFile: (file: UploadedFile | null) => void
) => {
    // Centralized logic to filter navigable images
    const images = useMemo(() => {
        if (!sourceFiles) return [];
        return sourceFiles.filter(f => 
            (SUPPORTED_IMAGE_MIME_TYPES.includes(f.type) || f.type === 'image/svg+xml') && !f.error
        );
    }, [sourceFiles]);

    const currentIndex = useMemo(() => {
        if (!currentFile) return -1;
        return images.findIndex(f => f.id === currentFile.id);
    }, [images, currentFile]);

    const handlePrev = useCallback(() => {
        if (currentIndex > 0) {
            setPreviewFile(images[currentIndex - 1]);
        }
    }, [currentIndex, images, setPreviewFile]);

    const handleNext = useCallback(() => {
        if (currentIndex !== -1 && currentIndex < images.length - 1) {
            setPreviewFile(images[currentIndex + 1]);
        }
    }, [currentIndex, images, setPreviewFile]);

    return { 
        images, 
        currentIndex, 
        handlePrev, 
        handleNext,
        hasPrev: currentIndex > 0,
        hasNext: currentIndex !== -1 && currentIndex < images.length - 1
    };
};
