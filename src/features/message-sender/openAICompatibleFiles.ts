import type { UploadedFile } from '@/types';
import { isAudioMimeType, isImageMimeType, isTextFile } from '@/utils/fileTypeUtils';
import { usesRemoteFileReference } from '@/utils/chat/fileTransferStrategy';

type OpenAICompatibleFilesResult =
  | { ok: true; files: UploadedFile[] }
  | {
      ok: false;
      files: UploadedFile[];
      errorKey: 'messageSender_openAICompatibleFileReferenceUnsupported';
      fileName: string;
    };

const canSendInlineToOpenAICompatibleApi = (file: UploadedFile): boolean =>
  isImageMimeType(file.type) || isAudioMimeType(file.type) || isTextFile(file);

const hasLocalFileBackup = (file: UploadedFile): boolean => typeof Blob !== 'undefined' && file.rawFile instanceof Blob;

export const prepareFilesForOpenAICompatibleMode = (files: UploadedFile[]): OpenAICompatibleFilesResult => {
  const preparedFiles: UploadedFile[] = [];

  for (const file of files) {
    if (!usesRemoteFileReference(file) || !file.fileUri) {
      preparedFiles.push(file);
      continue;
    }

    if (!hasLocalFileBackup(file) || !canSendInlineToOpenAICompatibleApi(file)) {
      return {
        ok: false,
        files,
        errorKey: 'messageSender_openAICompatibleFileReferenceUnsupported',
        fileName: file.name,
      };
    }

    preparedFiles.push({
      ...file,
      fileUri: undefined,
      fileApiName: undefined,
      fileApiExpirationTime: undefined,
      transferStrategy: 'inline',
    });
  }

  return { ok: true, files: preparedFiles };
};
