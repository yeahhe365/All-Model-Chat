import { useCallback } from 'react';
import { logService } from '../../services/logService';
import { getKeyForRequest } from '../../utils/apiUtils';
import { buildContentParts } from '../../utils/chat/builder';
import { generateUniqueId } from '../../utils/chat/ids';
import { performOptimisticSessionUpdate } from '../../utils/chat/session';
import { getModelCapabilities } from '../../utils/modelHelpers';
import { DEFAULT_CHAT_SETTINGS } from '../../constants/appConstants';
import type { ChatMessage, UploadedFile } from '../../types';
import { StandardChatProps } from './types';
import { useStandardChatSession } from './useStandardChatSession';
import { useStandardChatApiCall } from './useStandardChatApiCall';
import { resolveStandardChatTurn } from './standardChatTurn';

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
  const { updateSessionState } = useStandardChatSession({
    appSettings,
    activeSessionId,
    setActiveSessionId,
    setEditingMessageId,
    updateAndPersistSessions,
    sessionKeyMapRef,
  });

  const { performApiCall } = useStandardChatApiCall({
    appSettings,
    messages,
    activeJobs,
    setSessionLoading,
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
    async (
      textToUse: string,
      filesToUse: UploadedFile[],
      effectiveEditingId: string | null,
      activeModelId: string,
      isContinueMode = false,
      isFastMode = false,
    ) => {
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

      const keyResult = getKeyForRequest(appSettings, settingsForApi);
      if ('error' in keyResult) {
        logService.error('Send message failed: API Key not configured.');
        const errorMessage: ChatMessage = {
          id: generateUniqueId(),
          role: 'error',
          content: keyResult.error,
          timestamp: new Date(),
        };
        const newSessionId = generateUniqueId();

        updateAndPersistSessions((prev) =>
          performOptimisticSessionUpdate(prev, {
            activeSessionId: null,
            newSessionId,
            newMessages: [errorMessage],
            settings: { ...DEFAULT_CHAT_SETTINGS, ...appSettings },
            title: 'API Key Error',
          }),
        );
        setActiveSessionId(newSessionId);
        return;
      }

      const { key: keyToUse, isNewKey } = keyResult;
      const shouldLockKey = isNewKey && filesToUse.some((file) => file.fileUri && file.uploadState === 'active');
      const newAbortController = new AbortController();

      let generationId: string;
      let generationStartTime: Date;
      if (isContinueMode && effectiveEditingId) {
        generationId = effectiveEditingId;
        const targetMessage = messages.find((message) => message.id === effectiveEditingId);
        generationStartTime = targetMessage?.generationStartTime || new Date();
      } else {
        generationId = generateUniqueId();
        generationStartTime = new Date();
      }

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

      const finalSessionId = activeSessionId || generateUniqueId();
      const isRawMode = Boolean(
        (settingsForApi.isRawModeEnabled ?? appSettings.isRawModeEnabled) &&
        !isContinueMode &&
        getModelCapabilities(effectiveActiveModelId).supportsRawReasoningPrefill,
      );

      updateSessionState({
        finalSessionId,
        textToUse,
        enrichedFiles,
        effectiveEditingId,
        generationId,
        generationStartTime,
        isContinueMode,
        isRawMode,
        sessionToUpdate: settingsForPersistence,
        keyToUse,
        shouldLockKey,
      });

      userScrolledUpRef.current = false;

      await performApiCall({
        finalSessionId,
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
    [
      activeSessionId,
      appSettings,
      currentChatSettings,
      messages,
      performApiCall,
      setActiveSessionId,
      updateAndPersistSessions,
      updateSessionState,
      userScrolledUpRef,
    ],
  );

  return { sendStandardMessage };
};
