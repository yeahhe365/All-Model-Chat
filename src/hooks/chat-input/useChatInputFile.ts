import { useCallback, type RefObject } from 'react';
import type { UploadedFile, VideoMetadata } from '../../types';
import type { MediaResolution } from '../../types/settings';
import { cleanupFilePreviewUrl } from '../../utils/fileHelpers';
import { useFilePreProcessingEffects } from './useFilePreProcessingEffects';
import { useChatInputFileUi } from './useChatInputFileUi';
import type { useChatInputState } from './useChatInputState';

type ChatInputState = ReturnType<typeof useChatInputState>;
type SetSelectedFiles = (files: UploadedFile[] | ((prevFiles: UploadedFile[]) => UploadedFile[])) => void;

interface ChatInputFileRefs {
  fileInputRef: RefObject<HTMLInputElement>;
  imageInputRef: RefObject<HTMLInputElement>;
  folderInputRef: RefObject<HTMLInputElement>;
  zipInputRef: RefObject<HTMLInputElement>;
  cameraInputRef: RefObject<HTMLInputElement>;
}

interface UseChatInputFileParams {
  inputState: ChatInputState;
  selectedFiles: UploadedFile[];
  setSelectedFiles: SetSelectedFiles;
  setAppFileError: (error: string | null) => void;
  onProcessFiles: (files: FileList | File[]) => Promise<void>;
  onAddFileById: (fileId: string) => Promise<void>;
  isLoading: boolean;
  fileRefs: ChatInputFileRefs;
  justInitiatedFileOpRef: ChatInputState['justInitiatedFileOpRef'];
}

export const useChatInputFile = ({
  inputState,
  selectedFiles,
  setSelectedFiles,
  setAppFileError,
  onProcessFiles,
  onAddFileById,
  isLoading,
  fileRefs,
  justInitiatedFileOpRef,
}: UseChatInputFileParams) => {
  const { fileInputRef, imageInputRef, folderInputRef, zipInputRef, cameraInputRef } = fileRefs;

  const filePreProcessing = useFilePreProcessingEffects({
    fileInputRef,
    imageInputRef,
    folderInputRef,
    zipInputRef,
    justInitiatedFileOpRef,
    onProcessFiles,
    setSelectedFiles,
    setAppFileError,
  });

  const { modalsState, localFileState } = useChatInputFileUi({
    selectedFiles,
    setSelectedFiles,
    setInputText: inputState.setInputText,
    setAppFileError,
    onProcessFiles,
    onOpenFolderPicker: filePreProcessing.handleOpenFolderPicker,
    onScreenshot: filePreProcessing.handleScreenshot,
    fileInputRef,
    imageInputRef,
    folderInputRef,
    zipInputRef,
    cameraInputRef,
    justInitiatedFileOpRef,
    textareaRef: inputState.textareaRef,
    isConverting: filePreProcessing.isConverting,
    setIsConverting: filePreProcessing.setIsConverting,
  });

  const removeSelectedFile = useCallback(
    (fileIdToRemove: string) => {
      setSelectedFiles((prev) => {
        const fileToRemove = prev.find((file) => file.id === fileIdToRemove);
        cleanupFilePreviewUrl(fileToRemove);
        return prev.filter((file) => file.id !== fileIdToRemove);
      });
    },
    [setSelectedFiles],
  );

  const handleAddFileByIdSubmit = useCallback(async () => {
    if (!inputState.fileIdInput.trim() || inputState.isAddingById || isLoading) {
      return;
    }

    inputState.setAddingById(true);
    justInitiatedFileOpRef.current = true;
    await onAddFileById(inputState.fileIdInput.trim());
    inputState.setAddingById(false);
    inputState.setFileIdInput('');
  }, [inputState, isLoading, justInitiatedFileOpRef, onAddFileById]);

  const handleSaveFileConfig = useCallback(
    (
      fileId: string,
      updates: {
        videoMetadata?: VideoMetadata;
        mediaResolution?: MediaResolution;
      },
    ) => {
      setSelectedFiles((prev) => prev.map((file) => (file.id === fileId ? { ...file, ...updates } : file)));
    },
    [setSelectedFiles],
  );

  return {
    filePreProcessing,
    modalsState,
    localFileState,
    removeSelectedFile,
    handleAddFileByIdSubmit,
    handleSaveFileConfig,
  };
};
