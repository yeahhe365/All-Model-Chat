
import { useCallback, Dispatch, SetStateAction } from 'react';
import { UploadedFile, VideoMetadata } from '../../../types';
import { MediaResolution } from '../../../types/settings';
import { useImageNavigation } from '../../ui/useImageNavigation';
import { geminiServiceInstance } from '../../../services/geminiService';
import { getKeyForRequest, logService, generateUniqueId } from '../../../utils/appUtils';
import { AppSettings, ChatSettings as IndividualChatSettings } from '../../../types';

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

    // Use unified navigation hook for input area files
    const { 
        images: inputImages, 
        currentIndex: currentImageIndex, 
        handlePrev: handlePrevImage, 
        handleNext: handleNextImage 
    } = useImageNavigation(selectedFiles, previewFile, setPreviewFile);

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
