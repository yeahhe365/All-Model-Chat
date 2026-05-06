import { useCallback } from 'react';
import { logService } from '../../services/logService';
import { SavedChatSession } from '../../types';
import { updateMessageInSession } from '../../utils/chat/sessionMutations';

type SessionsUpdater = (updater: (prev: SavedChatSession[]) => SavedChatSession[]) => void;

export const useApiErrorHandler = (updateAndPersistSessions: SessionsUpdater) => {
  const handleApiError = useCallback(
    (
      error: unknown,
      sessionId: string,
      modelMessageId: string,
      errorPrefix: string = 'Error',
      partialContent?: string,
      partialThoughts?: string,
    ) => {
      const isAborted = error instanceof Error && (error.name === 'AbortError' || error.message === 'aborted');
      logService.error(`API Error (${errorPrefix}) for message ${modelMessageId} in session ${sessionId}`, {
        error,
        isAborted,
      });

      if (isAborted) {
        // If we have partial content to save during an abort, update the state.
        if (partialContent !== undefined || partialThoughts !== undefined) {
          updateAndPersistSessions((prev) =>
            updateMessageInSession(prev, sessionId, modelMessageId, (msg) => ({
              ...msg,
              content: partialContent !== undefined ? partialContent : msg.content,
              thoughts: partialThoughts !== undefined ? partialThoughts : msg.thoughts,
              isLoading: false,
              generationEndTime: new Date(),
            })),
          );
        }
        // Optimistic update in useMessageActions.handleStopGenerating also handles the UI change.
        return;
      }

      let errorMessage = 'An unknown error occurred.';
      if (error instanceof Error) {
        errorMessage =
          error.name === 'SilentError' ? 'API key is not configured in settings.' : `${errorPrefix}: ${error.message}`;
      } else {
        errorMessage = `${errorPrefix}: ${String(error)}`;
      }

      updateAndPersistSessions((prev) =>
        updateMessageInSession(prev, sessionId, modelMessageId, (msg) => ({
          ...msg,
          role: 'error',
          // Use partial content if available, otherwise append to existing content.
          content: (partialContent !== undefined ? partialContent : msg.content || '').trim() + `\n\n[${errorMessage}]`,
          thoughts: partialThoughts !== undefined ? partialThoughts : msg.thoughts,
          isLoading: false,
          generationEndTime: new Date(),
        })),
      );
    },
    [updateAndPersistSessions],
  );

  return { handleApiError };
};
