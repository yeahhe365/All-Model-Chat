
import { useState, useMemo, useCallback } from 'react';
import { UploadedFile, ChatMessage, VideoMetadata } from '../types';
import { SUPPORTED_IMAGE_MIME_TYPES } from '../constants/fileConstants';
import { MediaResolution } from '../types/settings';

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

    // Virtualization state
    const [visibleMessages, setVisibleMessages] = useState<Set<string>>(() => {
        const initialVisible = new Set<string>();
        const lastN = 15;
        for (let i = Math.max(0, messages.length - lastN); i < messages.length; i++) {
            initialVisible.add(messages[i].id);
        }
        return initialVisible;
    });

    const handleBecameVisible = useCallback((messageId: string) => {
        setVisibleMessages(prev => {
            if (prev.has(messageId)) return prev;
            const newSet = new Set(prev);
            newSet.add(messageId);
            return newSet;
        });
    }, []);

    const handleFileClick = useCallback((file: UploadedFile) => {
        setPreviewFile(file);
    }, []);

    const closeFilePreviewModal = useCallback(() => {
        setPreviewFile(null);
    }, []);

    const allImages = useMemo(() => {
        if (!previewFile) return [];
        return messages.flatMap(m => m.files || []).filter(f => 
            (SUPPORTED_IMAGE_MIME_TYPES.includes(f.type) || f.type === 'image/svg+xml') && !f.error
        );
    }, [messages, previewFile]);

    const currentImageIndex = useMemo(() => {
        if (!previewFile) return -1;
        return allImages.findIndex(f => f.id === previewFile.id);
    }, [allImages, previewFile]);

    const handlePrevImage = useCallback(() => {
        if (currentImageIndex > 0) {
            setPreviewFile(allImages[currentImageIndex - 1]);
        }
    }, [currentImageIndex, allImages]);

    const handleNextImage = useCallback(() => {
        if (currentImageIndex < allImages.length - 1) {
            setPreviewFile(allImages[currentImageIndex + 1]);
        }
    }, [currentImageIndex, allImages]);

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

    const estimateMessageHeight = useCallback((message: ChatMessage, showThoughts: boolean) => {
        if (!message) return 150;
        let height = 80;
        if (message.content) {
            const lines = message.content.length / 80;
            height += lines * 24;
        }
        if (message.files && message.files.length > 0) {
            height += message.files.length * 120;
        }
        if (message.thoughts && showThoughts) {
            height += 100;
        }
        return Math.min(height, 1200);
    }, []);

    return {
        previewFile,
        setPreviewFile,
        isHtmlPreviewModalOpen,
        htmlToPreview,
        initialTrueFullscreenRequest,
        configuringFile,
        setConfiguringFile,
        visibleMessages,
        handleBecameVisible,
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
        estimateMessageHeight
    };
};
