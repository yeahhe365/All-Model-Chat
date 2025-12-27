
import { useCallback, Dispatch, SetStateAction } from 'react';
import { UploadedFile, VideoMetadata } from '../../types';
import { MediaResolution } from '../../types/settings';
import { SUPPORTED_IMAGE_MIME_TYPES } from '../../constants/fileConstants';

interface UseFileManagementHandlersProps {
    selectedFiles: UploadedFile[];
    setSelectedFiles: Dispatch<SetStateAction<UploadedFile[]>>;
    fileIdInput: string;
    isAddingById: boolean;
    isLoading: boolean;
    setIsAddingById: Dispatch<SetStateAction<boolean>>;
    justInitiatedFileOpRef: React.MutableRefObject<boolean>;
    onAddFileById: (fileId: string) => Promise<void>;
    setFileIdInput: Dispatch<SetStateAction<string>>;
    textareaRef: React.RefObject<HTMLTextAreaElement>;
    previewFile: UploadedFile | null;
    setPreviewFile: Dispatch<SetStateAction<UploadedFile | null>>;
}

export const useFileManagementHandlers = ({
    selectedFiles,
    setSelectedFiles,
    fileIdInput,
    isAddingById,
    isLoading,
    setIsAddingById,
    justInitiatedFileOpRef,
    onAddFileById,
    setFileIdInput,
    textareaRef,
    previewFile,
    setPreviewFile,
}: UseFileManagementHandlersProps) => {

    const removeSelectedFile = useCallback((fileIdToRemove: string) => {
        setSelectedFiles(prev => {
            const fileToRemove = prev.find(f => f.id === fileIdToRemove);
            if (fileToRemove && fileToRemove.dataUrl && fileToRemove.dataUrl.startsWith('blob:')) {
                URL.revokeObjectURL(fileToRemove.dataUrl);
            }
            return prev.filter(f => f.id !== fileIdToRemove);
        });
    }, [setSelectedFiles]);

    const handleAddFileByIdSubmit = useCallback(async () => {
        if (!fileIdInput.trim() || isAddingById || isLoading) return;
        setIsAddingById(true);
        justInitiatedFileOpRef.current = true;
        await onAddFileById(fileIdInput.trim());
        setIsAddingById(false);
        setFileIdInput('');
    }, [fileIdInput, isAddingById, isLoading, setIsAddingById, justInitiatedFileOpRef, onAddFileById, setFileIdInput]);

    const handleToggleToolAndFocus = useCallback((toggleFunc: () => void) => {
        toggleFunc();
        setTimeout(() => textareaRef.current?.focus(), 0);
    }, [textareaRef]);

    const handleSaveFileConfig = useCallback((fileId: string, updates: { videoMetadata?: VideoMetadata, mediaResolution?: MediaResolution }) => {
        setSelectedFiles(prev => prev.map(f => f.id === fileId ? { ...f, ...updates } : f));
    }, [setSelectedFiles]);

    // Derived Navigation State
    const inputImages = previewFile 
        ? selectedFiles.filter(f => (SUPPORTED_IMAGE_MIME_TYPES.includes(f.type) || f.type === 'image/svg+xml') && !f.error)
        : [];
    
    const currentImageIndex = previewFile 
        ? inputImages.findIndex(f => f.id === previewFile.id)
        : -1;

    const handlePrevImage = useCallback(() => {
        if (currentImageIndex > 0) {
            setPreviewFile(inputImages[currentImageIndex - 1]);
        }
    }, [currentImageIndex, inputImages, setPreviewFile]);

    const handleNextImage = useCallback(() => {
        if (currentImageIndex < inputImages.length - 1) {
            setPreviewFile(inputImages[currentImageIndex + 1]);
        }
    }, [currentImageIndex, inputImages, setPreviewFile]);

    return {
        removeSelectedFile,
        handleAddFileByIdSubmit,
        handleToggleToolAndFocus,
        handleSaveFileConfig,
        handlePrevImage,
        handleNextImage,
        inputImages,
        currentImageIndex
    };
};
