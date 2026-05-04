import { useCallback } from 'react';
import { logService } from '../../services/logService';
import { buildContentParts } from '../../utils/chat/builder';
import { generateUniqueId } from '../../utils/chat/ids';
import { getModelCapabilities } from '../../utils/modelHelpers';
import type { UploadedFile } from '../../types';
import { StandardChatProps } from './types';
import { useStandardChatSession } from './useStandardChatSession';
import { useStandardChatApiCall } from './useStandardChatApiCall';
import { resolveStandardChatTurn } from './standardChatTurn';
import type { PreparedModelRequest } from './useModelRequestRunner';

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
    [activeSessionId, appSettings, currentChatSettings, performApiCall, updateSessionState, userScrolledUpRef],
  );

  return { sendStandardMessage };
};
