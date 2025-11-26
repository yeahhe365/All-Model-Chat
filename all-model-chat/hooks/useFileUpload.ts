
import { useCallback, Dispatch, SetStateAction } from 'react';
import { AppSettings, ChatSettings as IndividualChatSettings, UploadedFile } from '../types';
import { ALL_SUPPORTED_MIME_TYPES, SUPPORTED_IMAGE_MIME_TYPES, SUPPORTED_TEXT_MIME_TYPES, TEXT_BASED_EXTENSIONS } from '../constants/fileConstants';
import { generateUniqueId, getKeyForRequest, fileToBlobUrl } from '../utils/appUtils';
import { geminiServiceInstance } from '../services/geminiService';
import { logService } from '../services/logService';
import { generateZipContext } from '../utils/folderImportUtils';

interface UseFileUploadProps {
    appSettings: AppSettings;
    selectedFiles: UploadedFile[];
    setSelectedFiles: Dispatch<SetStateAction<UploadedFile[]>>;
    setAppFileError: Dispatch<SetStateAction<string | null>>;
    currentChatSettings: IndividualChatSettings;
    setCurrentChatSettings: (updater: (prevSettings: IndividualChatSettings) => IndividualChatSettings) => void;
}

const formatSpeed = (bytesPerSecond: number): string => {
    if (bytesPerSecond < 1024) return `${Math.round(bytesPerSecond)} B/s`;
    if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
};

export const useFileUpload = ({
    appSettings,
    selectedFiles,
    setSelectedFiles,
    setAppFileError,
    currentChatSettings,
    setCurrentChatSettings,
}: UseFileUploadProps) => {

    const handleProcessAndAddFiles = useCallback(async (files: FileList | File[]) => {
        if (!files || files.length === 0) return;
        setAppFileError(null);
        logService.info(`Processing ${files.length} files.`);

        const rawFilesArray = Array.isArray(files) ? files : Array.from(files);
        const filesArray: File[] = [];

        // Pre-process ZIP files: Auto-convert to text context
        for (const file of rawFilesArray) {
            if (file.name.toLowerCase().endsWith('.zip')) {
                try {
                    logService.info(`Auto-converting ZIP file: ${file.name}`);
                    const contextFile = await generateZipContext(file);
                    filesArray.push(contextFile);
                } catch (error) {
                    logService.error(`Failed to auto-convert zip file ${file.name}`, { error });
                    // Fallback to original file (will likely fail validation below, but keeps behavior consistent)
                    filesArray.push(file);
                }
            } else {
                filesArray.push(file);
            }
        }

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

            // Per user request, force all text and code formats to be treated as text/plain for the model.
            if (SUPPORTED_TEXT_MIME_TYPES.includes(file.type) || TEXT_BASED_EXTENSIONS.includes(fileExtension)) {
                effectiveMimeType = 'text/plain';
                logService.debug(`Forcing mimeType to 'text/plain' for text/code file ${file.name}`);
            }

            if (!ALL_SUPPORTED_MIME_TYPES.includes(effectiveMimeType)) {
                logService.warn(`Unsupported file type skipped: ${file.name}`, { type: file.type });
                setSelectedFiles(prev => [...prev, { id: fileId, name: file.name, type: file.type, size: file.size, isProcessing: false, progress: 0, error: `Unsupported file type: ${file.type || 'unknown'}`, uploadState: 'failed' }]);
                return;
            }

            const shouldUploadFile = !SUPPORTED_IMAGE_MIME_TYPES.includes(effectiveMimeType) || appSettings.useFilesApiForImages;
            
            // Generate a blob URL immediately for local preview, regardless of upload method
            const dataUrl = fileToBlobUrl(file);

            if (shouldUploadFile) {
                if (!keyToUse) {
                    const errorMsg = 'API key was not available for non-image file upload.';
                    logService.error(errorMsg);
                    setSelectedFiles(prev => [...prev, { id: fileId, name: file.name, type: effectiveMimeType, size: file.size, isProcessing: false, progress: 0, error: errorMsg, uploadState: 'failed' }]);
                    return;
                }
                const controller = new AbortController();

                // Initialize with 'uploading' state to show progress UI immediately
                const initialFileState: UploadedFile = { 
                    id: fileId, 
                    name: file.name, 
                    type: effectiveMimeType, 
                    size: file.size, 
                    isProcessing: true, 
                    progress: 0, 
                    rawFile: file, 
                    dataUrl: dataUrl, // Add local preview URL
                    uploadState: 'uploading', 
                    abortController: controller 
                };
                setSelectedFiles(prev => [...prev, initialFileState]);

                // Simulate progress for better UX since we don't have real progress callback from SDK yet
                const minDuration = 2000;
                // Assumed average speed for simulation: ~1MB/s range for realistic feel on broadband
                const assumedSpeed = 1024 * 1024;
                const calculatedDuration = (file.size / assumedSpeed) * 1000;
                const duration = Math.min(Math.max(minDuration, calculatedDuration), 25000);
                const updateFrequency = 250; // ms
                const targetProgress = 95;
                const step = targetProgress / (duration / updateFrequency); // completion step per tick

                let currentSimulatedProgress = 0;
                const progressInterval = setInterval(() => {
                    currentSimulatedProgress = Math.min(targetProgress, currentSimulatedProgress + step);

                    // Vary speed slightly for realism (+- 10%)
                    const variance = 0.9 + Math.random() * 0.2;
                    const currentBytesPerSecond = ((step / 100 * file.size) / (updateFrequency / 1000)) * variance;
                    const speedStr = formatSpeed(currentBytesPerSecond);

                    setSelectedFiles(prev => prev.map(f => f.id === fileId ? { ...f, progress: currentSimulatedProgress, uploadSpeed: speedStr } : f));
                }, updateFrequency);

                try {
                    const uploadedFileInfo = await geminiServiceInstance.uploadFile(keyToUse, file, effectiveMimeType, file.name, controller.signal);
                    clearInterval(progressInterval);
                    logService.info(`File uploaded, initial state: ${uploadedFileInfo.state}`, { fileInfo: uploadedFileInfo });

                    const uploadState = uploadedFileInfo.state === 'ACTIVE'
                        ? 'active'
                        : (uploadedFileInfo.state === 'PROCESSING' ? 'processing_api' : 'failed');

                    setSelectedFiles(prev => prev.map(f => f.id === fileId ? {
                        ...f,
                        isProcessing: uploadState === 'processing_api', // Only false if active or failed
                        progress: 100,
                        fileUri: uploadedFileInfo.uri,
                        fileApiName: uploadedFileInfo.name,
                        rawFile: file, // Preserve local file reference for preview
                        uploadState: uploadState,
                        error: uploadedFileInfo.state === 'FAILED' ? 'File API processing failed' : (f.error || undefined),
                        abortController: undefined,
                        uploadSpeed: undefined, // Clear speed on complete
                    } : f));

                } catch (uploadError) {
                    clearInterval(progressInterval);
                    let errorMsg = `Upload failed: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`;
                    let uploadStateUpdate: UploadedFile['uploadState'] = 'failed';
                    if (uploadError instanceof Error && uploadError.name === 'AbortError') {
                        errorMsg = "Upload cancelled by user.";
                        uploadStateUpdate = 'cancelled';
                        logService.warn(`File upload cancelled by user: ${file.name}`);
                    }
                    logService.error(`File upload failed for ${file.name}`, { error: uploadError });
                    setSelectedFiles(prev => prev.map(f => f.id === fileId ? { ...f, isProcessing: false, error: errorMsg, rawFile: undefined, uploadState: uploadStateUpdate, abortController: undefined, uploadSpeed: undefined } : f));
                }
            } else {
                const initialFileState: UploadedFile = { id: fileId, name: file.name, type: effectiveMimeType, size: file.size, isProcessing: true, progress: 0, uploadState: 'pending', rawFile: file, dataUrl: dataUrl };
                setSelectedFiles(prev => [...prev, initialFileState]);

                // For images sent inline, we already have the dataUrl, just mark active
                setSelectedFiles(p => p.map(f => f.id === fileId ? { ...f, isProcessing: false, progress: 100, uploadState: 'active' } : f));
            }
        });
        await Promise.allSettled(uploadPromises);
    }, [setSelectedFiles, setAppFileError, appSettings, currentChatSettings, setCurrentChatSettings, selectedFiles]);

    const handleCancelFileUpload = useCallback((fileIdToCancel: string) => {
        logService.warn(`User cancelled file upload: ${fileIdToCancel}`);
        setSelectedFiles(prevFiles =>
            prevFiles.map(file => {
                if (file.id === fileIdToCancel && file.abortController) {
                    file.abortController.abort();
                    return { ...file, isProcessing: false, error: "Cancelling...", uploadState: 'failed', uploadSpeed: undefined };
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

        // Adding file by ID is an explicit user action, we rotate key to be safe/fair
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
                const newFile: UploadedFile = { id: tempId, name: fileMetadata.displayName || fileApiId, type: fileMetadata.mimeType, size: Number(fileMetadata.sizeBytes) || 0, fileUri: fileMetadata.uri, fileApiName: fileMetadata.name, isProcessing: fileMetadata.state === 'PROCESSING', progress: 100, uploadState: fileMetadata.state === 'ACTIVE' ? 'active' : (fileMetadata.state === 'PROCESSING' ? 'processing_api' : 'failed'), error: fileMetadata.state === 'FAILED' ? 'File API processing failed' : undefined, };
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

    return {
        handleProcessAndAddFiles,
        handleCancelFileUpload,
        handleAddFileById,
    };
};
