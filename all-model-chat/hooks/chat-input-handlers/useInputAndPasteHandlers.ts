
import { useCallback, Dispatch, SetStateAction } from 'react';
import { UploadedFile } from '../../types';
import { ALL_SUPPORTED_MIME_TYPES } from '../../constants/fileConstants';
import { convertHtmlToMarkdown } from '../../utils/htmlToMarkdown';

const PASTE_TEXT_AS_FILE_THRESHOLD = 5000;

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

        // 1. Handle Physical Files Priority
        const items = event.clipboardData?.items;
        if (items) {
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
                event.stopPropagation();
                justInitiatedFileOpRef.current = true;
                await onProcessFiles(filesToProcess);
                textareaRef.current?.focus();
                return;
            }
        }

        const pastedText = event.clipboardData?.getData('text/plain');

        // 2. NEW: Handle Large Text Content as File
        if (isPasteAsTextFileEnabled && pastedText && pastedText.length > PASTE_TEXT_AS_FILE_THRESHOLD) {
            event.preventDefault();
            event.stopPropagation();
            
            const timestamp = Math.floor(Date.now() / 1000);
            const fileName = `pasted_content_${timestamp}.txt`;
            const file = new File([pastedText], fileName, { type: 'text/plain' });
            
            justInitiatedFileOpRef.current = true;
            await onProcessFiles([file]);
            textareaRef.current?.focus();
            return;
        }
        
        // 3. Handle YouTube Links
        const youtubeRegex = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})(?:\S+)?$/;
        if (pastedText && youtubeRegex.test(pastedText.trim())) {
            event.preventDefault();
            await handleAddUrl(pastedText.trim());
            return;
        }

        // 4. Handle Rich Text (HTML -> Markdown)
        const htmlContent = event.clipboardData?.getData('text/html');
        if (htmlContent && isPasteRichTextAsMarkdownEnabled) {
            const hasTags = /<[a-z][\s\S]*>/i.test(htmlContent);
            if (hasTags) {
                const markdown = convertHtmlToMarkdown(htmlContent);
                if (markdown) {
                    event.preventDefault();
                    const textarea = textareaRef.current;
                    if (textarea) {
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const currentValue = textarea.value;
                        const newValue = currentValue.substring(0, start) + markdown + currentValue.substring(end);
                        setInputText(newValue);
                        setTimeout(() => {
                            textarea.focus();
                            textarea.selectionStart = textarea.selectionEnd = start + markdown.length;
                        }, 0);
                    }
                    return;
                }
            }
        }
    }, [showCreateTextFileEditor, showCamera, showRecorder, isAddingById, handleAddUrl, onProcessFiles, justInitiatedFileOpRef, textareaRef, setInputText, isPasteRichTextAsMarkdownEnabled, isPasteAsTextFileEnabled]);

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