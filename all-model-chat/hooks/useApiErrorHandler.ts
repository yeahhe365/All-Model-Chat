import { useCallback } from 'react';
import { logService } from '../utils/appUtils';
import { SavedChatSession } from '../types';

type SessionsUpdater = (updater: (prev: SavedChatSession[]) => SavedChatSession[]) => void;

export const useApiErrorHandler = (updateAndPersistSessions: SessionsUpdater) => {
    const handleApiError = useCallback((error: unknown, sessionId: string, modelMessageId: string, errorPrefix: string = "Error") => {
        const isAborted = error instanceof Error && (error.name === 'AbortError' || error.message === 'aborted');
        logService.error(`API Error (${errorPrefix}) for message ${modelMessageId} in session ${sessionId}`, { error, isAborted });
        
        if (isAborted) {
            updateAndPersistSessions(prev => prev.map(s => s.id === sessionId ? { ...s, messages: s.messages.map(msg =>
                msg.isLoading // Find any loading messages from this run
                    ? { ...msg, role: 'model', content: (msg.content || "") + "\n\n[Cancelled by user]", isLoading: false, generationEndTime: new Date() } 
                    : msg
            )}: s));
            return;
        }

        let errorMessage = "An unknown error occurred.";
        if (error instanceof Error) {
            errorMessage = error.name === 'SilentError'
                ? "API key is not configured in settings."
                : `${errorPrefix}: ${error.message}`;
        } else {
            errorMessage = `${errorPrefix}: ${String(error)}`;
        }

        updateAndPersistSessions(prev => prev.map(s => s.id === sessionId ? { ...s, messages: s.messages.map(msg => 
            msg.id === modelMessageId 
                ? { ...msg, role: 'error', content: errorMessage, isLoading: false, generationEndTime: new Date() } 
                : msg
        )}: s));
    }, [updateAndPersistSessions]);

    return { handleApiError };
};
