import type { File as GeminiFile } from '@google/genai';
import type { UploadedFile } from '@/types';
import { getFileMetadataApi, uploadFileApi } from '@/services/api/fileApi';
import { getUploadLifecycleForGeminiState } from '@/hooks/file-upload/utils';
import { logService } from '@/services/logService';

const FILE_API_REFRESH_LEEWAY_MS = 5 * 60 * 1000;

type FileApiReferenceErrorKey =
  | 'messageSender_waitForFiles'
  | 'messageSender_fileReferenceExpiredNoBackup'
  | 'messageSender_fileReferenceRefreshFailed';

type FilePatch = Partial<UploadedFile>;

interface EnsureFilesApiReferencesParams {
  files: UploadedFile[];
  apiKey: string;
  abortSignal: AbortSignal;
  onFileUpdate?: (fileId: string, patch: FilePatch) => void;
}

type EnsureFilesApiReferencesResult =
  | { ok: true; files: UploadedFile[] }
  | {
      ok: false;
      files: UploadedFile[];
      errorKey: FileApiReferenceErrorKey;
      fileName?: string;
    };

const getFileApiExpirationTime = (file: GeminiFile): string | undefined => {
  const expirationTime = (file as { expirationTime?: unknown }).expirationTime;
  if (expirationTime instanceof Date) {
    return expirationTime.toISOString();
  }

  return typeof expirationTime === 'string' ? expirationTime : undefined;
};

const shouldRefreshFromKnownExpiration = (file: UploadedFile): boolean => {
  const expirationTime = (file as UploadedFile & { fileApiExpirationTime?: string }).fileApiExpirationTime;
  if (!expirationTime) {
    return false;
  }

  const expiresAt = Date.parse(expirationTime);
  return Number.isFinite(expiresAt) && expiresAt <= Date.now() + FILE_API_REFRESH_LEEWAY_MS;
};

const toUploadableFile = (file: UploadedFile): File | null => {
  if (file.rawFile instanceof File) {
    return file.rawFile;
  }

  if (file.rawFile instanceof Blob) {
    return new File([file.rawFile], file.name, { type: file.type || file.rawFile.type });
  }

  return null;
};

const applyFilePatch = (
  files: UploadedFile[],
  fileId: string,
  patch: FilePatch,
  onFileUpdate?: (fileId: string, patch: FilePatch) => void,
) => {
  onFileUpdate?.(fileId, patch);
  return files.map((file) => (file.id === fileId ? { ...file, ...patch } : file));
};

const buildActivePatchFromMetadata = (metadata: GeminiFile, fallbackFile: UploadedFile): FilePatch =>
  ({
    fileUri: metadata.uri ?? fallbackFile.fileUri,
    fileApiName: metadata.name ?? fallbackFile.fileApiName,
    uploadState: 'active',
    isProcessing: false,
    error: undefined,
    fileApiExpirationTime: getFileApiExpirationTime(metadata),
  }) as FilePatch;

export const ensureFilesApiReferences = async ({
  files,
  apiKey,
  abortSignal,
  onFileUpdate,
}: EnsureFilesApiReferencesParams): Promise<EnsureFilesApiReferencesResult> => {
  let nextFiles = files;

  for (const file of files) {
    if (!file.fileApiName) {
      continue;
    }

    const currentFile = nextFiles.find((candidate) => candidate.id === file.id) ?? file;
    const fileApiName = currentFile.fileApiName;
    if (!fileApiName) {
      continue;
    }
    let shouldRefresh = shouldRefreshFromKnownExpiration(currentFile);

    if (!shouldRefresh) {
      try {
        const metadata = await getFileMetadataApi(apiKey, fileApiName);

        if (metadata?.state === 'ACTIVE') {
          nextFiles = applyFilePatch(
            nextFiles,
            currentFile.id,
            buildActivePatchFromMetadata(metadata, currentFile),
            onFileUpdate,
          );
          continue;
        }

        if (metadata && metadata.state !== 'FAILED') {
          const lifecycle = getUploadLifecycleForGeminiState(metadata.state);
          nextFiles = applyFilePatch(
            nextFiles,
            currentFile.id,
            {
              ...lifecycle,
              fileUri: metadata.uri ?? currentFile.fileUri,
              fileApiName: metadata.name ?? currentFile.fileApiName,
              fileApiExpirationTime: getFileApiExpirationTime(metadata),
            } as FilePatch,
            onFileUpdate,
          );
          return {
            ok: false,
            files: nextFiles,
            errorKey: 'messageSender_waitForFiles',
            fileName: currentFile.name,
          };
        }

        shouldRefresh = true;
      } catch (error) {
        logService.warn('Could not verify Files API reference before send; attempting refresh from local backup.', {
          fileName: currentFile.name,
          fileApiName,
          error,
        });
        shouldRefresh = true;
      }
    }

    if (!shouldRefresh) {
      continue;
    }

    const uploadableFile = toUploadableFile(currentFile);
    if (!uploadableFile) {
      return {
        ok: false,
        files: nextFiles,
        errorKey: 'messageSender_fileReferenceExpiredNoBackup',
        fileName: currentFile.name,
      };
    }

    nextFiles = applyFilePatch(
      nextFiles,
      currentFile.id,
      { isProcessing: true, uploadState: 'uploading', error: undefined },
      onFileUpdate,
    );

    try {
      const uploadedFile = await uploadFileApi(
        apiKey,
        uploadableFile,
        currentFile.type || uploadableFile.type || 'application/octet-stream',
        currentFile.name,
        abortSignal,
      );
      const lifecycle = getUploadLifecycleForGeminiState(uploadedFile.state);
      const error = lifecycle.uploadState === 'failed' ? 'File API processing failed' : undefined;

      nextFiles = applyFilePatch(
        nextFiles,
        currentFile.id,
        {
          ...lifecycle,
          progress: 100,
          fileUri: uploadedFile.uri,
          fileApiName: uploadedFile.name,
          rawFile: currentFile.rawFile ?? uploadableFile,
          error,
          fileApiExpirationTime: getFileApiExpirationTime(uploadedFile),
        } as FilePatch,
        onFileUpdate,
      );

      if (lifecycle.uploadState !== 'active') {
        return {
          ok: false,
          files: nextFiles,
          errorKey: 'messageSender_waitForFiles',
          fileName: currentFile.name,
        };
      }
    } catch (error) {
      logService.error('Failed to refresh Files API reference before send.', {
        fileName: currentFile.name,
        fileApiName,
        error,
      });
      nextFiles = applyFilePatch(
        nextFiles,
        currentFile.id,
        {
          isProcessing: false,
          uploadState: 'failed',
          error: error instanceof Error ? error.message : String(error),
        },
        onFileUpdate,
      );
      return {
        ok: false,
        files: nextFiles,
        errorKey: 'messageSender_fileReferenceRefreshFailed',
        fileName: currentFile.name,
      };
    }
  }

  return { ok: true, files: nextFiles };
};
