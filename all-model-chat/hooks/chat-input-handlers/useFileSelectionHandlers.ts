
import { useCallback, Dispatch, SetStateAction } from 'react';
import { UploadedFile } from '../../types';
import { generateUniqueId } from '../../utils/appUtils';
import { generateFolderContext } from '../../utils/folderImportUtils';

interface UseFileSelectionHandlersProps {
    onProcessFiles: (files: FileList | File[]) => Promise<void>;
    setSelectedFiles: Dispatch<SetStateAction<UploadedFile[]>>;
    setAppFileError: (error: string | null) => void;
    setIsConverting: Dispatch<SetStateAction<boolean>>;
    justInitiatedFileOpRef: React.MutableRefObject<boolean>;
    fileInputRef: React.RefObject<HTMLInputElement>;
    imageInputRef: React.RefObject<HTMLInputElement>;
    folderInputRef: React.RefObject<HTMLInputElement>;
    zipInputRef: React.RefObject<HTMLInputElement>;
}

export const useFileSelectionHandlers = ({
    onProcessFiles,
    setSelectedFiles,
    setAppFileError,
    setIsConverting,
    justInitiatedFileOpRef,
    fileInputRef,
    imageInputRef,
    folderInputRef,
    zipInputRef,
}: UseFileSelectionHandlersProps) => {

    const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files?.length) {
            justInitiatedFileOpRef.current = true;
            await onProcessFiles(event.target.files);
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
        if (imageInputRef.current) imageInputRef.current.value = "";
    }, [onProcessFiles, justInitiatedFileOpRef, fileInputRef, imageInputRef]);

    const handleFolderChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files?.length) {
            const tempId = generateUniqueId();
            setIsConverting(true);
            setSelectedFiles(prev => [...prev, {
                id: tempId,
                name: 'Processing folder...',
                type: 'application/x-directory',
                size: 0,
                isProcessing: true,
                uploadState: 'pending'
            }]);

            try {
                justInitiatedFileOpRef.current = true;
                const contextFile = await generateFolderContext(event.target.files);
                setSelectedFiles(prev => prev.filter(f => f.id !== tempId));
                await onProcessFiles([contextFile]);
            } catch (e) {
                console.error(e);
                setAppFileError("Failed to process folder structure.");
                setSelectedFiles(prev => prev.filter(f => f.id !== tempId));
            } finally {
                setIsConverting(false);
            }
        }
        if (folderInputRef.current) folderInputRef.current.value = "";
    }, [setIsConverting, setSelectedFiles, onProcessFiles, setAppFileError, justInitiatedFileOpRef, folderInputRef]);

    const handleZipChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files?.length) {
            justInitiatedFileOpRef.current = true;
            // useFileUpload already has logic to auto-detect and convert .zip files
            await onProcessFiles(event.target.files);
        }
        if (zipInputRef.current) zipInputRef.current.value = "";
    }, [onProcessFiles, justInitiatedFileOpRef, zipInputRef]);

    return {
        handleFileChange,
        handleFolderChange,
        handleZipChange,
    };
};
