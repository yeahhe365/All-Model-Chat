import { useCallback, Dispatch, SetStateAction } from 'react';
import { AppSettings, ChatSettings as IndividualChatSettings, UploadedFile, MediaResolution } from '../../types';
import { ALL_SUPPORTED_MIME_TYPES } from '../../constants/fileConstants';
import { logService } from '../../services/logService';
import { getApiKeyErrorTranslationKey, getGeminiKeyForRequest } from '../../utils/apiUtils';
import { generateUniqueId } from '../../utils/chat/ids';
import { getFileMetadataApi } from '../../services/api/fileApi';
import { getUploadLifecycleForGeminiState } from './utils';
import { useI18n } from '../../contexts/I18nContext';
import { isVideoMimeType } from '../../utils/fileTypeUtils';
import { isOpenAICompatibleApiActive } from '../../utils/openaiCompatibleMode';

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
  selectedFiles,
}: UseFileIdAdderProps) => {
  const { t } = useI18n();

  const translateApiKeyError = useCallback(
    (error: string) => {
      const translationKey = getApiKeyErrorTranslationKey(error);
      return translationKey ? t(translationKey) : error;
    },
    [t],
  );

  const addFileById = useCallback(
    async (fileApiId: string) => {
      logService.info(`Attempting to add file by ID: ${fileApiId}`);
      setAppFileError(null);
      if (!fileApiId || !fileApiId.startsWith('files/')) {
        logService.error('Invalid File ID format.', { fileApiId });
        setAppFileError(t('fileIdAdder_invalidFileId'));
        return;
      }
      if (selectedFiles.some((f) => f.fileApiName === fileApiId)) {
        logService.warn(`File with ID ${fileApiId} is already added.`);
        setAppFileError(t('fileIdAdder_duplicateFile').replace('{id}', fileApiId));
        return;
      }

      // Adding file by ID is an explicit user action, we rotate key to be safe/fair
      const keyResult = getGeminiKeyForRequest(appSettings, currentChatSettings);
      if ('error' in keyResult) {
        logService.error('Cannot add file by ID: API key not configured.');
        setAppFileError(translateApiKeyError(keyResult.error));
        return;
      }
      const { key: keyToUse, isNewKey } = keyResult;

      if (isNewKey && !isOpenAICompatibleApiActive(appSettings)) {
        logService.info('New API key selected for this session due to adding file by ID.');
        setCurrentChatSettings((prev) => ({ ...prev, lockedApiKey: keyToUse }));
      }

      const tempId = generateUniqueId();
      const defaultResolution =
        currentChatSettings.mediaResolution !== MediaResolution.MEDIA_RESOLUTION_UNSPECIFIED
          ? currentChatSettings.mediaResolution
          : undefined;

      setSelectedFiles((prev) => [
        ...prev,
        {
          id: tempId,
          name: t('fileIdAdder_loadingFile').replace('{id}', fileApiId),
          type: 'application/octet-stream',
          size: 0,
          isProcessing: true,
          progress: 50,
          uploadState: 'processing_api',
          fileApiName: fileApiId,
          mediaResolution: defaultResolution,
        },
      ]);

      try {
        const fileMetadata = await getFileMetadataApi(keyToUse, fileApiId);
        if (fileMetadata) {
          logService.info(`Successfully fetched metadata for file ID ${fileApiId}`, { metadata: fileMetadata });
          const mimeType = fileMetadata.mimeType ?? 'application/octet-stream';

          // Allow known video types or generic octet-stream (often used for arbitrary files)
          // But strictly validate if it is a supported type if it's not generic
          const isValidType = ALL_SUPPORTED_MIME_TYPES.includes(mimeType) || isVideoMimeType(mimeType);

          if (!isValidType) {
            logService.warn(`Unsupported file type for file ID ${fileApiId}`, { type: mimeType });
            setSelectedFiles((prev) =>
              prev.map((f) =>
                f.id === tempId
                  ? {
                      ...f,
                      name: fileMetadata.displayName || fileApiId,
                      type: mimeType,
                      size: Number(fileMetadata.sizeBytes) || 0,
                      isProcessing: false,
                      error: t('fileIdAdder_unsupportedType').replace('{type}', mimeType),
                      uploadState: 'failed',
                    }
                  : f,
              ),
            );
            return;
          }
          const { uploadState, isProcessing } = getUploadLifecycleForGeminiState(fileMetadata.state);
          const newFile: UploadedFile = {
            id: tempId,
            name: fileMetadata.displayName || fileApiId,
            type: mimeType,
            size: Number(fileMetadata.sizeBytes) || 0,
            fileUri: fileMetadata.uri,
            fileApiName: fileMetadata.name || fileApiId,
            isProcessing,
            progress: 100,
            uploadState,
            error: uploadState === 'failed' ? t('fileIdAdder_processingFailed') : undefined,
            mediaResolution: defaultResolution,
          };
          setSelectedFiles((prev) => prev.map((f) => (f.id === tempId ? newFile : f)));
        } else {
          logService.error(`File with ID ${fileApiId} not found or inaccessible.`);
          setAppFileError(t('fileIdAdder_notFound').replace('{id}', fileApiId));
          setSelectedFiles((prev) =>
            prev.map((f) =>
              f.id === tempId
                ? {
                    ...f,
                    name: t('fileIdAdder_notFoundLabel').replace('{id}', fileApiId),
                    isProcessing: false,
                    error: t('fileIdAdder_notFoundShort'),
                    uploadState: 'failed',
                  }
                : f,
            ),
          );
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'SilentError') {
          logService.error('Cannot add file by ID: API key not configured.');
          const translatedApiError = t('apiRuntime_keyNotConfigured');
          setAppFileError(translatedApiError);
          setSelectedFiles((prev) =>
            prev.map((f) =>
              f.id === tempId
                ? {
                    ...f,
                    name: t('fileIdAdder_configErrorLabel').replace('{id}', fileApiId),
                    isProcessing: false,
                    error: translatedApiError,
                    uploadState: 'failed',
                  }
                : f,
            ),
          );
          return;
        }
        logService.error(`Error fetching file metadata for ID ${fileApiId}`, { error });
        setAppFileError(
          t('fileIdAdder_fetchError').replace('{message}', error instanceof Error ? error.message : String(error)),
        );
        setSelectedFiles((prev) =>
          prev.map((f) =>
            f.id === tempId
              ? {
                  ...f,
                  name: t('fileIdAdder_fetchErrorLabel').replace('{id}', fileApiId),
                  isProcessing: false,
                  error: t('fileIdAdder_fetchErrorShort'),
                  uploadState: 'failed',
                }
              : f,
          ),
        );
      }
    },
    [
      appSettings,
      currentChatSettings,
      selectedFiles,
      setAppFileError,
      setCurrentChatSettings,
      setSelectedFiles,
      t,
      translateApiKeyError,
    ],
  );

  return { addFileById };
};
