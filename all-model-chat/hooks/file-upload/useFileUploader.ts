import { useCallback, Dispatch, SetStateAction, useRef } from 'react';
import { AppSettings, ChatSettings as IndividualChatSettings, UploadedFile, MediaResolution } from '../../types';
import { getKeyForRequest, logService } from '../../utils/appUtils';
import { checkBatchNeedsApiKey } from './utils';
import { uploadFileItem } from './uploadFileItem';

interface UseFileUploaderProps {
    appSettings: AppSettings;
    setSelectedFiles: Dispatch<SetStateAction<UploadedFile[]>>;
    setAppFileError: Dispatch<SetStateAction<string | null>>;
    currentChatSettings: IndividualChatSettings;
    setCurrentChatSettings: (updater: (prevSettings: IndividualChatSettings) => IndividualChatSettings) => void;
}

export const useFileUploader = ({
    appSettings,
    setSelectedFiles,
    setAppFileError,
    currentChatSettings,
    setCurrentChatSettings,
}: UseFileUploaderProps) => {
    
    // Refs to track upload speed for each file ID
    const uploadStatsRef = useRef<Map<string, { lastLoaded: number, lastTime: number }>>(new Map());

    const uploadFiles = useCallback(async (filesArray: File[]) => {
        if (filesArray.length === 0) return;

        // Calculate if ANY file requires API upload to handle key rotation logic first
        const needsApiKeyForUpload = checkBatchNeedsApiKey(filesArray, appSettings);

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

        const uploadPromises = filesArray.map(file => uploadFileItem({
            file,
            keyToUse,
            defaultResolution,
            appSettings,
            setSelectedFiles,
            uploadStatsRef
        }));

        await Promise.allSettled(uploadPromises);
    }, [appSettings, currentChatSettings, setCurrentChatSettings, setAppFileError, setSelectedFiles]);

    const cancelUpload = useCallback((fileIdToCancel: string) => {
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

    return { uploadFiles, cancelUpload };
};
