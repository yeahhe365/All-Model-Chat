
import { useState, useMemo, useCallback } from 'react';
import { UploadedFile, ChatMessage, VideoMetadata } from '../types';
import { MediaResolution } from '../types/settings';
import { useImageNavigation } from './ui/useImageNavigation';

interface UseMessageListUIProps {
    messages: ChatMessage[];
    onUpdateMessageFile: (messageId: string, fileId: string, updates: { videoMetadata?: VideoMetadata, mediaResolution?: MediaResolution }) => void;
}

export const useMessageListUI = ({ messages, onUpdateMessageFile }: UseMessageListUIProps) => {
    const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);
    const [isHtmlPreviewModalOpen, setIsHtmlPreviewModalOpen] = useState(false);
    const [htmlToPreview, setHtmlToPreview] = useState<string | null>(null);
    const [initialTrueFullscreenRequest, setInitialTrueFullscreenRequest] = useState(false);
    const [configuringFile, setConfiguringFile] = useState<{ file: UploadedFile, messageId: string } | null>(null);

    const handleFileClick = useCallback((file: UploadedFile) => {
        setPreviewFile(file);
    }, []);

    const closeFilePreviewModal = useCallback(() => {
        setPreviewFile(null);
    }, []);

    // Flatten all files from messages for navigation context
    const allFiles = useMemo(() => {
        return messages.flatMap(m => m.files || []);
    }, [messages]);

    // Use unified navigation hook
    const { 
        images: allImages, 
        currentIndex: currentImageIndex, 
        handlePrev: handlePrevImage, 
        handleNext: handleNextImage 
    } = useImageNavigation(allFiles, previewFile, setPreviewFile);

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
        closeFilePreviewModal,
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