
import { useCallback, Dispatch, SetStateAction } from 'react';
import { UploadedFile, ProjectContext } from '../../../types';
import { generateUniqueId } from '../../../utils/appUtils';
import { generateFolderContext, buildProjectContext, buildProjectContextFromZip } from '../../../utils/folderImportUtils';

interface UseFileSelectionHandlersProps {
    onProcessFiles: (files: FileList | File[]) => Promise<void>;
    onProjectContextCreated?: (context: ProjectContext) => void;
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
    onProjectContextCreated,
    setSelectedFiles,
    setAppFileError,
    setIsConverting,
    justInitiatedFileOpRef,
    fileInputRef,
    imageInputRef,
    folderInputRef,
    zipInputRef,
}: UseFileSelectionHandlersProps) => {

    const handleFolderZipFiles = useCallback(async (files: FileList | File[]) => {
        const filesArray = Array.isArray(files) ? files : Array.from(files);
        if (filesArray.length === 0) return;

        const isFolderImport = filesArray.some(file => !!(file as any).webkitRelativePath);
        const isZipImport = !isFolderImport && filesArray.every(file => file.name.toLowerCase().endsWith('.zip'));

        const tempId = generateUniqueId();
        setIsConverting(true);
        setSelectedFiles(prev => [...prev, {
            id: tempId,
            name: 'Processing import...',
            type: isZipImport ? 'application/zip' : 'application/x-directory',
            size: 0,
            isProcessing: true,
            uploadState: 'pending'
        }]);

        try {
            justInitiatedFileOpRef.current = true;

            if (onProjectContextCreated) {
                if (isFolderImport) {
                    const fileEntries = filesArray.map(file => ({
                        file,
                        path: (file as any).webkitRelativePath || file.name
                    }));
                    const projectContext = buildProjectContext(fileEntries);
                    onProjectContextCreated(projectContext);
                } else if (isZipImport) {
                    for (const zipFile of filesArray) {
                        const projectContext = await buildProjectContextFromZip(zipFile);
                        onProjectContextCreated(projectContext);
                    }
                } else {
                    await onProcessFiles(filesArray);
                }
            } else {
                if (isFolderImport) {
                    const contextFile = await generateFolderContext(filesArray);
                    await onProcessFiles([contextFile]);
                } else {
                    await onProcessFiles(filesArray);
                }
            }
        } catch (e) {
            console.error(e);
            setAppFileError(isZipImport ? "Failed to process zip file." : "Failed to process folder structure.");
        } finally {
            setSelectedFiles(prev => prev.filter(f => f.id !== tempId));
            setIsConverting(false);
        }
    }, [buildProjectContextFromZip, generateFolderContext, onProcessFiles, onProjectContextCreated, setAppFileError, setIsConverting, setSelectedFiles, justInitiatedFileOpRef]);

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
            await handleFolderZipFiles(event.target.files);
        }
        if (folderInputRef.current) folderInputRef.current.value = "";
    }, [handleFolderZipFiles, folderInputRef]);

    const handleZipChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files?.length) {
            await handleFolderZipFiles(event.target.files);
        }
        if (zipInputRef.current) zipInputRef.current.value = "";
    }, [handleFolderZipFiles, zipInputRef]);

    return {
        handleFileChange,
        handleFolderChange,
        handleZipChange,
    };
};
