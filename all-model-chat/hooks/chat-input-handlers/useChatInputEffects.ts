
import { useEffect, useRef } from 'react';
import { InputCommand, UploadedFile } from '../../types';
import { processClipboardData } from '../../utils/clipboardUtils';
import { useTextAreaInsert } from '../useTextAreaInsert';

interface UseChatInputEffectsProps {
    commandedInput: InputCommand | null;
    setInputText: React.Dispatch<React.SetStateAction<string>>;
    setQuotes: React.Dispatch<React.SetStateAction<string[]>>;
    textareaRef: React.RefObject<HTMLTextAreaElement>;
    prevIsProcessingFileRef: React.MutableRefObject<boolean>;
    isProcessingFile: boolean;
    isAddingById: boolean;
    justInitiatedFileOpRef: React.MutableRefObject<boolean>;
    isWaitingForUpload: boolean;
    setIsWaitingForUpload: React.Dispatch<React.SetStateAction<boolean>>;
    selectedFiles: UploadedFile[];
    clearCurrentDraft: () => void;
    inputText: string;
    quotes: string[];
    onSendMessage: (text: string) => void;
    onMessageSent: () => void;
    setIsAnimatingSend: (val: boolean) => void;
    isFullscreen: boolean;
    setIsFullscreen: (val: boolean) => void;
    onProcessFiles: (files: FileList | File[]) => Promise<void>;
    isModalOpen: boolean;
    isPasteRichTextAsMarkdownEnabled: boolean;
    isPasteAsTextFileEnabled: boolean;
}

export const useChatInputEffects = ({
    commandedInput,
    setInputText,
    setQuotes,
    textareaRef,
    prevIsProcessingFileRef,
    isProcessingFile,
    isAddingById,
    justInitiatedFileOpRef,
    isWaitingForUpload,
    setIsWaitingForUpload,
    selectedFiles,
    clearCurrentDraft,
    inputText,
    quotes,
    onSendMessage,
    onMessageSent,
    setIsAnimatingSend,
    isFullscreen,
    setIsFullscreen,
    onProcessFiles,
    isModalOpen,
    isPasteRichTextAsMarkdownEnabled,
    isPasteAsTextFileEnabled,
}: UseChatInputEffectsProps) => {

    const insertText = useTextAreaInsert(textareaRef, setInputText);

    // 1. Handle Commanded Input
    useEffect(() => {
        if (commandedInput) {
            if (commandedInput.mode === 'quote') {
                setQuotes(prev => [...prev, commandedInput.text]);
            } else if (commandedInput.mode === 'append') {
                setInputText(prev => prev + (prev ? '\n' : '') + commandedInput.text);
            } else if (commandedInput.mode === 'insert') {
                insertText(commandedInput.text);
            } else {
                setInputText(commandedInput.text);
            }

            if (commandedInput.mode !== 'insert') {
                setTimeout(() => {
                    const textarea = textareaRef.current;
                    if (textarea) {
                        textarea.focus();
                        const textLength = textarea.value.length;
                        textarea.setSelectionRange(textLength, textLength);
                    }
                }, 0);
            }
        }
    }, [commandedInput, setInputText, setQuotes, textareaRef, insertText]);

    // 2. Restore Focus after File Processing
    useEffect(() => {
        if (prevIsProcessingFileRef.current && !isProcessingFile && !isAddingById) {
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
                // Reset waiting state immediately to unlock UI
                setIsWaitingForUpload(false);

                clearCurrentDraft();

                let textToSend = inputText;
                if (quotes.length > 0) {
                    const formattedQuotes = quotes.map((q, i) => {
                         const label = quotes.length > 1 ? `**Quote ${i + 1}**:\n` : '';
                         return `${label}${q.split('\n').map(l => `> ${l}`).join('\n')}`;
                    }).join('\n\n');
                    textToSend = `${formattedQuotes}\n\n${inputText}`;
                }

                onSendMessage(textToSend);
                setInputText('');
                setQuotes([]);
                onMessageSent();
                setIsAnimatingSend(true);
                setTimeout(() => setIsAnimatingSend(false), 400);
                if (isFullscreen) {
                    setIsFullscreen(false);
                }
            }
        }
    }, [isWaitingForUpload, selectedFiles, onSendMessage, inputText, quotes, onMessageSent, clearCurrentDraft, isFullscreen, setIsAnimatingSend, setIsFullscreen, setInputText, setQuotes, setIsWaitingForUpload]);

    // 4. Global Paste Handler
    useEffect(() => {
        const handleGlobalPaste = (e: ClipboardEvent) => {
            if (isModalOpen) return;

            const target = e.target as HTMLElement;
            const isInput = target.tagName === 'INPUT' || 
                            target.tagName === 'TEXTAREA' || 
                            target.isContentEditable;
            
            if (isInput) return;

            const result = processClipboardData(e.clipboardData, {
                isPasteRichTextAsMarkdownEnabled,
                isPasteAsTextFileEnabled
            });

            if (result.type === 'empty') return;

            // 4.1 Handle Files
            if (result.type === 'files' || result.type === 'large-text-file') {
                e.preventDefault();
                e.stopPropagation();
                justInitiatedFileOpRef.current = true;
                onProcessFiles(result.files);
                textareaRef.current?.focus();
                return;
            }

            // 4.2 Handle Text Content (Markdown or Plain)
            const textToInsert = result.type === 'markdown' ? result.content : (result.type === 'text' ? result.content : '');

            if (textToInsert) {
                e.preventDefault();
                e.stopPropagation();
                // For global paste (outside input), simple append is often preferred as cursor context isn't active
                setInputText(prev => prev + textToInsert);
                const textarea = textareaRef.current;
                if (textarea) {
                    textarea.focus();
                    setTimeout(() => {
                        const len = textarea.value.length;
                        textarea.setSelectionRange(len, len);
                        textarea.scrollTop = textarea.scrollHeight;
                    }, 0);
                }
            }
        };

        document.addEventListener('paste', handleGlobalPaste);
        return () => document.removeEventListener('paste', handleGlobalPaste);
    }, [onProcessFiles, textareaRef, justInitiatedFileOpRef, isModalOpen, setInputText, isPasteRichTextAsMarkdownEnabled, isPasteAsTextFileEnabled]);

    // 5. Global Keydown Handler
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (isModalOpen) return;

            const target = e.target as HTMLElement;
            const isInput = target.tagName === 'INPUT' || 
                            target.tagName === 'TEXTAREA' || 
                            target.tagName === 'SELECT' ||
                            target.isContentEditable;
            
            if (e.key === 'Delete') {
                if (isInput && target !== textareaRef.current) return;
                setInputText('');
                textareaRef.current?.focus();
                return;
            }
            
            if (isInput) return;
            if (e.ctrlKey || e.metaKey || e.altKey) return;

            if (e.key.length === 1) {
                const textarea = textareaRef.current;
                if (textarea) {
                    e.preventDefault();
                    textarea.focus();
                    setInputText(prev => prev + e.key);
                    setTimeout(() => {
                        const len = textarea.value.length;
                        textarea.setSelectionRange(len, len);
                        textarea.scrollTop = textarea.scrollHeight;
                    }, 0);
                }
            }
        };

        document.addEventListener('keydown', handleGlobalKeyDown);
        return () => document.removeEventListener('keydown', handleGlobalKeyDown);
    }, [isModalOpen, textareaRef, setInputText]);

    // 6. Auto-focus on File Add
    const prevFileCountRef = useRef(selectedFiles.length);
    useEffect(() => {
        if (selectedFiles.length > prevFileCountRef.current) {
            setTimeout(() => {
                textareaRef.current?.focus();
            }, 50);
        }
        prevFileCountRef.current = selectedFiles.length;
    }, [selectedFiles.length, textareaRef]);
};
