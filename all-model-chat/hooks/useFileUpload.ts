
import { useCallback, Dispatch, SetStateAction, useRef } from 'react';
import { AppSettings, ChatSettings as IndividualChatSettings, UploadedFile } from '../types';
import { ALL_SUPPORTED_MIME_TYPES, SUPPORTED_IMAGE_MIME_TYPES, SUPPORTED_TEXT_MIME_TYPES, TEXT_BASED_EXTENSIONS, SUPPORTED_PDF_MIME_TYPES, SUPPORTED_AUDIO_MIME_TYPES, SUPPORTED_VIDEO_MIME_TYPES } from '../constants/fileConstants';
import { generateUniqueId, getKeyForRequest, fileToBlobUrl, getActiveApiConfig } from '../utils/appUtils';
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
    if (!isFinite(bytesPerSecond) || bytesPerSecond < 0) return '';
    if (bytesPerSecond < 1024) return `${Math.round(bytesPerSecond)} B/s`;
    if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
};

const LARGE_FILE_THRESHOLD = 19 * 1024 * 1024; 

const EXTENSION_TO_MIME: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.avi': 'video/avi',
    '.wmv': 'video/x-ms-wmv',
    '.mpg': 'video/mpeg',
    '.mpeg': 'video/mpeg',
    '.webm': 'video/webm',
    '.flv': 'video/x-flv',
    '.3gp': 'video/3gpp',
    '.pdf': 'application/pdf',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.aac': 'audio/aac',
    '.ogg': 'audio/ogg',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
};

export const useFileUpload = ({
    appSettings,
    selectedFiles,
    setSelectedFiles,
    setAppFileError,
    currentChatSettings,
    setCurrentChatSettings,
}: UseFileUploadProps) => {

    const uploadStatsRef = useRef<Map<string, { lastLoaded: number, lastTime: number }>>(new Map());

    const handleProcessAndAddFiles = useCallback(async (files: FileList | File[]) => {
        if (!files || files.length === 0) return;
        setAppFileError(null);
        logService.info(`Processing ${files.length} files.`);

        const rawFilesArray = Array.isArray(files) ? files : Array.from(files);
        const filesArray: File[] = [];

        for (const file of rawFilesArray) {
            if (file.name.toLowerCase().endsWith('.zip')) {
                const tempId = generateUniqueId();
                setSelectedFiles(prev => [...prev, {
                    id: tempId,
                    name: `Processing ${file.name}...`,
                    type: 'application/zip',
                    size: file.size,
                    isProcessing: true,
                    uploadState: 'pending'
                }]);

                try {
                    logService.info(`Auto-converting ZIP file: ${file.name}`);
                    const contextFile = await generateZipContext(file);
                    filesArray.push(contextFile);
                } catch (error) {
                    logService.error(`Failed to auto-convert zip file ${file.name}`, { error });
                    filesArray.push(file);
                } finally {
                    setSelectedFiles(prev => prev.filter(f => f.id !== tempId));
                }
            } else {
                filesArray.push(file);
            }
        }

        const getEffectiveMimeType = (file: File) => {
            let effectiveMimeType = file.type;
            const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;

            if (TEXT_BASED_EXTENSIONS.includes(fileExtension) || SUPPORTED_TEXT_MIME_TYPES.includes(file.type)) {
                return 'text/plain';
            }

            if (!effectiveMimeType && EXTENSION_TO_MIME[fileExtension]) {
                return EXTENSION_TO_MIME[fileExtension];
            }

            return effectiveMimeType;
        };

        const needsApiKeyForUpload = filesArray.some(file => {
            const effectiveMimeType = getEffectiveMimeType(file);
            
            if (!ALL_SUPPORTED_MIME_TYPES.includes(effectiveMimeType)) return false;

            let userPrefersFileApi = false;
            if (SUPPORTED_IMAGE_MIME_TYPES.includes(effectiveMimeType)) userPrefersFileApi = appSettings.filesApiConfig.images;
            else if (SUPPORTED_PDF_MIME_TYPES.includes(effectiveMimeType)) userPrefersFileApi = appSettings.filesApiConfig.pdfs;
            else if (SUPPORTED_AUDIO_MIME_TYPES.includes(effectiveMimeType)) userPrefersFileApi = appSettings.filesApiConfig.audio;
            else if (SUPPORTED_VIDEO_MIME_TYPES.includes(effectiveMimeType)) userPrefersFileApi = appSettings.filesApiConfig.video;
            else userPrefersFileApi = appSettings.filesApiConfig.text;

            return userPrefersFileApi || file.size > LARGE_FILE_THRESHOLD;
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
        
        const { baseUrl } = getActiveApiConfig(appSettings);

        const uploadPromises = filesArray.map(async (file) => {
            const fileId = generateUniqueId();
            const effectiveMimeType = getEffectiveMimeType(file);

            if (!ALL_SUPPORTED_MIME_TYPES.includes(effectiveMimeType)) {
                logService.warn(`Unsupported file type skipped: ${file.name}`, { type: file.type, effectiveType: effectiveMimeType });
                setSelectedFiles(prev => [...prev, { id: fileId, name: file.name, type: file.type || 'unknown', size: file.size, isProcessing: false, progress: 0, error: `Unsupported file type: ${file.name}`, uploadState: 'failed' }]);
                return;
            }

            let userPrefersFileApi = false;
            if (SUPPORTED_IMAGE_MIME_TYPES.includes(effectiveMimeType)) userPrefersFileApi = appSettings.filesApiConfig.images;
            else if (SUPPORTED_PDF_MIME_TYPES.includes(effectiveMimeType)) userPrefersFileApi = appSettings.filesApiConfig.pdfs;
            else if (SUPPORTED_AUDIO_MIME_TYPES.includes(effectiveMimeType)) userPrefersFileApi = appSettings.filesApiConfig.audio;
            else if (SUPPORTED_VIDEO_MIME_TYPES.includes(effectiveMimeType)) userPrefersFileApi = appSettings.filesApiConfig.video;
            else userPrefersFileApi = appSettings.filesApiConfig.text;

            const shouldUploadFile = userPrefersFileApi || file.size > LARGE_FILE_THRESHOLD;
            
            const dataUrl = fileToBlobUrl(file);

            if (shouldUploadFile) {
                if (!keyToUse) {
                    const errorMsg = 'API key was not available for file upload.';
                    logService.error(errorMsg);
                    setSelectedFiles(prev => [...prev, { id: fileId, name: file.name, type: effectiveMimeType, size: file.size, isProcessing: false, progress: 0, error: errorMsg, uploadState: 'failed' }]);
                    return;
                }
                const controller = new AbortController();

                const initialFileState: UploadedFile = { 
                    id: fileId, 
                    name: file.name, 
                    type: effectiveMimeType, 
                    size: file.size, 
                    isProcessing: true, 
                    progress: 0, 
                    rawFile: file, 
                    dataUrl: dataUrl, 
                    uploadState: 'uploading', 
                    abortController: controller,
                    uploadSpeed: 'Starting...'
                };
                
                uploadStatsRef.current.set(fileId, { lastLoaded: 0, lastTime: Date.now() });
                
                setSelectedFiles(prev => [...prev, initialFileState]);

                const handleProgress = (loaded: number, total: number) => {
                    const now = Date.now();
                    const stats = uploadStatsRef.current.get(fileId);
                    
                    let speedStr = '';
                    if (stats) {
                        const timeDiff = now - stats.lastTime;
                        if (timeDiff > 500) {
                            const bytesDiff = loaded - stats.lastLoaded;
                            const speed = bytesDiff / (timeDiff / 1000); 
                            speedStr = formatSpeed(speed);
                            uploadStatsRef.current.set(fileId, { lastLoaded: loaded, lastTime: now });
                        }
                    }

                    const percent = Math.round((loaded / total) * 100);
                    
                    setSelectedFiles(prev => prev.map(f => {
                        if (f.id === fileId) {
                            return { 
                                ...f, 
                                progress: percent, 
                                uploadSpeed: speedStr || f.uploadSpeed 
                            };
                        }
                        return f;
                    }));
                };

                try {
                    const uploadedFileInfo = await geminiServiceInstance.uploadFile(
                        keyToUse, 
                        file, 
                        effectiveMimeType, 
                        file.name, 
                        controller.signal,
                        baseUrl,
                        handleProgress
                    );
                    
                    logService.info(`File uploaded, initial state: ${uploadedFileInfo.state}`, { fileInfo: uploadedFileInfo });

                    const uploadState = uploadedFileInfo.state === 'ACTIVE'
                        ? 'active'
                        : (uploadedFileInfo.state === 'PROCESSING' ? 'processing_api' : 'failed');

                    setSelectedFiles(prev => prev.map(f => f.id === fileId ? {
                        ...f,
                        isProcessing: uploadState === 'processing_api',
                        progress: 100,
                        fileUri: uploadedFileInfo.uri,
                        fileApiName: uploadedFileInfo.name,
                        rawFile: file,
                        uploadState: uploadState,
                        error: uploadedFileInfo.state === 'FAILED' ? 'File API processing failed' : (f.error || undefined),
                        abortController: undefined,
                        uploadSpeed: undefined,
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
                    setSelectedFiles(prev => prev.map(f => f.id === fileId ? { ...f, isProcessing: false, error: errorMsg, rawFile: undefined, uploadState: uploadStateUpdate, abortController: undefined, uploadSpeed: undefined } : f));
                } finally {
                    uploadStatsRef.current.delete(fileId);
                }
            } else {
                const initialFileState: UploadedFile = { id: fileId, name: file.name, type: effectiveMimeType, size: file.size, isProcessing: true, progress: 0, uploadState: 'pending', rawFile: file, dataUrl: dataUrl };
                setSelectedFiles(prev => [...prev, initialFileState]);
                setSelectedFiles(p => p.map(f => f.id === fileId ? { ...f, isProcessing: false, progress: 100, uploadState: 'active' } : f));
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
                    return { ...file, isProcessing: false, error: "Cancelling...", uploadState: 'failed', uploadSpeed: undefined };
                }
                return file;
            })
        );
        uploadStatsRef.current.delete(fileIdToCancel);
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
        
        const { baseUrl } = getActiveApiConfig(appSettings);

        const tempId = generateUniqueId();
        setSelectedFiles(prev => [...prev, { id: tempId, name: `Loading ${fileApiId}...`, type: 'application/octet-stream', size: 0, isProcessing: true, progress: 50, uploadState: 'processing_api', fileApiName: fileApiId, }]);

        try {
            const fileMetadata = await geminiServiceInstance.getFileMetadata(keyToUse, fileApiId, baseUrl);
            if (fileMetadata) {
                logService.info(`Successfully fetched metadata for file ID ${fileApiId}`, { metadata: fileMetadata });
                
                const isValidType = ALL_SUPPORTED_MIME_TYPES.includes(fileMetadata.mimeType) || 
                                    (fileMetadata.mimeType.startsWith('video/') && !fileMetadata.mimeType.includes('youtube'));

                if (!isValidType) {
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
