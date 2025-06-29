import { useState, useCallback, useEffect, Dispatch, SetStateAction } from 'react';
import { UploadedFile } from '../types';
import { ALL_SUPPORTED_MIME_TYPES, SUPPORTED_IMAGE_MIME_TYPES, SUPPORTED_TEXT_MIME_TYPES } from '../constants/fileConstants';
import { generateUniqueId } from '../utils/appUtils';
import { geminiServiceInstance } from '../services/geminiService';

interface FileHandlingProps {
    selectedFiles: UploadedFile[];
    setSelectedFiles: Dispatch<SetStateAction<UploadedFile[]>>;
    setAppFileError: Dispatch<SetStateAction<string | null>>;
    isAppProcessingFile: boolean;
    setIsAppProcessingFile: Dispatch<SetStateAction<boolean>>;
}

export const useFileHandling = ({
    selectedFiles,
    setSelectedFiles,
    setAppFileError,
    isAppProcessingFile,
    setIsAppProcessingFile,
}: FileHandlingProps) => {

    const [isAppDraggingOver, setIsAppDraggingOver] = useState<boolean>(false);

    useEffect(() => {
        const anyFileProcessing = selectedFiles.some(file => file.isProcessing);
        setIsAppProcessingFile(anyFileProcessing);
    }, [selectedFiles, setIsAppProcessingFile]);

    const handleProcessAndAddFiles = useCallback(async (files: FileList | File[]) => {
        if (!files || files.length === 0) return;
        setAppFileError(null);
        const filesArray = Array.isArray(files) ? files : Array.from(files);

        const uploadPromises = filesArray.map(async (file) => {
            const fileId = generateUniqueId();
            const controller = new AbortController();

            if (!ALL_SUPPORTED_MIME_TYPES.includes(file.type)) {
                setSelectedFiles(prev => [...prev, { id: fileId, name: file.name, type: file.type, size: file.size, isProcessing: false, progress: 0, error: `Unsupported file type: ${file.type}`, uploadState: 'failed', abortController: controller }]);
                return; 
            }

            const isConsideredText = file.type.startsWith('text/') || SUPPORTED_TEXT_MIME_TYPES.includes(file.type);
            const typeForState = isConsideredText ? 'text/plain' : file.type;
            const mimeTypeForUpload = isConsideredText ? 'text/plain' : file.type;

            const initialFileState: UploadedFile = { id: fileId, name: file.name, type: typeForState, size: file.size, isProcessing: true, progress: 0, rawFile: file, uploadState: 'pending', abortController: controller };
            setSelectedFiles(prev => [...prev, initialFileState]);

            if (SUPPORTED_IMAGE_MIME_TYPES.includes(file.type)) {
                const reader = new FileReader();
                reader.onload = (e) => setSelectedFiles(p => p.map(f => f.id === fileId ? { ...f, dataUrl: e.target?.result as string } : f));
                reader.onerror = () => setSelectedFiles(p => p.map(f => f.id === fileId ? { ...f, error: "Failed to read file for preview." } : f));
                reader.readAsDataURL(file);
            }

            setSelectedFiles(prev => prev.map(f => f.id === fileId ? { ...f, progress: 10, uploadState: 'uploading' } : f));

            try {
                const uploadedFileInfo = await geminiServiceInstance.uploadFile(file, mimeTypeForUpload, file.name, controller.signal);
                setSelectedFiles(prev => prev.map(f => f.id === fileId ? { ...f, isProcessing: false, progress: 100, fileUri: uploadedFileInfo.uri, fileApiName: uploadedFileInfo.name, rawFile: undefined, uploadState: uploadedFileInfo.state === 'ACTIVE' ? 'active' : (uploadedFileInfo.state === 'PROCESSING' ? 'processing_api' : 'failed'), error: uploadedFileInfo.state === 'FAILED' ? 'File API processing failed' : (f.error || undefined), abortController: undefined, } : f));
            } catch (uploadError) {
                if (uploadError instanceof Error && uploadError.name === 'SilentError') {
                    setSelectedFiles(prev => prev.map(f => f.id === fileId ? { ...f, isProcessing: false, error: 'API key not configured', uploadState: 'failed', abortController: undefined } : f));
                    return;
                }
                let errorMsg = `Upload failed: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`;
                let uploadStateUpdate: UploadedFile['uploadState'] = 'failed';
                if (uploadError instanceof Error && uploadError.name === 'AbortError') {
                    errorMsg = "Upload cancelled by user.";
                    uploadStateUpdate = 'cancelled';
                }
                setSelectedFiles(prev => prev.map(f => f.id === fileId ? { ...f, isProcessing: false, error: errorMsg, rawFile: undefined, uploadState: uploadStateUpdate, abortController: undefined, } : f));
            }
        });
        await Promise.allSettled(uploadPromises);
    }, [setSelectedFiles, setAppFileError]);

    const handleCancelFileUpload = useCallback((fileIdToCancel: string) => {
        setSelectedFiles(prevFiles =>
            prevFiles.map(file => {
                if (file.id === fileIdToCancel && file.abortController) {
                    file.abortController.abort();
                    return { ...file, isProcessing: false, error: "Cancelling...", uploadState: 'failed' };
                }
                return file;
            })
        );
    }, [setSelectedFiles]);

    const handleAddFileById = useCallback(async (fileApiId: string) => {
        setAppFileError(null);
        if (!fileApiId || !fileApiId.startsWith('files/')) { setAppFileError('Invalid File ID format.'); return; }
        if (selectedFiles.some(f => f.fileApiName === fileApiId)) { setAppFileError(`File with ID ${fileApiId} is already added.`); return; }

        const tempId = generateUniqueId();
        setSelectedFiles(prev => [...prev, { id: tempId, name: `Loading ${fileApiId}...`, type: 'application/octet-stream', size: 0, isProcessing: true, progress: 50, uploadState: 'processing_api', fileApiName: fileApiId, }]);

        try {
            const fileMetadata = await geminiServiceInstance.getFileMetadata(fileApiId);
            if (fileMetadata) {
                if (!ALL_SUPPORTED_MIME_TYPES.includes(fileMetadata.mimeType)) {
                    setSelectedFiles(prev => prev.map(f => f.id === tempId ? { ...f, name: fileMetadata.displayName || fileApiId, type: fileMetadata.mimeType, size: Number(fileMetadata.sizeBytes) || 0, isProcessing: false, error: `Unsupported file type: ${fileMetadata.mimeType}`, uploadState: 'failed' } : f));
                    return;
                }
                const newFile: UploadedFile = { id: tempId, name: fileMetadata.displayName || fileApiId, type: fileMetadata.mimeType, size: Number(fileMetadata.sizeBytes) || 0, fileUri: fileMetadata.uri, fileApiName: fileMetadata.name, isProcessing: false, progress: 100, uploadState: fileMetadata.state === 'ACTIVE' ? 'active' : 'failed', error: fileMetadata.state === 'FAILED' ? 'File API processing failed' : undefined, };
                setSelectedFiles(prev => prev.map(f => f.id === tempId ? newFile : f));
            } else {
                setAppFileError(`File with ID ${fileApiId} not found or inaccessible.`);
                setSelectedFiles(prev => prev.map(f => f.id === tempId ? { ...f, name: `Not Found: ${fileApiId}`, isProcessing: false, error: 'File not found.', uploadState: 'failed' } : f));
            }
        } catch (error) {
            if (error instanceof Error && error.name === 'SilentError') {
                setAppFileError('API key not configured.');
                setSelectedFiles(prev => prev.map(f => f.id === tempId ? { ...f, name: `Config Error: ${fileApiId}`, isProcessing: false, error: 'API key not configured', uploadState: 'failed' } : f));
                return;
            }
            setAppFileError(`Error fetching file: ${error instanceof Error ? error.message : String(error)}`);
            setSelectedFiles(prev => prev.map(f => f.id === tempId ? { ...f, name: `Error: ${fileApiId}`, isProcessing: false, error: `Fetch error`, uploadState: 'failed' } : f));
        }
    }, [selectedFiles, setSelectedFiles, setAppFileError]);

    // Drag and Drop handlers
    const handleAppDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer.types.includes('Files')) setIsAppDraggingOver(true); }, []);
    const handleAppDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); if (isAppProcessingFile) { e.dataTransfer.dropEffect = 'none'; return; } if (e.dataTransfer.types.includes('Files')) { e.dataTransfer.dropEffect = 'copy'; if (!isAppDraggingOver) setIsAppDraggingOver(true); } else e.dataTransfer.dropEffect = 'none'; }, [isAppDraggingOver, isAppProcessingFile]);
    const handleAppDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); if (e.currentTarget.contains(e.relatedTarget as Node)) return; setIsAppDraggingOver(false); }, []);
    const handleAppDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsAppDraggingOver(false); if (isAppProcessingFile) return; const files = e.dataTransfer.files; if (files?.length) await handleProcessAndAddFiles(files); }, [isAppProcessingFile, handleProcessAndAddFiles]);

    return {
        isAppDraggingOver,
        handleProcessAndAddFiles,
        handleCancelFileUpload,
        handleAddFileById,
        handleAppDragEnter,
        handleAppDragOver,
        handleAppDragLeave,
        handleAppDrop,
    };
};
