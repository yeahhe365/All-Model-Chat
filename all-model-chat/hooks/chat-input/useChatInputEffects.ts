
import { useEffect, useRef } from 'react';
import { InputCommand, UploadedFile } from '../../types';
import { convertHtmlToMarkdown } from '../../utils/htmlToMarkdown';

const PASTE_TEXT_AS_FILE_THRESHOLD = 5000;

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

    // 1. Handle Commanded Input
    useEffect(() => {
        if (commandedInput) {
            if (commandedInput.mode === 'quote') {
                setQuotes(prev => [...prev, commandedInput.text]);
            } else if (commandedInput.mode === 'append') {
                setInputText(prev => prev + (prev ? '\n' : '') + commandedInput.text);
            } else if (commandedInput.mode === 'insert') {
                const textarea = textareaRef.current;
                if (textarea) {
                    const start = textarea.selectionStart || 0;
                    const end = textarea.selectionEnd || 0;
                    const currentVal = textarea.value;
                    const insertText = commandedInput.text;
                    const newVal = currentVal.substring(0, start) + insertText + currentVal.substring(end);
                    
                    setInputText(newVal);
                    
                    // Re-focus and move cursor
                    requestAnimationFrame(() => {
                        textarea.focus();
                        const newCursorPos = start + insertText.length;
                        textarea.setSelectionRange(newCursorPos, newCursorPos);
                    });
                } else {
                     // Fallback
                     setInputText(prev => prev + commandedInput.text);
                }
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
    }, [commandedInput, setInputText, setQuotes, textareaRef]);

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

            const items = e.clipboardData?.items;
            const pastedText = e.clipboardData?.getData('text/plain');
            const htmlContent = e.clipboardData?.getData('text/html');

            // 4.1 Handle Files
            if (items) {
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
                    return;
                }
            }

            // 4.2 NEW: Handle Large Text Content as File (Global Paste)
            if (isPasteAsTextFileEnabled && pastedText && pastedText.length > PASTE_TEXT_AS_FILE_THRESHOLD) {
                e.preventDefault();
                e.stopPropagation();
                
                const timestamp = Math.floor(Date.now() / 1000);
                const fileName = `pasted_content_${timestamp}.txt`;
                const file = new File([pastedText], fileName, { type: 'text/plain' });
                
                justInitiatedFileOpRef.current = true;
                onProcessFiles([file]);
                textareaRef.current?.focus();
                return;
            }

            // 4.3 Handle Rich Text
            if (htmlContent && isPasteRichTextAsMarkdownEnabled) {
                const hasTags = /<[a-z][\s\S]*>/i.test(htmlContent);
                if (hasTags) {
                    const markdown = convertHtmlToMarkdown(htmlContent);
                    if (markdown) {
                        e.preventDefault();
                        e.stopPropagation();
                        setInputText(prev => prev + markdown);
                        const textarea = textareaRef.current;
                        if (textarea) {
                            textarea.focus();
                            setTimeout(() => {
                                const len = textarea.value.length;
                                textarea.setSelectionRange(len, len);
                                textarea.scrollTop = textarea.scrollHeight;
                            }, 0);
                        }
                        return;
                    }
                }
            }

            // 4.4 Handle Plain Text
            if (pastedText) {
                e.preventDefault();
                e.stopPropagation();
                setInputText(prev => prev + pastedText);
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

    // 6. Auto-focus on File Add (Drag & Drop or Selection)
    const prevFileCountRef = useRef(selectedFiles.length);
    useEffect(() => {
        if (selectedFiles.length > prevFileCountRef.current) {
            // Focus textarea when new files are added (e.g. drag & drop, file selection)
            // Use a small timeout to ensure UI updates and disabled state (if any) clears
            setTimeout(() => {
                textareaRef.current?.focus();
            }, 50);
        }
        prevFileCountRef.current = selectedFiles.length;
    }, [selectedFiles.length, textareaRef]);
};