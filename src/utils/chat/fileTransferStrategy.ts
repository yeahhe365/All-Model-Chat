import type { UploadedFile, FileTransferStrategy } from '@/types';

type FileTransferStrategyInput = Pick<UploadedFile, 'fileApiName' | 'fileUri' | 'rawFile' | 'transferStrategy'>;

export const resolveFileTransferStrategy = (file: FileTransferStrategyInput): FileTransferStrategy => {
  if (file.transferStrategy) {
    return file.transferStrategy;
  }

  if (file.fileApiName || file.fileUri) {
    return file.rawFile ? 'files-api' : 'remote-file-id';
  }

  return 'inline';
};

export const usesRemoteFileReference = (file: FileTransferStrategyInput): boolean => {
  const strategy = resolveFileTransferStrategy(file);
  return strategy === 'files-api' || strategy === 'remote-file-id';
};
