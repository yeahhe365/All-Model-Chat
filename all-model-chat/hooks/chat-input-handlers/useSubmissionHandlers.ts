
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
    quoteText: string;
    setInputText: Dispatch<SetStateAction<string>>;
    setQuoteText: Dispatch<SetStateAction<string>>;
    onUpdateMessageContent: (messageId: string, content: string) => void;
    setEditingMessageId: (id: string | null) => void;
    onMessageSent: () => void;
    clearCurrentDraft: () => void;
    onSendMessage: (text: string) => void;
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
    quoteText,
    setInputText,
    setQuoteText,
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

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
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
                    setQuoteText('');
                    onMessageSent();
                    return;
                }

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
    }, [canSend, selectedFiles, isEditing, editMode, editingMessageId, inputText, quoteText, setIsWaitingForUpload, clearCurrentDraft, onSendMessage, setInputText, setQuoteText, onMessageSent, setIsAnimatingSend, isFullscreen, setIsFullscreen, onUpdateMessageContent, setEditingMessageId]);

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
        handleTranslate,
    };
};
