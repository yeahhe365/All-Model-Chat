import { useCallback, useState } from 'react';
import type { UploadedFile } from '@/types';
import { useFilePreviewState } from './useFilePreviewState';

interface PreviewOptions {
  editable?: boolean;
}

export const useFileModalState = <TConfig>(files: UploadedFile[]) => {
  const [configuringFile, setConfiguringFile] = useState<TConfig | null>(null);
  const [isPreviewEditable, setIsPreviewEditable] = useState(false);
  const {
    previewFile,
    closePreviewFile,
    allImages,
    currentImageIndex,
    handlePrevImage,
    handleNextImage,
    setPreviewFile,
  } = useFilePreviewState(files);

  const openPreview = useCallback(
    (file: UploadedFile, options: PreviewOptions = {}) => {
      setPreviewFile(file);
      setIsPreviewEditable(options.editable ?? false);
    },
    [setPreviewFile],
  );

  const closePreview = useCallback(() => {
    closePreviewFile();
    setIsPreviewEditable(false);
  }, [closePreviewFile]);

  const openConfiguration = useCallback((nextConfig: TConfig) => {
    setConfiguringFile(nextConfig);
  }, []);

  const closeConfiguration = useCallback(() => {
    setConfiguringFile(null);
  }, []);

  return {
    previewFile,
    closePreview,
    allImages,
    currentImageIndex,
    handlePrevImage,
    handleNextImage,
    configuringFile,
    setConfiguringFile,
    closeConfiguration,
    openPreview,
    openConfiguration,
    isPreviewEditable,
  };
};
