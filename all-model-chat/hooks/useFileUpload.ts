


import React, { useCallback, Dispatch, SetStateAction, useRef } from 'react';
import { AppSettings, ChatSettings as IndividualChatSettings, UploadedFile, MediaResolution } from '../types';
import { ALL_SUPPORTED_MIME_TYPES, SUPPORTED_IMAGE_MIME_TYPES, SUPPORTED_TEXT_MIME_TYPES, TEXT_BASED_EXTENSIONS, SUPPORTED_PDF_MIME_TYPES, SUPPORTED_AUDIO_MIME_TYPES, SUPPORTED_VIDEO_MIME_TYPES, EXTENSION_TO_MIME } from '../constants/fileConstants';
import { generateUniqueId, getKeyForRequest, fileToBlobUrl } from '../utils/appUtils';
import { geminiServiceInstance } from '../services/geminiService';
import { logService } from '../services/logService';
import { generateZipContext } from '../utils/folderImportUtils';
import { compressAudioToMp3 } from '../utils/audioCompression';

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

const LARGE_FILE_THRESHOLD = 19 * 1024 * 1024; // 19MB margin for 20MB limit

export const useFileUpload = ({
    appSettings,
    selectedFiles,
    setSelectedFiles,
    setAppFileError,
    currentChatSettings,
    setCurrentChatSettings,
}: UseFileUploadProps) => {

    // Refs to track upload speed for each file ID
    const uploadStatsRef = useRef<Map<string, { lastLoaded: number, lastTime: number }>>(new Map());

    const handleProcessAndAddFiles = useCallback(async (files: FileList | File[]) => {
        if (!files || files.length === 0) return;
        setAppFileError(null);
        logService.info(`Processing ${files.length} files.`);

        const rawFilesArray = Array.isArray(files) ? files : Array.from(files);
        const filesArray: File[] = [];

        // Pre-process files (ZIP extraction, Audio compression)
        for (const file of rawFilesArray) {
            const fileNameLower = file.name.toLowerCase();
            
            // Expanded audio detection
            const isAudio = file.type.startsWith('audio/') || 
                ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.aac', '.webm', '.wma', '.aiff'].some(ext => fileNameLower.endsWith(ext));

            if (fileNameLower.endsWith('.zip')) {
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
            } else if (isAudio) {
                if (appSettings.isAudioCompressionEnabled) {
                    // Auto-compress audio
                    const tempId = generateUniqueId();
                    const abortController = new AbortController();

                    setSelectedFiles(prev => [...prev, {
                        id: tempId,
                        name: `Compressing ${file.name}...`,
                        type: file.type || 'audio/mpeg',
                        size: file.size,
                        isProcessing: true,
                        uploadState: 'pending',
                        abortController: abortController
                    }]);

                    try {
                        logService.info(`Compressing audio file: ${file.name}`);
                        const compressedFile = await compressAudioToMp3(file, abortController.signal);
                        filesArray.push(compressedFile);
                    } catch (error) {
                        const isAbort = (error instanceof Error || error instanceof DOMException) && error.name === 'AbortError';
                        if (isAbort) {
                             logService.info(`Compression cancelled for ${file.name}`);
                             // Do not push to filesArray, effectively removing it
                        } else {
                            logService.error(`Failed to compress audio file ${file.name}`, { error });
                            filesArray.push(file); // Fallback to original
                        }
                    } finally {
                        setSelectedFiles(prev => prev.filter(f => f.id !== tempId));
                    }
                } else {
                    filesArray.push(file);
                }
            } else {
                filesArray.push(file);
            }
        }

        // --- Helper to get effective MIME type ---
        const getEffectiveMimeType = (file: File) => {
            let effectiveMimeType = file.type;
            const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;

            // 1. Force text/plain for code/text extensions
            if (TEXT_BASED_EXTENSIONS.includes(fileExtension) || SUPPORTED_TEXT_MIME_TYPES.includes(file.type)) {
                return 'text/plain';
            }

            // 2. Fallback for missing MIME types based on extension
            if (!effectiveMimeType && EXTENSION_TO_MIME[fileExtension]) {
                return EXTENSION_TO_MIME[fileExtension];
            }

            return effectiveMimeType;
        };

        // Calculate if ANY file requires API upload to handle key rotation logic first
        const needsApiKeyForUpload = filesArray.some(file => {
            const effectiveMimeType = getEffectiveMimeType(file);
            
            if (!ALL_SUPPORTED_MIME_TYPES.includes(effectiveMimeType)) return false;

            // Check specific category setting
            let userPrefersFileApi = false;
            if (SUPPORTED_IMAGE_MIME_TYPES.includes(effectiveMimeType)) userPrefersFileApi = appSettings.filesApiConfig.images;
            else if (SUPPORTED_PDF_MIME_TYPES.includes(effectiveMimeType)) userPrefersFileApi = appSettings.filesApiConfig.pdfs;
            else if (SUPPORTED_AUDIO_MIME_TYPES.includes(effectiveMimeType)) userPrefersFileApi = appSettings.filesApiConfig.audio;
            else if (SUPPORTED_VIDEO_MIME_TYPES.includes(effectiveMimeType)) userPrefersFileApi = appSettings.filesApiConfig.video;
            else userPrefersFileApi = appSettings.filesApiConfig.text; // Fallback for text/code

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

        // Determine default resolution for new files
        const defaultResolution = currentChatSettings.mediaResolution !== MediaResolution.MEDIA_RESOLUTION_UNSPECIFIED
            ? currentChatSettings.mediaResolution
            : undefined;

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
            
            // Generate a blob URL immediately for local preview, regardless of upload method
            const dataUrl = fileToBlobUrl(file);

            if (shouldUploadFile) {
                if (!keyToUse) {
                    const errorMsg = 'API key was not available for file upload.';
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
                    abortController: controller,
                    uploadSpeed: 'Starting...',
                    mediaResolution: defaultResolution
                };
                
                // Initialize tracking for speed calculation
                uploadStatsRef.current.set(fileId, { lastLoaded: 0, lastTime: Date.now() });
                
                setSelectedFiles(prev => [...prev, initialFileState]);

                const handleProgress = (loaded: number, total: number) => {
                    const now = Date.now();
                    const stats = uploadStatsRef.current.get(fileId);
                    
                    let speedStr = '';
                    if (stats) {
                        const timeDiff = now - stats.lastTime;
                        // Only update speed every ~500ms to prevent flickering
                        if (timeDiff > 500) {
                            const bytesDiff = loaded - stats.lastLoaded;
                            const speed = bytesDiff / (timeDiff / 1000); // Bytes per second
                            speedStr = formatSpeed(speed);
                            
                            // Update stored stats
                            uploadStatsRef.current.set(fileId, { lastLoaded: loaded, lastTime: now });
                        }
                    }

                    const percent = Math.round((loaded / total) * 100);
                    
                    setSelectedFiles(prev => prev.map(f => {
                        if (f.id === fileId) {
                            return { 
                                ...f, 
                                progress: percent, 
                                uploadSpeed: speedStr || f.uploadSpeed // Keep old speed if not updated this tick
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
                        handleProgress // Pass progress callback
                    );
                    
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
                // Inline processing (Base64 or Text content)
                const initialFileState: UploadedFile = { 
                    id: fileId, 
                    name: file.name, 
                    type: effectiveMimeType, 
                    size: file.size, 
                    isProcessing: true, 
                    progress: 0, 
                    uploadState: 'pending', 
                    rawFile: file, 
                    dataUrl: dataUrl,
                    mediaResolution: defaultResolution
                };
                setSelectedFiles(prev => [...prev, initialFileState]);

                // For text files being sent inline, we need to read the content now or during payload construction.
                // Since buildContentParts handles reading text/code files if !fileUri, we just mark active here.
                // However, for Image/Audio/Video inline, we rely on dataUrl (blob) or re-reading base64 later.
                // Simply marking active is sufficient as buildContentParts will do the heavy lifting.
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
        const defaultResolution = currentChatSettings.mediaResolution !== MediaResolution.MEDIA_RESOLUTION_UNSPECIFIED
            ? currentChatSettings.mediaResolution
            : undefined;

        setSelectedFiles(prev => [...prev, { id: tempId, name: `Loading ${fileApiId}...`, type: 'application/octet-stream', size: 0, isProcessing: true, progress: 50, uploadState: 'processing_api', fileApiName: fileApiId, mediaResolution: defaultResolution }]);

        try {
            const fileMetadata = await geminiServiceInstance.getFileMetadata(keyToUse, fileApiId);
            if (fileMetadata) {
                logService.info(`Successfully fetched metadata for file ID ${fileApiId}`, { metadata: fileMetadata });
                
                // Allow known video types or generic octet-stream (often used for arbitrary files)
                // But strictly validate if it is a supported type if it's not generic
                const isValidType = ALL_SUPPORTED_MIME_TYPES.includes(fileMetadata.mimeType) || 
                                    (fileMetadata.mimeType.startsWith('video/') && !fileMetadata.mimeType.includes('youtube'));

                if (!isValidType) {
                    logService.warn(`Unsupported file type for file ID ${fileApiId}`, { type: fileMetadata.mimeType });
                    setSelectedFiles(prev => prev.map(f => f.id === tempId ? { ...f, name: fileMetadata.displayName || fileApiId, type: fileMetadata.mimeType, size: Number(fileMetadata.sizeBytes) || 0, isProcessing: false, error: `Unsupported file type: ${fileMetadata.mimeType}`, uploadState: 'failed' } : f));
                    return;
                }
                const newFile: UploadedFile = { 
                    id: tempId, 
                    name: fileMetadata.displayName || fileApiId, 
                    type: fileMetadata.mimeType, 
                    size: Number(fileMetadata.sizeBytes) || 0, 
                    fileUri: fileMetadata.uri, 
                    fileApiName: fileMetadata.name, 
                    isProcessing: fileMetadata.state === 'PROCESSING', 
                    progress: 100, 
                    uploadState: fileMetadata.state === 'ACTIVE' ? 'active' : (fileMetadata.state === 'PROCESSING' ? 'processing_api' : 'failed'), 
                    error: fileMetadata.state === 'FAILED' ? 'File API processing failed' : undefined,
                    mediaResolution: defaultResolution
                };
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