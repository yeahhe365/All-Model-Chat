import { useCallback } from 'react';
import { logService } from '@/services/logService';
import { type SavedChatSession } from '@/types';
import { updateMessageInSession } from '@/utils/chat/sessionMutations';
import { useI18n } from '@/contexts/I18nContext';
import { formatMessageSenderText } from './i18nFormat';

type SessionsUpdater = (updater: (prev: SavedChatSession[]) => SavedChatSession[]) => void;

export const useApiErrorHandler = (updateAndPersistSessions: SessionsUpdater) => {
  const { t } = useI18n();

  const handleApiError = useCallback(
    (
      error: unknown,
      sessionId: string,
      modelMessageId: string,
      errorPrefix?: string,
      partialContent?: string,
      partialThoughts?: string,
    ) => {
      const resolvedErrorPrefix =
        !errorPrefix || errorPrefix === 'Error' ? t('messageSender_apiErrorPrefix') : errorPrefix;
      const isAborted = error instanceof Error && (error.name === 'AbortError' || error.message === 'aborted');
      logService.error(`API Error (${resolvedErrorPrefix}) for message ${modelMessageId} in session ${sessionId}`, {
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

      let errorMessage = t('messageSender_unknownError');
      if (error instanceof Error) {
        errorMessage =
          error.name === 'SilentError'
            ? t('messageSender_apiKeyNotConfigured')
            : formatMessageSenderText(t('messageSender_errorWithPrefix'), {
                prefix: resolvedErrorPrefix,
                message: error.message,
              });
      } else {
        errorMessage = formatMessageSenderText(t('messageSender_errorWithPrefix'), {
          prefix: resolvedErrorPrefix,
          message: String(error),
        });
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
    [t, updateAndPersistSessions],
  );

  return { handleApiError };
};
