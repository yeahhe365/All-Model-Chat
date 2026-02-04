
import { useCallback, Dispatch, SetStateAction } from 'react';
import { AppSettings, ChatSettings as IndividualChatSettings, UploadedFile } from '../../types';
import { logService } from '../../services/logService';
import { useFilePreProcessing } from '../file-upload/useFilePreProcessing';
import { useFileUploader } from '../file-upload/useFileUploader';
import { useFileIdAdder } from '../file-upload/useFileIdAdder';

interface UseFileUploadProps {
    appSettings: AppSettings;
    selectedFiles: UploadedFile[];
    setSelectedFiles: Dispatch<SetStateAction<UploadedFile[]>>;
    setAppFileError: Dispatch<SetStateAction<string | null>>;
    currentChatSettings: IndividualChatSettings;
    setCurrentChatSettings: (updater: (prevSettings: IndividualChatSettings) => IndividualChatSettings) => void;
}

export const useFileUpload = ({
    appSettings,
    selectedFiles,
    setSelectedFiles,
    setAppFileError,
    currentChatSettings,
    setCurrentChatSettings,
}: UseFileUploadProps) => {

    const { processFiles } = useFilePreProcessing({ appSettings, setSelectedFiles });
    
    const { uploadFiles, cancelUpload } = useFileUploader({ 
        appSettings, 
        setSelectedFiles, 
        setAppFileError, 
        currentChatSettings, 
        setCurrentChatSettings 
    });

    const { addFileById } = useFileIdAdder({
        appSettings,
        setSelectedFiles,
        setAppFileError,
        currentChatSettings,
        setCurrentChatSettings,
        selectedFiles
    });

    const handleProcessAndAddFiles = useCallback(async (files: FileList | File[]) => {
        if (!files || files.length === 0) return;
        setAppFileError(null);
        logService.info(`Processing ${files.length} files.`);

        // 1. Pre-process files (ZIP extraction, Audio compression, etc.)
        const processedFiles = await processFiles(files);

        // 2. Hand off to uploader (Inline vs API strategy)
        await uploadFiles(processedFiles);
    }, [processFiles, uploadFiles, setAppFileError]);

    return {
        handleProcessAndAddFiles,
        handleCancelFileUpload: cancelUpload,
        handleAddFileById: addFileById,
    };
};
