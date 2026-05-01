import { useCallback } from 'react';
import { getKeyForRequest } from '../../utils/apiUtils';
import { generateUniqueId } from '../../utils/chat/ids';
import { getTranslator } from '../../utils/translations';
import { sendStatelessMessageStreamApi } from '../../services/api/chatApi';
import { DEFAULT_AUTO_CANVAS_MODEL_ID } from '../../constants/appConstants';
import { buildGenerationConfig } from '../../services/api/generationConfig';
import { CanvasGeneratorProps } from './types';
import { loadCanvasSystemPrompt } from '../../constants/promptHelpers';
import { useMessageLifecycle } from './useMessageLifecycle';

export const useCanvasGenerator = ({
  appSettings,
  currentChatSettings,
  activeSessionId,
  updateAndPersistSessions,
  setSessionLoading,
  activeJobs,
  getStreamHandlers,
  setAppFileError,
  aspectRatio,
  language,
}: CanvasGeneratorProps) => {
  const { createLoadingModelMessage, runMessageLifecycle } = useMessageLifecycle({
    updateAndPersistSessions,
    setSessionLoading,
    activeJobs,
  });

  const handleGenerateCanvas = useCallback(
    async (sourceMessageId: string, content: string) => {
      if (!activeSessionId) return;

      const keyResult = getKeyForRequest(appSettings, currentChatSettings, { skipIncrement: true });
      if ('error' in keyResult) {
        setAppFileError(keyResult.error);
        return;
      }
      const { key: keyToUse } = keyResult;

      const generationId = generateUniqueId();
      const generationStartTime = new Date();
      const newAbortController = new AbortController();

      updateAndPersistSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeSessionId) {
            const sourceIndex = s.messages.findIndex((m) => m.id === sourceMessageId);
            const insertIndex = sourceIndex !== -1 ? sourceIndex + 1 : s.messages.length;

            const newMsg = createLoadingModelMessage({
              id: generationId,
              generationStartTime,
              excludeFromContext: true,
            });

            const newMessages = [...s.messages];
            newMessages.splice(insertIndex, 0, newMsg);

            return { ...s, messages: newMessages };
          }
          return s;
        }),
      );

      const canvasModelId = appSettings.autoCanvasModelId || DEFAULT_AUTO_CANVAS_MODEL_ID;
      const canvasThinkingLevel = 'HIGH';
      const canvasSystemPrompt = await loadCanvasSystemPrompt();

      const canvasSettings = {
        ...currentChatSettings,
        modelId: canvasModelId,
        thinkingLevel: canvasThinkingLevel as 'HIGH',
        thinkingBudget: 0,
        showThoughts: true,
      };

      const { streamOnError, streamOnComplete, streamOnPart, onThoughtChunk } = getStreamHandlers(
        activeSessionId,
        generationId,
        newAbortController,
        generationStartTime,
        canvasSettings,
      );

      const config = await buildGenerationConfig({
        modelId: canvasModelId,
        systemInstruction: canvasSystemPrompt,
        config: { temperature: 0.7, topP: 0.95 },
        showThoughts: true,
        thinkingBudget: 0,
        isGoogleSearchEnabled: false,
        isCodeExecutionEnabled: false,
        isUrlContextEnabled: false,
        thinkingLevel: canvasThinkingLevel,
        aspectRatio,
        isDeepSearchEnabled: false,
        isLocalPythonEnabled: false,
      });

      const t = getTranslator(language);
      const promptInstruction = t('suggestion_html_desc');

      await runMessageLifecycle({
        sessionId: activeSessionId,
        generationId,
        abortController: newAbortController,
        onError: (error) => {
          streamOnError(error instanceof Error ? error : new Error(String(error)));
        },
        execute: async () => {
          await sendStatelessMessageStreamApi(
            keyToUse,
            canvasModelId,
            [],
            [{ text: promptInstruction }, { text: content }],
            config,
            newAbortController.signal,
            streamOnPart,
            onThoughtChunk,
            streamOnError,
            streamOnComplete,
          );
        },
      });
    },
    [
      appSettings,
      currentChatSettings,
      activeSessionId,
      updateAndPersistSessions,
      getStreamHandlers,
      setAppFileError,
      aspectRatio,
      language,
      createLoadingModelMessage,
      runMessageLifecycle,
    ],
  );

  return { handleGenerateCanvas };
};
