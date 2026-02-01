
import React, { useCallback, Dispatch, SetStateAction } from 'react';
import { ChatMessage, UploadedFile, SavedChatSession, InputCommand } from '../types';
import { logService, cleanupFilePreviewUrls } from '../utils/appUtils';

type CommandedInputSetter = Dispatch<SetStateAction<InputCommand | null>>;
type SessionsUpdater = (updater: (prev: SavedChatSession[]) => SavedChatSession[]) => void;
type SendMessageFunc = (overrideOptions?: { text?: string; files?: UploadedFile[]; editingId?: string; isContinueMode?: boolean }) => Promise<void>;

interface MessageActionsProps {
    messages: ChatMessage[];
    isLoading: boolean;
    activeSessionId: string | null;
    editingMessageId: string | null;
    activeJobs: React.MutableRefObject<Map<string, AbortController>>;
    setCommandedInput: CommandedInputSetter;
    setSelectedFiles: (files: UploadedFile[] | ((prev: UploadedFile[]) => UploadedFile[])) => void;
    setEditingMessageId: (id: string | null) => void;
    setEditMode: (mode: 'update' | 'resend') => void;
    setAppFileError: (error: string | null) => void;
    updateAndPersistSessions: SessionsUpdater;
    userScrolledUp: React.MutableRefObject<boolean>;
    handleSendMessage: SendMessageFunc;
    setLoadingSessionIds: Dispatch<SetStateAction<Set<string>>>;
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
    setEditMode,
    setAppFileError,
    updateAndPersistSessions,
    userScrolledUp,
    handleSendMessage,
    setLoadingSessionIds,
}: MessageActionsProps) => {

    const handleStopGenerating = useCallback((options: { silent?: boolean } = {}) => {
        const { silent = false } = options;
        if (!activeSessionId || !isLoading) return;

        const loadingMessage = messages.find(msg => msg.isLoading);
        if (loadingMessage) {
            const generationId = loadingMessage.id;
            const controller = activeJobs.current.get(generationId);
            
            if (controller) {
                logService.warn(`User stopped generation for session ${activeSessionId}, job ${generationId}. Silent: ${silent}`);
                controller.abort();
                
                if (!silent) {
                    updateAndPersistSessions(prev => prev.map(s => {
                        if (s.id !== activeSessionId) return s;
                        
                        // Just mark the message as complete without appending any text.
                        // The streamOnComplete handler will decide the final state of the message.
                        return {
                            ...s,
                            messages: s.messages.map(msg =>
                                msg.id === generationId ? { ...msg, isLoading: false, generationEndTime: new Date(), stoppedByUser: true } : msg
                            )
                        };
                    }));
                }
                
                setLoadingSessionIds(prev => {
                    const next = new Set(prev);
                    next.delete(activeSessionId);
                    return next;
                });

                activeJobs.current.delete(generationId);
            } else {
                 logService.error(`Could not find active job to stop for generationId: ${generationId}. Aborting all as a fallback.`);
                 activeJobs.current.forEach(c => c.abort());
            }
        } else {
            logService.warn(`handleStopGenerating called for session ${activeSessionId}, but no loading message was found. Aborting all as a fallback.`);
            activeJobs.current.forEach(c => c.abort());
            setLoadingSessionIds(prev => {
                const next = new Set(prev);
                next.delete(activeSessionId);
                return next;
            });
        }
    }, [activeSessionId, isLoading, messages, activeJobs, updateAndPersistSessions, setLoadingSessionIds]);

    const handleCancelEdit = useCallback(() => { 
        logService.info("User cancelled message edit.");
        setCommandedInput({ text: '', id: Date.now() });
        setSelectedFiles([]); 
        setEditingMessageId(null); 
        setEditMode('resend'); // Reset to default
        setAppFileError(null); 
    }, [setCommandedInput, setSelectedFiles, setEditingMessageId, setEditMode, setAppFileError]);
    
    const handleEditMessage = useCallback((messageId: string, mode: 'update' | 'resend' = 'resend') => {
        logService.info("User initiated message edit", { messageId, mode });
        const messageToEdit = messages.find(msg => msg.id === messageId);
        if (messageToEdit) {
            if (isLoading) handleStopGenerating();
            setCommandedInput({ text: messageToEdit.content || '', id: Date.now() });
            setSelectedFiles(messageToEdit.files || []);
            setEditingMessageId(messageId);
            setEditMode(mode);
            setAppFileError(null);
            (document.querySelector('textarea[aria-label="Chat message input"]') as HTMLTextAreaElement)?.focus();
        }
    }, [messages, isLoading, handleStopGenerating, setCommandedInput, setSelectedFiles, setEditingMessageId, setEditMode, setAppFileError]);


    const handleDeleteMessage = useCallback((messageId: string) => {
        if (!activeSessionId) return;
        logService.info("User deleted message", { messageId, sessionId: activeSessionId });

        const messageToDelete = messages.find(msg => msg.id === messageId);
        if (messageToDelete?.isLoading) {
            handleStopGenerating();
        }

        // Cleanup blob URLs for the deleted message
        if (messageToDelete) {
            cleanupFilePreviewUrls(messageToDelete.files);
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

        if (isLoading) {
            handleStopGenerating({ silent: true });
        }
        
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

    const handleEditLastUserMessage = useCallback(() => {
        if (isLoading) {
            handleStopGenerating();
        }
        // Find the last message that was sent by the user
        const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
        if (lastUserMessage) {
            logService.info("User editing last message via command", { messageId: lastUserMessage.id });
            handleEditMessage(lastUserMessage.id, 'resend');
        } else {
            logService.warn("Could not edit last message: no user message found.");
        }
    }, [messages, isLoading, handleEditMessage, handleStopGenerating]);

    const handleContinueGeneration = useCallback(async (messageId: string) => {
        if (!activeSessionId) return;
        
        const message = messages.find(m => m.id === messageId);
        if (!message || message.role !== 'model') return;

        logService.info("User requested Continue Generation", { messageId });

        if (isLoading) {
            handleStopGenerating({ silent: true });
        }
        
        // IMPORTANT: Ensure UI input is cleared/reset when continuing, to avoid "prefilling" input box
        // although handleSendMessage doesn't use it, UI effects might. 
        setCommandedInput(null);
        setAppFileError(null);
        setEditingMessageId(null);

        // Pass isContinueMode: true and the ID of the model message we want to extend
        await handleSendMessage({
            editingId: messageId,
            isContinueMode: true
        });
    }, [activeSessionId, messages, isLoading, handleStopGenerating, handleSendMessage, setCommandedInput, setAppFileError, setEditingMessageId]);

    return {
        handleStopGenerating,
        handleEditMessage,
        handleCancelEdit,
        handleDeleteMessage,
        handleRetryMessage,
        handleRetryLastTurn,
        handleEditLastUserMessage,
        handleContinueGeneration
    };
};