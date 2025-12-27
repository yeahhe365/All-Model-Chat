import { useEffect } from 'react';
import { InputCommand, UploadedFile } from '../../types';

interface UseChatInputEffectsProps {
    commandedInput: InputCommand | null;
    setInputText: React.Dispatch<React.SetStateAction<string>>;
    setQuoteText: React.Dispatch<React.SetStateAction<string>>;
    textareaRef: React.RefObject<HTMLTextAreaElement>;
    prevIsProcessingFileRef: React.MutableRefObject<boolean>;
    isProcessingFile: boolean;
    isAddingById: boolean;
    justInitiatedFileOpRef: React.MutableRefObject<boolean>;
    isWaitingForUpload: boolean;
    selectedFiles: UploadedFile[];
    clearCurrentDraft: () => void;
    inputText: string;
    quoteText: string;
    onSendMessage: (text: string) => void;
    onMessageSent: () => void;
    setIsAnimatingSend: (val: boolean) => void;
    isFullscreen: boolean;
    setIsFullscreen: (val: boolean) => void;
    onProcessFiles: (files: FileList | File[]) => Promise<void>;
    isModalOpen: boolean;
}

export const useChatInputEffects = ({
    commandedInput,
    setInputText,
    setQuoteText,
    textareaRef,
    prevIsProcessingFileRef,
    isProcessingFile,
    isAddingById,
    justInitiatedFileOpRef,
    isWaitingForUpload,
    selectedFiles,
    clearCurrentDraft,
    inputText,
    quoteText,
    onSendMessage,
    onMessageSent,
    setIsAnimatingSend,
    isFullscreen,
    setIsFullscreen,
    onProcessFiles,
    isModalOpen,
}: UseChatInputEffectsProps) => {

    // 1. Handle Commanded Input (e.g. from Suggestions or Slash Commands)
    useEffect(() => {
        if (commandedInput) {
            if (commandedInput.mode === 'quote') {
                setQuoteText(commandedInput.text);
            } else if (commandedInput.mode === 'append') {
                setInputText(prev => prev + (prev ? '\n' : '') + commandedInput.text);
            } else {
                setInputText(commandedInput.text);
            }

            // Focus regardless of mode
            setTimeout(() => {
                const textarea = textareaRef.current;
                if (textarea) {
                    textarea.focus();
                    const textLength = textarea.value.length;
                    textarea.setSelectionRange(textLength, textLength);
                }
            }, 0);
        }
    }, [commandedInput, setInputText, setQuoteText, textareaRef]);

    // 2. Restore Focus after File Processing
    useEffect(() => {
        if (prevIsProcessingFileRef.current && !isProcessingFile && !isAddingById && justInitiatedFileOpRef.current) {
            textareaRef.current?.focus();
            justInitiatedFileOpRef.current = false;
        }
        prevIsProcessingFileRef.current = isProcessingFile;
    }, [isProcessingFile, isAddingById, justInitiatedFileOpRef, prevIsProcessingFileRef, textareaRef]);

    // 3. Auto-Send when Upload Completes
    useEffect(() => {
        if (isWaitingForUpload) {
            const filesAreStillProcessing = selectedFiles.some(f => f.isProcessing);
            if (!filesAreStillProcessing) {
                clearCurrentDraft();

                let textToSend = inputText;
                if (quoteText) {
                    const formattedQuote = quoteText.split('\n').map(l => `> ${l}`).join('\n');
                    textToSend = `${formattedQuote}\n\n${inputText}`;
                }

                onSendMessage(textToSend);
                setInputText('');
                setQuoteText('');
                onMessageSent();
                setIsAnimatingSend(true);
                setTimeout(() => setIsAnimatingSend(false), 400);
                if (isFullscreen) {
                    setIsFullscreen(false);
                }
            }
        }
    }, [isWaitingForUpload, selectedFiles, onSendMessage, inputText, quoteText, onMessageSent, clearCurrentDraft, isFullscreen, setIsAnimatingSend, setIsFullscreen, setInputText, setQuoteText]);

    // 4. Global Paste Handler for Files
    useEffect(() => {
        const handleGlobalPaste = (e: ClipboardEvent) => {
            // If the target is the main textarea, ignore global listener to avoid double-processing
            if (textareaRef.current && (e.target === textareaRef.current || textareaRef.current.contains(e.target as Node))) {
                return;
            }

            if (isModalOpen) return;

            const items = e.clipboardData?.items;
            if (!items) return;

            const filesToProcess: File[] = [];
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.kind === 'file') {
                    const file = item.getAsFile();
                    if (file) filesToProcess.push(file);
                }
            }

            if (filesToProcess.length > 0) {
                e.preventDefault();
                e.stopPropagation();

                justInitiatedFileOpRef.current = true;
                onProcessFiles(filesToProcess);

                textareaRef.current?.focus();
            }
        };

        document.addEventListener('paste', handleGlobalPaste);
        return () => document.removeEventListener('paste', handleGlobalPaste);
    }, [onProcessFiles, textareaRef, justInitiatedFileOpRef, isModalOpen]);
};