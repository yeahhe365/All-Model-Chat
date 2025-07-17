import { useCallback, Dispatch, SetStateAction } from 'react';
import { ChatMessage, UploadedFile, SavedChatSession } from '../types';
import { logService } from '../utils/appUtils';

type CommandedInputSetter = Dispatch<SetStateAction<{ text: string; id: number; } | null>>;
type SessionsUpdater = (updater: (prev: SavedChatSession[]) => SavedChatSession[]) => void;
type SendMessageFunc = (overrideOptions?: { text?: string; files?: UploadedFile[]; editingId?: string }) => Promise<void>;

interface MessageActionsProps {
    messages: ChatMessage[];
    isLoading: boolean;
    activeSessionId: string | null;
    editingMessageId: string | null;
    activeJobs: React.MutableRefObject<Map<string, AbortController>>;
    setCommandedInput: CommandedInputSetter;
    setSelectedFiles: (files: UploadedFile[] | ((prev: UploadedFile[]) => UploadedFile[])) => void;
    setEditingMessageId: (id: string | null) => void;
    setAppFileError: (error: string | null) => void;
    updateAndPersistSessions: SessionsUpdater;
    userScrolledUp: React.MutableRefObject<boolean>;
    handleSendMessage: SendMessageFunc;
}

export const useMessageActions = ({
    messages,
    isLoading,
    activeSessionId,
    editingMessageId,
    activeJobs,
    setCommandedInput,
    setSelectedFiles,
    setEditingMessageId,
    setAppFileError,
    updateAndPersistSessions,
    userScrolledUp,
    handleSendMessage
}: MessageActionsProps) => {

    const handleStopGenerating = useCallback(() => {
        if (!activeSessionId || !isLoading) return;
        logService.warn(`User stopped generation for session: ${activeSessionId}`);
        activeJobs.current.forEach(controller => controller.abort());
    }, [activeSessionId, isLoading, activeJobs]);

    const handleCancelEdit = useCallback(() => { 
        logService.info("User cancelled message edit.");
        setCommandedInput({ text: '', id: Date.now() });
        setSelectedFiles([]); 
        setEditingMessageId(null); 
        setAppFileError(null); 
    }, [setCommandedInput, setSelectedFiles, setEditingMessageId, setAppFileError]);
    
    const handleEditMessage = useCallback((messageId: string) => {
        logService.info("User initiated message edit", { messageId });
        const messageToEdit = messages.find(msg => msg.id === messageId);
        if (messageToEdit?.role === 'user') {
            if (isLoading) handleStopGenerating();
            setCommandedInput({ text: messageToEdit.content, id: Date.now() });
            setSelectedFiles(messageToEdit.files || []);
            setEditingMessageId(messageId);
            setAppFileError(null);
            (document.querySelector('textarea[aria-label="Chat message input"]') as HTMLTextAreaElement)?.focus();
        }
    }, [messages, isLoading, handleStopGenerating, setCommandedInput, setSelectedFiles, setEditingMessageId, setAppFileError]);


    const handleDeleteMessage = useCallback((messageId: string) => {
        if (!activeSessionId) return;
        logService.info("User deleted message", { messageId, sessionId: activeSessionId });

        const messageToDelete = messages.find(msg => msg.id === messageId);
        if (messageToDelete?.isLoading) {
            handleStopGenerating();
        }

        updateAndPersistSessions(prev => prev.map(s => 
            s.id === activeSessionId ? { ...s, messages: s.messages.filter(msg => msg.id !== messageId) } : s
        ));

        if (editingMessageId === messageId) handleCancelEdit();
        userScrolledUp.current = false;
    }, [activeSessionId, messages, editingMessageId, handleStopGenerating, updateAndPersistSessions, handleCancelEdit, userScrolledUp]);
    
    const handleRetryMessage = useCallback(async (modelMessageIdToRetry: string) => {
        if (!activeSessionId) return;
        logService.info("User retrying message", { modelMessageId: modelMessageIdToRetry, sessionId: activeSessionId });
        
        const modelMessageIndex = messages.findIndex(m => m.id === modelMessageIdToRetry);
        if (modelMessageIndex < 1) return;

        const userMessageToResend = messages[modelMessageIndex - 1];
        if (userMessageToResend.role !== 'user') return;

        if (isLoading) handleStopGenerating();
        
        // When retrying, we're effectively editing the user message that came before the failed model response.
        // This will slice the history correctly and resubmit.
        await handleSendMessage({
            text: userMessageToResend.content,
            files: userMessageToResend.files,
            editingId: userMessageToResend.id,
        });
    }, [activeSessionId, messages, isLoading, handleStopGenerating, handleSendMessage]);

    const handleRetryLastTurn = useCallback(async () => {
        if (!activeSessionId) return;
        
        const lastModelMessage = [...messages].reverse().find(m => m.role === 'model' || m.role === 'error');
        
        if (lastModelMessage) {
            logService.info("User retrying last turn via command", { modelMessageId: lastModelMessage.id, sessionId: activeSessionId });
            await handleRetryMessage(lastModelMessage.id);
        } else {
            logService.warn("Could not retry last turn: no model message found.");
        }
    }, [activeSessionId, messages, handleRetryMessage]);

    return {
        handleStopGenerating,
        handleEditMessage,
        handleCancelEdit,
        handleDeleteMessage,
        handleRetryMessage,
        handleRetryLastTurn,
    };
};