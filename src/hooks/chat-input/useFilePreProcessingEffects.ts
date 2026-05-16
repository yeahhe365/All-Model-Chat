import { logService } from '@/services/logService';
import { useCallback, useRef, useState, type MutableRefObject, type RefObject } from 'react';
import type { UploadedFile } from '@/types';
import { generateUniqueId } from '@/utils/chat/ids';
import { readDirectoryHandle } from '@/utils/import-context/directoryHandleReader';
import { captureScreenImage } from '@/utils/mediaUtils';
import { useI18n } from '@/contexts/I18nContext';
import { createProcessingPlaceholderFile } from '@/hooks/file-upload/utils';

type SetSelectedFiles = (files: UploadedFile[] | ((prevFiles: UploadedFile[]) => UploadedFile[])) => void;

interface UseFilePreProcessingEffectsParams {
  fileInputRef: RefObject<HTMLInputElement>;
  imageInputRef: RefObject<HTMLInputElement>;
  folderInputRef: RefObject<HTMLInputElement>;
  zipInputRef: RefObject<HTMLInputElement>;
  justInitiatedFileOpRef: MutableRefObject<boolean>;
  onProcessFiles: (files: FileList | File[]) => Promise<void>;
  setSelectedFiles: SetSelectedFiles;
  setAppFileError: (error: string | null) => void;
}

export const useFilePreProcessingEffects = ({
  fileInputRef,
  imageInputRef,
  folderInputRef,
  zipInputRef,
  justInitiatedFileOpRef,
  onProcessFiles,
  setSelectedFiles,
  setAppFileError,
}: UseFilePreProcessingEffectsParams) => {
  const { t } = useI18n();
  const [isConverting, setIsConverting] = useState(false);
  const [isScreenCapturing, setIsScreenCapturing] = useState(false);
  const isScreenCapturingRef = useRef(false);

  const handleScreenshot = useCallback(async () => {
    if (isScreenCapturingRef.current) {
      return;
    }

    isScreenCapturingRef.current = true;
    setIsScreenCapturing(true);
    try {
      const blob = await captureScreenImage({
        unsupported: t('screenCapture_unsupported'),
        startFailed: (message) => t('screenCapture_start_failed').replace('{message}', message),
      });

      if (!blob) {
        return;
      }

      const fileName = `screenshot-${new Date().toISOString().slice(0, 19).replace(/[:]/g, '-')}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });
      justInitiatedFileOpRef.current = true;
      await onProcessFiles([file]);
    } catch (error) {
      logService.error('Failed to capture screenshot:', error);
      setAppFileError(t('screenshot_capture_failed'));
    } finally {
      isScreenCapturingRef.current = false;
      setIsScreenCapturing(false);
    }
  }, [justInitiatedFileOpRef, onProcessFiles, setAppFileError, t]);

  const processFolderImport = useCallback(
    async (files: File[] | FileList, emptyDirectoryPaths: string[] = []) => {
      const fileCount = Array.isArray(files) ? files.length : files.length;
      if (fileCount === 0 && emptyDirectoryPaths.length === 0) {
        return;
      }

      const tempId = generateUniqueId();

      setIsConverting(true);
      setSelectedFiles((prev) => [
        ...prev,
        createProcessingPlaceholderFile({
          id: tempId,
          name: t('folder_processing'),
          type: 'application/x-directory',
          size: 0,
        }),
      ]);

      try {
        justInitiatedFileOpRef.current = true;
        const { generateFolderContext } = await import('@/utils/folderImportUtils');
        const contextFile = await generateFolderContext(files, {
          emptyDirectoryPaths,
        });
        setSelectedFiles((prev) => prev.filter((file) => file.id !== tempId));
        await onProcessFiles([contextFile]);
      } catch (error) {
        logService.error('Failed to process folder import.', error);
        setAppFileError(t('folder_process_failed'));
        setSelectedFiles((prev) => prev.filter((file) => file.id !== tempId));
      } finally {
        setIsConverting(false);
      }
    },
    [justInitiatedFileOpRef, onProcessFiles, setAppFileError, setSelectedFiles, t],
  );

  const handleOpenFolderPicker = useCallback(async () => {
    if (!window.showDirectoryPicker) {
      return;
    }

    try {
      const directoryHandle = await window.showDirectoryPicker({ mode: 'read' });
      const dropped = await readDirectoryHandle(directoryHandle);
      await processFolderImport(dropped.files, dropped.emptyDirectoryPaths);
    } catch (error) {
      const errorName = error instanceof DOMException ? error.name : '';
      if (errorName !== 'AbortError' && errorName !== 'NotAllowedError') {
        logService.error('Failed to read folder picker selection.', error);
        setAppFileError(t('folder_process_failed'));
      }
    }
  }, [processFolderImport, setAppFileError, t]);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files?.length) {
        justInitiatedFileOpRef.current = true;
        await onProcessFiles(event.target.files);
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    },
    [fileInputRef, imageInputRef, justInitiatedFileOpRef, onProcessFiles],
  );

  const handleFolderChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files?.length) {
        await processFolderImport(event.target.files);
      }

      if (folderInputRef.current) {
        folderInputRef.current.value = '';
      }
    },
    [folderInputRef, processFolderImport],
  );

  const handleZipChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files?.length) {
        justInitiatedFileOpRef.current = true;
        await onProcessFiles(event.target.files);
      }

      if (zipInputRef.current) {
        zipInputRef.current.value = '';
      }
    },
    [justInitiatedFileOpRef, onProcessFiles, zipInputRef],
  );

  return {
    isConverting,
    isScreenCapturing,
    setIsConverting,
    handleScreenshot,
    handleOpenFolderPicker,
    handleFileChange,
    handleFolderChange,
    handleZipChange,
  };
};
