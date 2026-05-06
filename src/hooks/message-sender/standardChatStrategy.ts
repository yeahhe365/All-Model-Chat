import { logService } from '../../services/logService';
import { buildContentParts } from '../../utils/chat/builder';
import { getModelCapabilities } from '../../utils/modelHelpers';
import type { UploadedFile } from '../../types';
import { runOptimisticMessagePipeline } from './messagePipeline';
import { resolveStandardChatTurn } from './standardChatTurn';
import { performStandardChatApiCall } from './standardChatApiCall';
import type { GetStreamHandlers, StandardChatProps } from './types';
import type { PreparedModelRequest } from './useModelRequestRunner';

type MessageLifecycleRunner = Parameters<typeof runOptimisticMessagePipeline>[0]['runMessageLifecycle'];

interface SendStandardMessageParams {
  props: Omit<StandardChatProps, 'getStreamHandlers' | 'handleGenerateCanvas'>;
  getStreamHandlers: GetStreamHandlers;
  handleGenerateCanvas: (sourceMessageId: string, content: string) => Promise<void>;
  runMessageLifecycle: MessageLifecycleRunner;
  text: string;
  files: UploadedFile[];
  editingMessageId: string | null;
  activeModelId: string;
  isContinueMode?: boolean;
  isFastMode?: boolean;
  request: PreparedModelRequest;
}

export const sendStandardMessage = async ({
  props,
  getStreamHandlers,
  handleGenerateCanvas,
  runMessageLifecycle,
  text: textToUse,
  files: filesToUse,
  editingMessageId: effectiveEditingId,
  activeModelId,
  isContinueMode = false,
  isFastMode = false,
  request,
}: SendStandardMessageParams) => {
  const {
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
    updateAndPersistSessions,
    sessionKeyMapRef,
  } = props;
  const effectiveActiveModelId =
    appSettings.apiMode === 'openai-compatible' ? appSettings.openaiCompatibleModelId || activeModelId : activeModelId;
  const settingsForPersistence = { ...currentChatSettings };
  const settingsForApi = { ...currentChatSettings };

  if (isFastMode) {
    const isGemini3Flash = effectiveActiveModelId.includes('gemini-3') && effectiveActiveModelId.includes('flash');
    const targetLevel = isGemini3Flash ? 'MINIMAL' : 'LOW';

    settingsForApi.thinkingLevel = targetLevel;
    settingsForApi.thinkingBudget = 0;
    logService.info(`Fast Mode activated (One-off): Overriding thinking level to ${targetLevel}.`);
  }

  const { keyToUse, shouldLockKey, generationId, generationStartTime, abortController: newAbortController } = request;

  const successfullyProcessedFiles = filesToUse.filter(
    (file) => file.uploadState === 'active' && !file.error && !file.isProcessing,
  );
  const preferCodeExecutionFileInputs = !!settingsForApi.isCodeExecutionEnabled && !settingsForApi.isLocalPythonEnabled;

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
      await performStandardChatApiCall({
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
};
