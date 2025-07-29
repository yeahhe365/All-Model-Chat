import { useCallback } from 'react';
import { logService } from '../utils/appUtils';
import { SavedChatSession } from '../types';

type SessionsUpdater = (updater: (prev: SavedChatSession[]) => SavedChatSession[]) => void;

export const useApiErrorHandler = (updateAndPersistSessions: SessionsUpdater) => {
    const handleApiError = useCallback((error: unknown, sessionId: string, modelMessageId: string, errorPrefix: string = "Error") => {
        const isAborted = error instanceof Error && (error.name === 'AbortError' || error.message === 'aborted');
        logService.error(`API Error (${errorPrefix}) for message ${modelMessageId} in session ${sessionId}`, { error, isAborted });
        
        if (isAborted) {
            // Optimistic update in useMessageActions.handleStopGenerating now handles the UI change immediately.
            // This function's role for AbortError is now just to log it and let the stream cleanup occur naturally.
            // No UI state change is needed here to prevent race conditions.
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
                ? { 
                    ...msg, 
                    role: 'error', 
                    content: (msg.content || '').trim() + `\n\n[${errorMessage}]`, 
                    isLoading: false, 
                    generationEndTime: new Date() 
                  } 
                : msg
        )}: s));
    }, [updateAndPersistSessions]);

    return { handleApiError };
};
