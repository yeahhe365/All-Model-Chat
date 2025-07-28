import { useState, useCallback, useEffect, Dispatch, SetStateAction } from 'react';
import { AppSettings, ChatSettings as IndividualChatSettings, UploadedFile } from '../types';
import { ALL_SUPPORTED_MIME_TYPES, SUPPORTED_IMAGE_MIME_TYPES, SUPPORTED_TEXT_MIME_TYPES, TEXT_BASED_EXTENSIONS } from '../constants/fileConstants';
import { generateUniqueId, getKeyForRequest, fileToDataUrl } from '../utils/appUtils';
import { geminiServiceInstance } from '../services/geminiService';
import { logService } from '../services/logService';
import { POLLING_INTERVAL_MS, MAX_POLLING_DURATION_MS } from '../services/api/baseApi';

interface FileHandlingProps {
    appSettings: AppSettings;
    selectedFiles: UploadedFile[];
    setSelectedFiles: Dispatch<SetStateAction<UploadedFile[]>>;
    setAppFileError: Dispatch<SetStateAction<string | null>>;
    isAppProcessingFile: boolean;
    setIsAppProcessingFile: Dispatch<SetStateAction<boolean>>;
    currentChatSettings: IndividualChatSettings;
    setCurrentChatSettings: (updater: (prevSettings: IndividualChatSettings) => IndividualChatSettings) => void;
}

export const useFileHandling = ({
    appSettings,
    selectedFiles,
    setSelectedFiles,
    setAppFileError,
    isAppProcessingFile,
    setIsAppProcessingFile,
    currentChatSettings,
    setCurrentChatSettings,
}: FileHandlingProps) => {

    const [isAppDraggingOver, setIsAppDraggingOver] = useState<boolean>(false);

    useEffect(() => {
        const anyFileProcessing = selectedFiles.some(file => file.isProcessing);
        setIsAppProcessingFile(anyFileProcessing);
    }, [selectedFiles, setIsAppProcessingFile]);

    useEffect(() => {
        const filesToPoll = selectedFiles.filter(f => f.uploadState === 'processing_api' && !f.error);

        if (filesToPoll.length === 0) {
            return;
        }

        const pollFile = (fileToPoll: UploadedFile) => {
            const { id: fileId, fileApiName } = fileToPoll;
            if (!fileApiName) {
                logService.warn(`Attempted to poll file ${fileId} without a fileApiName.`);
                return;
            }

            const keyResult = getKeyForRequest(appSettings, currentChatSettings);
            if ('error' in keyResult) {
                logService.error(`Polling for ${fileApiName} stopped: ${keyResult.error}`);
                setSelectedFiles(prev => prev.map(f => f.id === fileId ? { ...f, error: keyResult.error, uploadState: 'failed' } : f));
                return;
            }
            const keyToUse = keyResult.key;

            const startTime = Date.now();
            let pollerTimeoutId: number | undefined;

            const poll = async () => {
                if ((Date.now() - startTime) > MAX_POLLING_DURATION_MS) {
                    logService.error(`Polling timed out for file ${fileApiName}`);
                    setSelectedFiles(prev => prev.map(f => f.id === fileId ? { ...f, error: 'File processing timed out.', uploadState: 'failed' } : f));
                    return;
                }

                try {
                    const metadata = await geminiServiceInstance.getFileMetadata(keyToUse, fileApiName);
                    
                    let fileStillNeedsPolling = false;
                    setSelectedFiles(currentFiles => {
                        fileStillNeedsPolling = currentFiles.some(f => f.id === fileId && f.uploadState === 'processing_api');
                        return currentFiles;
                    });

                    if (!fileStillNeedsPolling) {
                         logService.info(`Polling stopped for ${fileApiName} as its state changed or it was removed.`);
                         return;
                    }
                    
                    if (metadata?.state === 'ACTIVE') {
                        logService.info(`File ${fileApiName} is now ACTIVE.`);
                        setSelectedFiles(prev => prev.map(f => f.id === fileId ? { ...f, uploadState: 'active' } : f));
                    } else if (metadata?.state === 'FAILED') {
                        logService.error(`File ${fileApiName} processing FAILED on backend.`);
                        setSelectedFiles(prev => prev.map(f => f.id === fileId ? { ...f, error: 'Backend processing failed.', uploadState: 'failed' } : f));
                    } else {
                        pollerTimeoutId = window.setTimeout(poll, POLLING_INTERVAL_MS);
                    }
                } catch (error) {
                    logService.error(`Error during polling for file ${fileApiName}`, { error });
                    setSelectedFiles(prev => prev.map(f => f.id === fileId ? { ...f, error: 'Polling failed.', uploadState: 'failed' } : f));
                }
            };
            
            pollerTimeoutId = window.setTimeout(poll, POLLING_INTERVAL_MS);
        };

        filesToPoll.forEach(pollFile);
        
    }, [selectedFiles, appSettings, currentChatSettings, setSelectedFiles]);

    const handleProcessAndAddFiles = useCallback(async (files: FileList | File[]) => {
        if (!files || files.length === 0) return;
        setAppFileError(null);
        logService.info(`Processing ${files.length} files.`);
        
        const filesArray = Array.isArray(files) ? files : Array.from(files);

        const needsApiKeyForUpload = filesArray.some(file => {
            const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
            let effectiveMimeType = file.type;
            if ((!effectiveMimeType || effectiveMimeType === 'application/octet-stream') && TEXT_BASED_EXTENSIONS.includes(fileExtension)) {
                 effectiveMimeType = 'text/plain';
            }
            if (!ALL_SUPPORTED_MIME_TYPES.includes(effectiveMimeType)) {
                return false;
            }
            if (SUPPORTED_IMAGE_MIME_TYPES.includes(effectiveMimeType)) {
                return appSettings.useFilesApiForImages;
            }
            return true; 
        });

        let keyToUse: string | null = null;
        if (needsApiKeyForUpload) {
            const keyResult = getKeyForRequest(appSettings, currentChatSettings);
            if ('error' in keyResult) {
                setAppFileError(keyResult.error);
                logService.error('Cannot process files: API key not configured.');
                return;
            }
            keyToUse = keyResult.key;
            if (keyResult.isNewKey) {
                logService.info('New API key selected for this session due to file upload.');
                setCurrentChatSettings(prev => ({ ...prev, lockedApiKey: keyToUse! }));
            }
        }

        const uploadPromises = filesArray.map(async (file) => {
            const fileId = generateUniqueId();
            let effectiveMimeType = file.type;
            const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
            if ((!effectiveMimeType || effectiveMimeType === 'application/octet-stream') && TEXT_BASED_EXTENSIONS.includes(fileExtension)) {
                effectiveMimeType = 'text/plain';
                logService.debug(`Assigned mimeType 'text/plain' to file ${file.name} based on extension.`);
            }

            if (!ALL_SUPPORTED_MIME_TYPES.includes(effectiveMimeType)) {
                logService.warn(`Unsupported file type skipped: ${file.name}`, { type: file.type });
                setSelectedFiles(prev => [...prev, { id: fileId, name: file.name, type: file.type, size: file.size, isProcessing: false, progress: 0, error: `Unsupported file type: ${file.type || 'unknown'}`, uploadState: 'failed' }]);
                return;
            }
            
            const shouldUploadFile = !SUPPORTED_IMAGE_MIME_TYPES.includes(effectiveMimeType) || appSettings.useFilesApiForImages;

            if (shouldUploadFile) {
                if (!keyToUse) {
                    const errorMsg = 'API key was not available for non-image file upload.';
                    logService.error(errorMsg);
                    setSelectedFiles(prev => [...prev, { id: fileId, name: file.name, type: effectiveMimeType, size: file.size, isProcessing: false, progress: 0, error: errorMsg, uploadState: 'failed' }]);
                    return;
                }
                const controller = new AbortController();
                const initialFileState: UploadedFile = { id: fileId, name: file.name, type: effectiveMimeType, size: file.size, isProcessing: true, progress: 0, rawFile: file, uploadState: 'pending', abortController: controller };
                setSelectedFiles(prev => [...prev, initialFileState]);
                try {
                    const uploadedFileInfo = await geminiServiceInstance.uploadFile(keyToUse, file, effectiveMimeType, file.name, controller.signal);
                    logService.info(`File uploaded, initial state: ${uploadedFileInfo.state}`, { fileInfo: uploadedFileInfo });
                    
                    const uploadState = uploadedFileInfo.state === 'ACTIVE' 
                        ? 'active' 
                        : (uploadedFileInfo.state === 'PROCESSING' ? 'processing_api' : 'failed');

                    setSelectedFiles(prev => prev.map(f => f.id === fileId ? { 
                        ...f, 
                        isProcessing: false,
                        progress: 100, 
                        fileUri: uploadedFileInfo.uri, 
                        fileApiName: uploadedFileInfo.name, 
                        rawFile: undefined, 
                        uploadState: uploadState, 
                        error: uploadedFileInfo.state === 'FAILED' ? 'File API processing failed' : (f.error || undefined), 
                        abortController: undefined, 
                    } : f));

                } catch (uploadError) {
                    let errorMsg = `Upload failed: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`;
                    let uploadStateUpdate: UploadedFile['uploadState'] = 'failed';
                    if (uploadError instanceof Error && uploadError.name === 'AbortError') {
                        errorMsg = "Upload cancelled by user.";
                        uploadStateUpdate = 'cancelled';
                        logService.warn(`File upload cancelled by user: ${file.name}`);
                    }
                    logService.error(`File upload failed for ${file.name}`, { error: uploadError });
                    setSelectedFiles(prev => prev.map(f => f.id === fileId ? { ...f, isProcessing: false, error: errorMsg, rawFile: undefined, uploadState: uploadStateUpdate, abortController: undefined, } : f));
                }
            } else {
                const initialFileState: UploadedFile = { id: fileId, name: file.name, type: effectiveMimeType, size: file.size, isProcessing: true, progress: 0, uploadState: 'pending', rawFile: file };
                setSelectedFiles(prev => [...prev, initialFileState]);
                
                const MAX_PREVIEW_SIZE = 5 * 1024 * 1024;

                if (file.size < MAX_PREVIEW_SIZE) {
                    try {
                        const dataUrl = await fileToDataUrl(file);
                        setSelectedFiles(p => p.map(f => f.id === fileId ? { ...f, dataUrl, isProcessing: false, progress: 100, uploadState: 'active' } : f));
                    } catch(error) {
                        logService.error('Error creating data URL for image', { error });
                        setSelectedFiles(prev => prev.map(f => f.id === fileId ? { ...f, isProcessing: false, error: 'Failed to create image preview.', uploadState: 'failed' } : f));
                    }
                } else {
                    logService.warn(`Skipping preview for large image: ${file.name}`, { size: file.size });
                    setSelectedFiles(p => p.map(f => f.id === fileId ? { ...f, isProcessing: false, progress: 100, uploadState: 'active' } : f));
                }
            }
        });
        await Promise.allSettled(uploadPromises);
    }, [setSelectedFiles, setAppFileError, appSettings, currentChatSettings, setCurrentChatSettings]);

    const handleCancelFileUpload = useCallback((fileIdToCancel: string) => {
        logService.warn(`User cancelled file upload: ${fileIdToCancel}`);
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
        logService.info(`Attempting to add file by ID: ${fileApiId}`);
        setAppFileError(null);
        if (!fileApiId || !fileApiId.startsWith('files/')) { 
            logService.error('Invalid File ID format.', { fileApiId });
            setAppFileError('Invalid File ID format.'); 
            return; 
        }
        if (selectedFiles.some(f => f.fileApiName === fileApiId)) { 
            logService.warn(`File with ID ${fileApiId} is already added.`);
            setAppFileError(`File with ID ${fileApiId} is already added.`); 
            return; 
        }

        const keyResult = getKeyForRequest(appSettings, currentChatSettings);
        if ('error' in keyResult) {
            logService.error('Cannot add file by ID: API key not configured.');
            setAppFileError(keyResult.error);
            return;
        }
        const { key: keyToUse, isNewKey } = keyResult;
        
        if (isNewKey) {
            logService.info('New API key selected for this session due to adding file by ID.');
            setCurrentChatSettings(prev => ({ ...prev, lockedApiKey: keyToUse }));
        }
        
        const tempId = generateUniqueId();
        setSelectedFiles(prev => [...prev, { id: tempId, name: `Loading ${fileApiId}...`, type: 'application/octet-stream', size: 0, isProcessing: true, progress: 50, uploadState: 'processing_api', fileApiName: fileApiId, }]);

        try {
            const fileMetadata = await geminiServiceInstance.getFileMetadata(keyToUse, fileApiId);
            if (fileMetadata) {
                logService.info(`Successfully fetched metadata for file ID ${fileApiId}`, { metadata: fileMetadata });
                if (!ALL_SUPPORTED_MIME_TYPES.includes(fileMetadata.mimeType)) {
                    logService.warn(`Unsupported file type for file ID ${fileApiId}`, { type: fileMetadata.mimeType });
                    setSelectedFiles(prev => prev.map(f => f.id === tempId ? { ...f, name: fileMetadata.displayName || fileApiId, type: fileMetadata.mimeType, size: Number(fileMetadata.sizeBytes) || 0, isProcessing: false, error: `Unsupported file type: ${fileMetadata.mimeType}`, uploadState: 'failed' } : f));
                    return;
                }
                const newFile: UploadedFile = { id: tempId, name: fileMetadata.displayName || fileApiId, type: fileMetadata.mimeType, size: Number(fileMetadata.sizeBytes) || 0, fileUri: fileMetadata.uri, fileApiName: fileMetadata.name, isProcessing: false, progress: 100, uploadState: fileMetadata.state === 'ACTIVE' ? 'active' : 'failed', error: fileMetadata.state === 'FAILED' ? 'File API processing failed' : undefined, };
                setSelectedFiles(prev => prev.map(f => f.id === tempId ? newFile : f));
            } else {
                logService.error(`File with ID ${fileApiId} not found or inaccessible.`);
                setAppFileError(`File with ID ${fileApiId} not found or inaccessible.`);
                setSelectedFiles(prev => prev.map(f => f.id === tempId ? { ...f, name: `Not Found: ${fileApiId}`, isProcessing: false, error: 'File not found.', uploadState: 'failed' } : f));
            }
        } catch (error) {
            if (error instanceof Error && error.name === 'SilentError') {
                logService.error('Cannot add file by ID: API key not configured.');
                setAppFileError('API key not configured.');
                setSelectedFiles(prev => prev.map(f => f.id === tempId ? { ...f, name: `Config Error: ${fileApiId}`, isProcessing: false, error: 'API key not configured', uploadState: 'failed' } : f));
                return;
            }
            logService.error(`Error fetching file metadata for ID ${fileApiId}`, { error });
            setAppFileError(`Error fetching file: ${error instanceof Error ? error.message : String(error)}`);
            setSelectedFiles(prev => prev.map(f => f.id === tempId ? { ...f, name: `Error: ${fileApiId}`, isProcessing: false, error: `Fetch error`, uploadState: 'failed' } : f));
        }
    }, [selectedFiles, setSelectedFiles, setAppFileError, appSettings, currentChatSettings, setCurrentChatSettings]);

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