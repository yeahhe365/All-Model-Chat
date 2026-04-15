
import { useState, useMemo, useCallback } from 'react';
import { UploadedFile, ChatMessage, VideoMetadata } from '../types';
import { MediaResolution } from '../types/settings';
import { useFilePreviewState } from './ui/useFilePreviewState';

interface UseMessageListUIProps {
    messages: ChatMessage[];
    onUpdateMessageFile: (messageId: string, fileId: string, updates: { videoMetadata?: VideoMetadata, mediaResolution?: MediaResolution }) => void;
}

export const useMessageListUI = ({ messages, onUpdateMessageFile }: UseMessageListUIProps) => {
    const [isHtmlPreviewModalOpen, setIsHtmlPreviewModalOpen] = useState(false);
    const [htmlToPreview, setHtmlToPreview] = useState<string | null>(null);
    const [initialTrueFullscreenRequest, setInitialTrueFullscreenRequest] = useState(false);
    const [configuringFile, setConfiguringFile] = useState<{ file: UploadedFile, messageId: string } | null>(null);

    const allFiles = useMemo(() => messages.flatMap((message) => message.files || []), [messages]);
    const {
        previewFile,
        setPreviewFile,
        closePreviewFile,
        allImages,
        currentImageIndex,
        handlePrevImage,
        handleNextImage,
    } = useFilePreviewState(allFiles);

    const handleFileClick = useCallback((file: UploadedFile) => {
        setPreviewFile(file);
    }, [setPreviewFile]);

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

    const handleConfigureFile = useCallback((file: UploadedFile, messageId: string) => {
        setConfiguringFile({ file, messageId });
    }, []);

    const handleSaveFileConfig = useCallback((fileId: string, updates: { videoMetadata?: VideoMetadata, mediaResolution?: MediaResolution }) => {
        if (configuringFile) {
            onUpdateMessageFile(configuringFile.messageId, fileId, updates);
        }
    }, [configuringFile, onUpdateMessageFile]);

    return {
        previewFile,
        setPreviewFile,
        isHtmlPreviewModalOpen,
        htmlToPreview,
        initialTrueFullscreenRequest,
        configuringFile,
        setConfiguringFile,
        handleFileClick,
        closeFilePreviewModal: closePreviewFile,
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
