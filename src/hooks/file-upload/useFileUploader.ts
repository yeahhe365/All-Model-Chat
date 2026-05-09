import { useCallback, Dispatch, SetStateAction, useRef } from 'react';
import { AppSettings, ChatSettings as IndividualChatSettings, UploadedFile, MediaResolution } from '../../types';
import { logService } from '../../services/logService';
import { releaseManagedObjectUrl } from '../../services/objectUrlManager';
import { getApiKeyErrorTranslationKey, getKeyForRequest } from '../../utils/apiUtils';
import { buildFileUploadPreflight, checkBatchNeedsApiKey, getFilesRequiringFileApi } from './utils';
import { uploadFileItem } from './uploadFileItem';
import { runWithConcurrencyLimit } from './uploadQueue';
import { useI18n } from '../../contexts/I18nContext';

const MAX_CONCURRENT_FILE_UPLOADS = 3;

interface UseFileUploaderProps {
  appSettings: AppSettings;
  selectedFiles: UploadedFile[];
  setSelectedFiles: Dispatch<SetStateAction<UploadedFile[]>>;
  setAppFileError: Dispatch<SetStateAction<string | null>>;
  currentChatSettings: IndividualChatSettings;
  setCurrentChatSettings: (updater: (prevSettings: IndividualChatSettings) => IndividualChatSettings) => void;
}

export const useFileUploader = ({
  appSettings,
  selectedFiles,
  setSelectedFiles,
  setAppFileError,
  currentChatSettings,
  setCurrentChatSettings,
}: UseFileUploaderProps) => {
  const { t } = useI18n();
  // Refs to track upload speed for each file ID
  const uploadStatsRef = useRef<Map<string, { lastLoaded: number; lastTime: number }>>(new Map());

  const uploadFiles = useCallback(
    async (filesArray: File[], options: { setSelectedFiles?: Dispatch<SetStateAction<UploadedFile[]>> } = {}) => {
      if (filesArray.length === 0) return;
      const writeSelectedFiles = options.setSelectedFiles ?? setSelectedFiles;

      const preflight = buildFileUploadPreflight(filesArray, appSettings, selectedFiles, t);
      if (preflight.notice) {
        setAppFileError(preflight.notice);
      }

      if (preflight.filesToUpload.length === 0) {
        return;
      }

      // Calculate if ANY file requires API upload to handle key rotation logic first
      const needsApiKeyForUpload = checkBatchNeedsApiKey(preflight.filesToUpload, appSettings);
      const filesRequiringApi = getFilesRequiringFileApi(preflight.filesToUpload, appSettings);

      let keyToUse: string | null = null;
      if (needsApiKeyForUpload) {
        const keyResult = getKeyForRequest(appSettings, currentChatSettings);
        if ('error' in keyResult) {
          const translationKey = getApiKeyErrorTranslationKey(keyResult.error);
          setAppFileError(translationKey ? t(translationKey) : keyResult.error);
          logService.error('Cannot process files: API key not configured.');
          return;
        }
        keyToUse = keyResult.key;
        if (keyResult.isNewKey) {
          logService.info('New API key selected for this session due to file upload.');
          setCurrentChatSettings((prev) => ({ ...prev, lockedApiKey: keyToUse! }));
        }
      }

      // Determine default resolution for new files
      const defaultResolution =
        currentChatSettings.mediaResolution !== MediaResolution.MEDIA_RESOLUTION_UNSPECIFIED
          ? currentChatSettings.mediaResolution
          : undefined;

      const uploadTasks = preflight.filesToUpload.map(
        (file) => () =>
          uploadFileItem({
            file,
            keyToUse,
            forceFileApi: filesRequiringApi.has(file),
            defaultResolution,
            appSettings,
            setSelectedFiles: writeSelectedFiles,
            uploadStatsRef,
            t,
          }),
      );

      await runWithConcurrencyLimit(uploadTasks, MAX_CONCURRENT_FILE_UPLOADS);
    },
    [appSettings, currentChatSettings, selectedFiles, setCurrentChatSettings, setAppFileError, setSelectedFiles, t],
  );

  const cancelUpload = useCallback(
    (fileIdToCancel: string) => {
      logService.warn(`User cancelled file upload: ${fileIdToCancel}`);

      setSelectedFiles((prevFiles) =>
        prevFiles.map((file) => {
          if (file.id === fileIdToCancel) {
            // 1. Abort the actual network request
            if (file.abortController) {
              file.abortController.abort();
            }

            // 2. Fix Memory Leak: Revoke the local Blob URL to free up browser memory
            releaseManagedObjectUrl(file.dataUrl);

            // 3. Update state to reflect cancellation and clear heavy object references
            return {
              ...file,
              isProcessing: false,
              error: t('upload_cancelled'),
              uploadState: 'cancelled',
              uploadSpeed: undefined,
              dataUrl: undefined, // Clear URL so UI gracefully falls back to a file type icon
              rawFile: undefined, // Clear the actual File/Blob reference from memory
            };
          }
          return file;
        }),
      );

      // Clean up speed calculation stats
      uploadStatsRef.current.delete(fileIdToCancel);
    },
    [setSelectedFiles, t],
  );

  return { uploadFiles, cancelUpload };
};
