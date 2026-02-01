
import { useCallback, Dispatch, SetStateAction } from 'react';
import { UploadedFile } from '../../types';
import { processClipboardData } from '../../utils/clipboardUtils';
import { useTextAreaInsert } from '../useTextAreaInsert';

interface UseInputAndPasteHandlersProps {
    setInputText: Dispatch<SetStateAction<string>>;
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
    isPasteRichTextAsMarkdownEnabled: boolean;
    isPasteAsTextFileEnabled: boolean;
}

export const useInputAndPasteHandlers = ({
    setInputText,
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
    isPasteRichTextAsMarkdownEnabled,
    isPasteAsTextFileEnabled,
}: UseInputAndPasteHandlersProps) => {

    const insertText = useTextAreaInsert(textareaRef, setInputText);

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

        const result = processClipboardData(event.clipboardData, {
            isPasteRichTextAsMarkdownEnabled,
            isPasteAsTextFileEnabled
        });

        if (result.type === 'empty') return;

        if (result.type === 'files' || result.type === 'large-text-file') {
            event.preventDefault();
            event.stopPropagation();
            justInitiatedFileOpRef.current = true;
            await onProcessFiles(result.files);
            textareaRef.current?.focus();
            return;
        }

        if (result.type === 'markdown') {
            event.preventDefault();
            insertText(result.content);
            return;
        }

        if (result.type === 'text') {
            const pastedText = result.content;
            // Handle YouTube Links specifically for the input area
            const youtubeRegex = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})(?:\S+)?$/;
            if (youtubeRegex.test(pastedText.trim())) {
                event.preventDefault();
                await handleAddUrl(pastedText.trim());
                return;
            }
            // Standard text paste is handled natively
        }

    }, [showCreateTextFileEditor, showCamera, showRecorder, isAddingById, handleAddUrl, onProcessFiles, justInitiatedFileOpRef, textareaRef, isPasteRichTextAsMarkdownEnabled, isPasteAsTextFileEnabled, insertText]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        handleSlashInputChange(e.target.value);
        setInputText(e.target.value);
    }, [handleSlashInputChange, setInputText]);

    return {
        handleAddUrl,
        handlePaste,
        handleInputChange,
    };
};
