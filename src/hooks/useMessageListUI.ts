import { useState, useMemo, useCallback } from 'react';
import { type UploadedFile, type ChatMessage, type VideoMetadata } from '@/types';
import { type MediaResolution } from '@/types/settings';
import { useFileModalState } from './ui/useFileModalState';

interface UseMessageListUIProps {
  messages: ChatMessage[];
  onUpdateMessageFile: (
    messageId: string,
    fileId: string,
    updates: { videoMetadata?: VideoMetadata; mediaResolution?: MediaResolution },
  ) => void;
}

export const useMessageListUI = ({ messages, onUpdateMessageFile }: UseMessageListUIProps) => {
  const [isHtmlPreviewModalOpen, setIsHtmlPreviewModalOpen] = useState(false);
  const [htmlToPreview, setHtmlToPreview] = useState<string | null>(null);
  const [initialTrueFullscreenRequest, setInitialTrueFullscreenRequest] = useState(false);

  const allFiles = useMemo(() => messages.flatMap((message) => message.files || []), [messages]);
  const {
    previewFile,
    closePreview,
    allImages,
    currentImageIndex,
    handlePrevImage,
    handleNextImage,
    configuringFile,
    setConfiguringFile,
    openPreview,
    openConfiguration,
  } = useFileModalState<{ file: UploadedFile; messageId: string }>(allFiles);

  const handleFileClick = useCallback(
    (file: UploadedFile) => {
      openPreview(file);
    },
    [openPreview],
  );

  const handleOpenHtmlPreview = useCallback((htmlContent: string, options?: { initialTrueFullscreen?: boolean }) => {
    setHtmlToPreview(htmlContent);
    setInitialTrueFullscreenRequest(options?.initialTrueFullscreen ?? false);
    setIsHtmlPreviewModalOpen(true);
  }, []);

  const handleCloseHtmlPreview = useCallback(() => {
    setIsHtmlPreviewModalOpen(false);
    setHtmlToPreview(null);
    setInitialTrueFullscreenRequest(false);
  }, []);

  const handleConfigureFile = useCallback(
    (file: UploadedFile, messageId: string) => {
      openConfiguration({ file, messageId });
    },
    [openConfiguration],
  );

  const handleSaveFileConfig = useCallback(
    (fileId: string, updates: { videoMetadata?: VideoMetadata; mediaResolution?: MediaResolution }) => {
      if (configuringFile) {
        onUpdateMessageFile(configuringFile.messageId, fileId, updates);
      }
    },
    [configuringFile, onUpdateMessageFile],
  );

  return {
    previewFile,
    isHtmlPreviewModalOpen,
    htmlToPreview,
    initialTrueFullscreenRequest,
    configuringFile,
    setConfiguringFile,
    handleFileClick,
    closeFilePreviewModal: closePreview,
    allImages,
    currentImageIndex,
    handlePrevImage,
    handleNextImage,
    handleOpenHtmlPreview,
    handleCloseHtmlPreview,
    handleConfigureFile,
    handleSaveFileConfig,
  };
};
