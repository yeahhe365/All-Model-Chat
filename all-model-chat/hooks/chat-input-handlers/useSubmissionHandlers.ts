
import { useCallback, Dispatch, SetStateAction } from 'react';
import { AppSettings, ChatSettings, UploadedFile } from '../../types';
import { getKeyForRequest } from '../../utils/appUtils';
import { geminiServiceInstance } from '../../services/geminiService';

interface UseSubmissionHandlersProps {
    canSend: boolean;
    selectedFiles: UploadedFile[];
    setIsWaitingForUpload: Dispatch<SetStateAction<boolean>>;
    isEditing: boolean;
    editMode: 'update' | 'resend';
    editingMessageId: string | null;
    inputText: string;
    quotes: string[];
    setInputText: Dispatch<SetStateAction<string>>;
    setQuotes: Dispatch<SetStateAction<string[]>>;
    onUpdateMessageContent: (messageId: string, content: string) => void;
    setEditingMessageId: (id: string | null) => void;
    onMessageSent: () => void;
    clearCurrentDraft: () => void;
    onSendMessage: (text: string, options?: { isFastMode?: boolean }) => void;
    setIsAnimatingSend: Dispatch<SetStateAction<boolean>>;
    isFullscreen: boolean;
    setIsFullscreen: Dispatch<SetStateAction<boolean>>;
    
    // Translation props
    isTranslating: boolean;
    setIsTranslating: Dispatch<SetStateAction<boolean>>;
    setAppFileError: (error: string | null) => void;
    appSettings: AppSettings;
    currentChatSettings: ChatSettings;
    adjustTextareaHeight: () => void;
}

export const useSubmissionHandlers = ({
    canSend,
    selectedFiles,
    setIsWaitingForUpload,
    isEditing,
    editMode,
    editingMessageId,
    inputText,
    quotes,
    setInputText,
    setQuotes,
    onUpdateMessageContent,
    setEditingMessageId,
    onMessageSent,
    clearCurrentDraft,
    onSendMessage,
    setIsAnimatingSend,
    isFullscreen,
    setIsFullscreen,
    isTranslating,
    setIsTranslating,
    setAppFileError,
    appSettings,
    currentChatSettings,
    adjustTextareaHeight,
}: UseSubmissionHandlersProps) => {

    const performSubmit = useCallback((isFastMode: boolean) => {
        if (canSend) {
            const filesAreStillProcessing = selectedFiles.some(f => f.isProcessing);
            if (filesAreStillProcessing) {
                setIsWaitingForUpload(true);
            } else {
                if (isEditing && editMode === 'update' && editingMessageId) {
                    onUpdateMessageContent(editingMessageId, inputText);
                    setEditingMessageId(null);
                    clearCurrentDraft(); // Clear draft to prevent it from reloading when edit mode exits
                    setInputText('');
                    setQuotes([]);
                    onMessageSent();
                    return;
                }

                clearCurrentDraft();
                
                let textToSend = inputText;
                if (quotes.length > 0) {
                    const formattedQuotes = quotes.map((q, i) => {
                        const label = quotes.length > 1 ? `**Quote ${i + 1}**:\n` : '';
                        return `${label}${q.split('\n').map(l => `> ${l}`).join('\n')}`;
                    }).join('\n\n');
                    textToSend = `${formattedQuotes}\n\n${inputText}`;
                }

                onSendMessage(textToSend, { isFastMode });
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
    }, [canSend, selectedFiles, isEditing, editMode, editingMessageId, inputText, quotes, setIsWaitingForUpload, clearCurrentDraft, onSendMessage, setInputText, setQuotes, onMessageSent, setIsAnimatingSend, isFullscreen, setIsFullscreen, onUpdateMessageContent, setEditingMessageId]);

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        performSubmit(false);
    }, [performSubmit]);

    const handleFastSubmit = useCallback(() => {
        performSubmit(true);
    }, [performSubmit]);

    const handleTranslate = useCallback(async () => {
        if (!inputText.trim() || isTranslating) return;

        setIsTranslating(true);
        setAppFileError(null);

        const keyResult = getKeyForRequest(appSettings, currentChatSettings, { skipIncrement: true });
        if ('error' in keyResult) {
            setAppFileError(keyResult.error);
            setIsTranslating(false);
            return;
        }

        try {
            const translatedText = await geminiServiceInstance.translateText(keyResult.key, inputText);
            setInputText(translatedText);
            setTimeout(() => adjustTextareaHeight(), 0);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Translation failed.";
            setAppFileError(errorMessage);
        } finally {
            setIsTranslating(false);
        }
    }, [inputText, isTranslating, setAppFileError, appSettings, currentChatSettings, setInputText, adjustTextareaHeight]);

    return {
        handleSubmit,
        handleFastSubmit,
        handleTranslate,
    };
};
