import { useCallback } from 'react';
import { logService } from '../../services/logService';
import { buildContentParts } from '../../utils/chat/builder';
import { getModelCapabilities } from '../../utils/modelHelpers';
import type { UploadedFile } from '../../types';
import { StandardChatProps } from './types';
import { useStandardChatApiCall } from './useStandardChatApiCall';
import { resolveStandardChatTurn } from './standardChatTurn';
import type { PreparedModelRequest } from './useModelRequestRunner';
import { useMessageLifecycle } from './useMessageLifecycle';
import { runOptimisticMessagePipeline } from './messagePipeline';

interface SendStandardMessageInput {
  text: string;
  files: UploadedFile[];
  editingMessageId: string | null;
  activeModelId: string;
  isContinueMode?: boolean;
  isFastMode?: boolean;
  request: PreparedModelRequest;
}

export const useStandardChat = ({
  appSettings,
  currentChatSettings,
  messages,
  setEditingMessageId,
  aspectRatio,
  imageSize,
  imageOutputMode,
  personGeneration,
  userScrolledUpRef,
  activeSessionId,
  setActiveSessionId,
  activeJobs,
  setSessionLoading,
  updateAndPersistSessions,
  getStreamHandlers,
  sessionKeyMapRef,
  handleGenerateCanvas,
}: StandardChatProps) => {
  const { runMessageLifecycle } = useMessageLifecycle({
    updateAndPersistSessions,
    setSessionLoading,
    activeJobs,
  });

  const { performApiCall } = useStandardChatApiCall({
    appSettings,
    messages,
    updateAndPersistSessions,
    getStreamHandlers,
    handleGenerateCanvas,
    aspectRatio,
    imageSize,
    imageOutputMode,
    personGeneration,
    resolveTurn: resolveStandardChatTurn,
  });

  const sendStandardMessage = useCallback(
    async ({
      text: textToUse,
      files: filesToUse,
      editingMessageId: effectiveEditingId,
      activeModelId,
      isContinueMode = false,
      isFastMode = false,
      request,
    }: SendStandardMessageInput) => {
      const effectiveActiveModelId =
        appSettings.apiMode === 'openai-compatible'
          ? appSettings.openaiCompatibleModelId || activeModelId
          : activeModelId;
      const settingsForPersistence = { ...currentChatSettings };
      const settingsForApi = { ...currentChatSettings };

      if (isFastMode) {
        const isGemini3Flash = effectiveActiveModelId.includes('gemini-3') && effectiveActiveModelId.includes('flash');
        const targetLevel = isGemini3Flash ? 'MINIMAL' : 'LOW';

        settingsForApi.thinkingLevel = targetLevel;
        settingsForApi.thinkingBudget = 0;
        logService.info(`Fast Mode activated (One-off): Overriding thinking level to ${targetLevel}.`);
      }

      const {
        keyToUse,
        shouldLockKey,
        generationId,
        generationStartTime,
        abortController: newAbortController,
      } = request;

      const successfullyProcessedFiles = filesToUse.filter(
        (file) => file.uploadState === 'active' && !file.error && !file.isProcessing,
      );
      const preferCodeExecutionFileInputs =
        !!settingsForApi.isCodeExecutionEnabled && !settingsForApi.isLocalPythonEnabled;

      const { contentParts: promptParts, enrichedFiles } = await buildContentParts(
        textToUse.trim(),
        successfullyProcessedFiles,
        effectiveActiveModelId,
        settingsForApi.mediaResolution,
        preferCodeExecutionFileInputs,
      );

      const isRawMode = Boolean(
        (settingsForApi.isRawModeEnabled ?? appSettings.isRawModeEnabled) &&
        !isContinueMode &&
        getModelCapabilities(effectiveActiveModelId).supportsRawReasoningPrefill,
      );

      const lastMessage = messages[messages.length - 1];
      const cumulativeTotalTokens = lastMessage?.cumulativeTotalTokens || 0;
      const placement =
        isContinueMode && effectiveEditingId
          ? ({ type: 'continue-model', targetMessageId: effectiveEditingId } as const)
          : ({ type: 'append-turn' } as const);

      await runOptimisticMessagePipeline({
        activeSessionId,
        appSettings,
        currentChatSettings: settingsForPersistence,
        updateAndPersistSessions,
        setActiveSessionId,
        text: textToUse.trim(),
        files: enrichedFiles.length ? enrichedFiles : undefined,
        generationId,
        generationStartTime,
        editingMessageId: effectiveEditingId,
        shouldGenerateTitle: (session) => !activeSessionId || session?.title === 'New Chat',
        shouldLockKey,
        keyToLock: keyToUse,
        abortController: newAbortController,
        errorPrefix: 'Error',
        runMessageLifecycle,
        placement,
        userMessageOptions: {
          cumulativeTotalTokens: cumulativeTotalTokens > 0 ? cumulativeTotalTokens : undefined,
        },
        modelMessageOptions: {
          content: isRawMode ? '<thinking>' : '',
        },
        afterStart: (turn) => {
          userScrolledUpRef.current = false;
          sessionKeyMapRef.current.set(turn.finalSessionId, keyToUse);
          if (effectiveEditingId) {
            setEditingMessageId(null);
          }
        },
        execute: async (turn) => {
          await performApiCall({
            finalSessionId: turn.finalSessionId,
            generationId,
            generationStartTime,
            keyToUse,
            activeModelId: effectiveActiveModelId,
            promptParts,
            effectiveEditingId,
            isContinueMode,
            isRawMode,
            sessionToUpdate: settingsForApi,
            newAbortController,
            textToUse,
            enrichedFiles,
          });
        },
      });
    },
    [
      activeSessionId,
      appSettings,
      currentChatSettings,
      messages,
      performApiCall,
      runMessageLifecycle,
      setActiveSessionId,
      setEditingMessageId,
      sessionKeyMapRef,
      updateAndPersistSessions,
      userScrolledUpRef,
    ],
  );

  return { sendStandardMessage };
};
