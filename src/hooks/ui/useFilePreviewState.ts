import { useCallback, useMemo, useState } from 'react';
import type { UploadedFile } from '../../types';
import { useImageNavigation } from './useImageNavigation';

export const useFilePreviewState = (files: UploadedFile[]) => {
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);

  const allFiles = useMemo(() => files, [files]);

  const {
    images: allImages,
    currentIndex: currentImageIndex,
    handlePrev: handlePrevImage,
    handleNext: handleNextImage,
  } = useImageNavigation(allFiles, previewFile, setPreviewFile);

  const closePreviewFile = useCallback(() => {
    setPreviewFile(null);
  }, []);

  return {
    previewFile,
    setPreviewFile,
    closePreviewFile,
    allImages,
    currentImageIndex,
    handlePrevImage,
    handleNextImage,
  };
};
