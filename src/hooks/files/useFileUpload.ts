import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { type AppSettings, type ChatSettings as IndividualChatSettings, type UploadedFile } from '@/types';
import { logService } from '@/services/logService';
import { useFilePreProcessing } from '@/hooks/file-upload/useFilePreProcessing';
import { useFileUploader } from '@/hooks/file-upload/useFileUploader';
import { useFileIdAdder } from '@/hooks/file-upload/useFileIdAdder';
import { useChatStore } from '@/stores/chatStore';

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
    selectedFiles,
    setSelectedFiles,
    setAppFileError,
    currentChatSettings,
    setCurrentChatSettings,
  });

  const { addFileById } = useFileIdAdder({
    appSettings,
    setSelectedFiles,
    setAppFileError,
    currentChatSettings,
    setCurrentChatSettings,
    selectedFiles,
  });

  const handleProcessAndAddFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!files || files.length === 0) return;
      setAppFileError(null);
      logService.info(`Processing ${files.length} files.`);
      const operationSessionId = useChatStore.getState().activeSessionId;
      const operationGeneration = useChatStore.getState().getFileOperationGeneration();
      const isStillCurrentSession = () => {
        const chatStore = useChatStore.getState();
        return (
          chatStore.activeSessionId === operationSessionId &&
          chatStore.getFileOperationGeneration() === operationGeneration
        );
      };
      const setSelectedFilesForCurrentSession: Dispatch<SetStateAction<UploadedFile[]>> = (updater) => {
        if (!isStillCurrentSession()) {
          return;
        }

        setSelectedFiles(updater);
      };

      // 1. Pre-process files (ZIP extraction, Audio compression, etc.)
      const processedFiles = await processFiles(files, {
        setSelectedFiles: setSelectedFilesForCurrentSession,
      });

      if (!isStillCurrentSession()) {
        return;
      }

      // 2. Hand off to uploader (Inline vs API strategy)
      await uploadFiles(processedFiles, {
        setSelectedFiles: setSelectedFilesForCurrentSession,
      });
    },
    [processFiles, uploadFiles, setAppFileError, setSelectedFiles],
  );

  return {
    handleProcessAndAddFiles,
    handleCancelFileUpload: cancelUpload,
    handleAddFileById: addFileById,
  };
};
