import { useCallback, type MutableRefObject } from 'react';
import type { ChatMessage } from '../../types';
import { createMessage } from '../../utils/chat/session';
import type { SessionsUpdater } from './types';
import { useApiErrorHandler } from './useApiErrorHandler';

interface UseMessageLifecycleParams {
  updateAndPersistSessions: SessionsUpdater;
  setSessionLoading: (sessionId: string, isLoading: boolean) => void;
  activeJobs: MutableRefObject<Map<string, AbortController>>;
}

interface LoadingModelMessageParams {
  id: string;
  generationStartTime: Date;
  content?: string;
  excludeFromContext?: boolean;
}

interface RunMessageLifecycleParams<T> {
  sessionId: string;
  generationId: string;
  abortController: AbortController;
  modelMessageId?: string;
  errorPrefix?: string;
  execute: () => Promise<T>;
  onError?: (error: unknown) => void;
}

export const createLoadingModelMessage = ({
  id,
  generationStartTime,
  content = '',
  excludeFromContext,
}: LoadingModelMessageParams): ChatMessage =>
  createMessage('model', content, {
    id,
    isLoading: true,
    generationStartTime,
    ...(excludeFromContext === undefined ? {} : { excludeFromContext }),
  });

export const useMessageLifecycle = ({
  updateAndPersistSessions,
  setSessionLoading,
  activeJobs,
}: UseMessageLifecycleParams) => {
  const { handleApiError } = useApiErrorHandler(updateAndPersistSessions);

  const createLifecycleLoadingModelMessage = useCallback(createLoadingModelMessage, []);

  const startMessageLifecycle = useCallback(
    (sessionId: string, generationId: string, abortController: AbortController) => {
      setSessionLoading(sessionId, true);
      activeJobs.current.set(generationId, abortController);
    },
    [activeJobs, setSessionLoading],
  );

  const finishMessageLifecycle = useCallback(
    (sessionId: string, generationId: string) => {
      setSessionLoading(sessionId, false);
      activeJobs.current.delete(generationId);
    },
    [activeJobs, setSessionLoading],
  );

  const runMessageLifecycle = useCallback(
    async <T>({
      sessionId,
      generationId,
      abortController,
      modelMessageId = generationId,
      errorPrefix = 'Error',
      execute,
      onError,
    }: RunMessageLifecycleParams<T>): Promise<T | undefined> => {
      startMessageLifecycle(sessionId, generationId, abortController);

      try {
        return await execute();
      } catch (error) {
        if (onError) {
          onError(error);
        } else {
          handleApiError(error, sessionId, modelMessageId, errorPrefix);
        }
        return undefined;
      } finally {
        finishMessageLifecycle(sessionId, generationId);
      }
    },
    [finishMessageLifecycle, handleApiError, startMessageLifecycle],
  );

  return {
    createLoadingModelMessage: createLifecycleLoadingModelMessage,
    startMessageLifecycle,
    finishMessageLifecycle,
    runMessageLifecycle,
  };
};
