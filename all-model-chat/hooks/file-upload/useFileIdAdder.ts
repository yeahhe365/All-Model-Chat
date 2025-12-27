import { useCallback, Dispatch, SetStateAction } from 'react';
import { AppSettings, ChatSettings as IndividualChatSettings, UploadedFile, MediaResolution } from '../../types';
import { ALL_SUPPORTED_MIME_TYPES } from '../../constants/fileConstants';
import { generateUniqueId, getKeyForRequest, logService } from '../../utils/appUtils';
import { geminiServiceInstance } from '../../services/geminiService';

interface UseFileIdAdderProps {
    appSettings: AppSettings;
    setSelectedFiles: Dispatch<SetStateAction<UploadedFile[]>>;
    setAppFileError: Dispatch<SetStateAction<string | null>>;
    currentChatSettings: IndividualChatSettings;
    setCurrentChatSettings: (updater: (prevSettings: IndividualChatSettings) => IndividualChatSettings) => void;
    selectedFiles: UploadedFile[];
}

export const useFileIdAdder = ({
    appSettings,
    setSelectedFiles,
    setAppFileError,
    currentChatSettings,
    setCurrentChatSettings,
    selectedFiles
}: UseFileIdAdderProps) => {
    
    const addFileById = useCallback(async (fileApiId: string) => {
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
    }, [appSettings, currentChatSettings, selectedFiles, setAppFileError, setCurrentChatSettings, setSelectedFiles]);

    return { addFileById };
};