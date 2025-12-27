
import { useCallback, Dispatch, SetStateAction } from 'react';
import { UploadedFile } from '../../types';
import { ALL_SUPPORTED_MIME_TYPES } from '../../constants/fileConstants';

interface UseInputAndPasteHandlersProps {
    setUrlInput: Dispatch<SetStateAction<string>>;
    setShowAddByUrlInput: Dispatch<SetStateAction<boolean>>;
    setAppFileError: (error: string | null) => void;
    setSelectedFiles: Dispatch<SetStateAction<UploadedFile[]>>;
    textareaRef: React.RefObject<HTMLTextAreaElement>;
    justInitiatedFileOpRef: React.MutableRefObject<boolean>;
    onProcessFiles: (files: FileList | File[]) => Promise<void>;
    isAddingById: boolean;
    showCreateTextFileEditor: boolean;
    showCamera: boolean;
    showRecorder: boolean;
    handleSlashInputChange: (value: string) => void;
}

export const useInputAndPasteHandlers = ({
    setUrlInput,
    setShowAddByUrlInput,
    setAppFileError,
    setSelectedFiles,
    textareaRef,
    justInitiatedFileOpRef,
    onProcessFiles,
    isAddingById,
    showCreateTextFileEditor,
    showCamera,
    showRecorder,
    handleSlashInputChange,
}: UseInputAndPasteHandlersProps) => {

    const handleAddUrl = useCallback(async (url: string) => {
        const youtubeRegex = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})(?:\S+)?$/;
        if (!youtubeRegex.test(url)) {
            setAppFileError("Invalid YouTube URL provided.");
            return;
        }
        justInitiatedFileOpRef.current = true;
        const newUrlFile: UploadedFile = {
            id: `url-${Date.now()}`,
            name: url.length > 30 ? `${url.substring(0, 27)}...` : url,
            type: 'video/youtube-link',
            size: 0,
            fileUri: url,
            uploadState: 'active',
            isProcessing: false,
        };
        setSelectedFiles(prev => [...prev, newUrlFile]);
        setUrlInput('');
        setShowAddByUrlInput(false);
        textareaRef.current?.focus();
    }, [setAppFileError, justInitiatedFileOpRef, setSelectedFiles, setUrlInput, setShowAddByUrlInput, textareaRef]);

    const handlePaste = useCallback(async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const isModalOpen = showCreateTextFileEditor || showCamera || showRecorder;
        if (isAddingById || isModalOpen) return;

        const pastedText = event.clipboardData?.getData('text');
        const youtubeRegex = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})(?:\S+)?$/;
        if (pastedText && youtubeRegex.test(pastedText)) {
            event.preventDefault();
            await handleAddUrl(pastedText.trim());
            return;
        }

        const items = event.clipboardData?.items;
        if (!items) return;

        const filesToProcess: File[] = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.kind === 'file' && ALL_SUPPORTED_MIME_TYPES.includes(item.type)) {
                const file = item.getAsFile();
                if (file) filesToProcess.push(file);
            }
        }

        if (filesToProcess.length > 0) {
            event.preventDefault();
            justInitiatedFileOpRef.current = true;
            await onProcessFiles(filesToProcess);
            textareaRef.current?.focus();
        }
    }, [showCreateTextFileEditor, showCamera, showRecorder, isAddingById, handleAddUrl, onProcessFiles, justInitiatedFileOpRef, textareaRef]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        handleSlashInputChange(e.target.value);
    }, [handleSlashInputChange]);

    return {
        handleAddUrl,
        handlePaste,
        handleInputChange,
    };
};
