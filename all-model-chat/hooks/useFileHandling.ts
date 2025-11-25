
import { Dispatch, SetStateAction, useEffect } from 'react';
import { AppSettings, ChatSettings as IndividualChatSettings, UploadedFile } from '../types';
import { useFilePolling } from './useFilePolling';
import { useFileUpload } from './useFileUpload';

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

export const useFileHandling = (props: FileHandlingProps) => {
    const { selectedFiles, setIsAppProcessingFile } = props;

    useFilePolling({
        appSettings: props.appSettings,
        selectedFiles: props.selectedFiles,
        setSelectedFiles: props.setSelectedFiles,
        currentChatSettings: props.currentChatSettings,
    });

    const { handleProcessAndAddFiles, handleCancelFileUpload, handleAddFileById } = useFileUpload({
        appSettings: props.appSettings,
        selectedFiles: props.selectedFiles,
        setSelectedFiles: props.setSelectedFiles,
        setAppFileError: props.setAppFileError,
        currentChatSettings: props.currentChatSettings,
        setCurrentChatSettings: props.setCurrentChatSettings,
    });

    useEffect(() => {
        const anyFileProcessing = selectedFiles.some(file => file.isProcessing);
        setIsAppProcessingFile(anyFileProcessing);
    }, [selectedFiles, setIsAppProcessingFile]);

    return {
        handleProcessAndAddFiles,
        handleCancelFileUpload,
        handleAddFileById,
    };
};
