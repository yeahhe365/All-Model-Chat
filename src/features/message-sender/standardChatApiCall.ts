import { createChatHistoryForApi } from '@/utils/chat/builder';
import { createMessage } from '@/utils/chat/session';
import { isGemini3Model, isImageModel, shouldStripThinkingFromContext } from '@/utils/modelHelpers';
import { appendFunctionDeclarationsToTools, buildGenerationConfig } from '@/services/api/generationConfig';
import {
  generateContentTurnApi,
  sendStatelessMessageNonStreamApi,
  sendStatelessMessageStreamApi,
} from '@/services/api/chatApi';
import {
  sendOpenAICompatibleMessageNonStream,
  sendOpenAICompatibleMessageStream,
} from '@/services/api/openaiCompatibleApi';
import { createStandardClientFunctions } from '@/features/standard-chat/standardClientFunctions';
import { runStandardToolLoop } from '@/features/standard-chat/standardToolLoop';
import { collectLocalPythonInputFiles } from '@/features/local-python/helpers';
import { getPyodideService } from '@/features/local-python/loadPyodideService';
import { updateSessionById } from '@/utils/chat/sessionMutations';
import type {
  ChatMessage,
  ChatSettings as IndividualChatSettings,
  NonStreamMessageCompleteHandler,
  UploadedFile,
} from '@/types';
import type { ContentPart } from '@/types/chat';
import type { GetStreamHandlers, SessionsUpdater, StandardChatProps, StreamHandlerFunctions } from './types';
import type { resolveStandardChatTurn } from './standardChatTurn';
import { isOpenAICompatibleApiActive } from '@/utils/openaiCompatibleMode';

interface StandardChatApiCallContext {
  appSettings: StandardChatProps['appSettings'];
  messages: ChatMessage[];
  updateAndPersistSessions: SessionsUpdater;
  getStreamHandlers: GetStreamHandlers;
  aspectRatio: string;
  imageSize?: string;
  imageOutputMode: StandardChatProps['imageOutputMode'];
  personGeneration: StandardChatProps['personGeneration'];
  resolveTurn: typeof resolveStandardChatTurn;
}

interface PerformStandardChatApiCallParams extends StandardChatApiCallContext {
  finalSessionId: string;
  generationId: string;
  generationStartTime: Date;
  keyToUse: string;
  activeModelId: string;
  promptParts: ContentPart[];
  effectiveEditingId: string | null;
  isContinueMode: boolean;
  isRawMode: boolean;
  sessionToUpdate: IndividualChatSettings;
  newAbortController: AbortController;
  textToUse: string;
  enrichedFiles: UploadedFile[];
}

const routeThrownStreamError = async (run: () => Promise<void>, streamOnError: (error: Error) => void) => {
  try {
    await run();
  } catch (error) {
    streamOnError(error instanceof Error ? error : new Error(String(error)));
  }
};

const createNonStreamCompleteHandler =
  ({
    streamOnPart,
    onThoughtChunk,
    streamOnComplete,
  }: Pick<
    StreamHandlerFunctions,
    'streamOnPart' | 'onThoughtChunk' | 'streamOnComplete'
  >): NonStreamMessageCompleteHandler =>
  (parts, thoughts, usage, grounding, urlContext) => {
    for (const part of parts) {
      streamOnPart(part);
    }
    if (thoughts) {
      onThoughtChunk(thoughts);
    }
    streamOnComplete(usage, grounding, urlContext);
  };

export const performStandardChatApiCall = async ({
  appSettings,
  messages,
  updateAndPersistSessions,
  getStreamHandlers,
  aspectRatio,
  imageSize,
  imageOutputMode,
  personGeneration,
  resolveTurn,
  finalSessionId,
  generationId,
  generationStartTime,
  keyToUse,
  activeModelId,
  promptParts,
  effectiveEditingId,
  isContinueMode,
  isRawMode,
  sessionToUpdate,
  newAbortController,
  textToUse,
  enrichedFiles,
}: PerformStandardChatApiCallParams) => {
  const isOpenAICompatibleMode = isOpenAICompatibleApiActive(appSettings);
  const apiModelId = isOpenAICompatibleMode ? appSettings.openaiCompatibleModelId : activeModelId;
  const { baseMessagesForApi, finalRole, finalParts, shouldSkipApiCall } = resolveTurn({
    messages,
    promptParts,
    textToUse,
    enrichedFiles,
    effectiveEditingId,
    isContinueMode,
    isRawMode,
    apiModelId,
  });

  if (shouldSkipApiCall) {
    return;
  }

  const shouldStripThinking = shouldStripThinkingFromContext(
    apiModelId,
    sessionToUpdate.hideThinkingInContext ?? appSettings.hideThinkingInContext,
  );
  const historyForChat = await createChatHistoryForApi(
    baseMessagesForApi,
    shouldStripThinking,
    apiModelId,
    !!sessionToUpdate.isCodeExecutionEnabled && !sessionToUpdate.isLocalPythonEnabled,
  );

  const { streamOnError, streamOnComplete, streamOnPart, onThoughtChunk } = getStreamHandlers(
    finalSessionId,
    generationId,
    newAbortController,
    generationStartTime,
    sessionToUpdate,
    finalParts,
  );
  const nonStreamOnComplete = createNonStreamCompleteHandler({
    streamOnPart,
    onThoughtChunk,
    streamOnComplete,
  });

  if (isOpenAICompatibleMode) {
    const openAICompatibleConfig = {
      baseUrl: appSettings.openaiCompatibleBaseUrl,
      systemInstruction: sessionToUpdate.systemInstruction,
      temperature: sessionToUpdate.temperature,
      topP: sessionToUpdate.topP,
    };

    if (appSettings.isStreamingEnabled) {
      await routeThrownStreamError(
        () =>
          sendOpenAICompatibleMessageStream(
            keyToUse,
            apiModelId,
            historyForChat,
            finalParts,
            openAICompatibleConfig,
            newAbortController.signal,
            streamOnPart,
            onThoughtChunk,
            streamOnError,
            streamOnComplete,
            finalRole,
          ),
        streamOnError,
      );
      return;
    }

    await routeThrownStreamError(
      () =>
        sendOpenAICompatibleMessageNonStream(
          keyToUse,
          apiModelId,
          historyForChat,
          finalParts,
          openAICompatibleConfig,
          newAbortController.signal,
          streamOnError,
          nonStreamOnComplete,
          finalRole,
        ),
      streamOnError,
    );
    return;
  }

  const localPythonContextMessages =
    finalRole === 'user'
      ? [
          ...baseMessagesForApi,
          {
            id: 'temp-standard-user',
            role: 'user' as const,
            content: textToUse.trim(),
            files: enrichedFiles,
            timestamp: new Date(),
          },
        ]
      : baseMessagesForApi;
  const standardClientFunctions = createStandardClientFunctions({
    isLocalPythonEnabled:
      !!sessionToUpdate.isLocalPythonEnabled && finalRole === 'user' && !isRawMode && !isImageModel(apiModelId),
    inputFiles: collectLocalPythonInputFiles(
      [
        ...localPythonContextMessages,
        {
          id: 'temp-standard-tool-target',
          role: 'model',
          content: '',
          timestamp: new Date(),
        },
      ],
      'temp-standard-tool-target',
    ),
    runPython: async (code, options) => {
      const pyodideService = await getPyodideService();
      return pyodideService.runPython(code, options);
    },
  });
  const standardFunctionDeclarations = Object.values(standardClientFunctions).map(({ declaration }) => declaration);
  const hasRequestedServerSideToolThatNeedsCombination =
    !!sessionToUpdate.isGoogleSearchEnabled ||
    !!sessionToUpdate.isDeepSearchEnabled ||
    !!sessionToUpdate.isUrlContextEnabled;
  const isLocalPythonEnabledForTurn =
    standardFunctionDeclarations.length > 0 &&
    (isGemini3Model(apiModelId) || !hasRequestedServerSideToolThatNeedsCombination);

  const config = await buildGenerationConfig({
    settings: sessionToUpdate,
    modelId: apiModelId,
    aspectRatio,
    imageSize,
    isLocalPythonEnabled: isLocalPythonEnabledForTurn,
    imageOutputMode,
    personGeneration,
  });

  const requestConfig = appendFunctionDeclarationsToTools(
    apiModelId,
    config,
    isLocalPythonEnabledForTurn ? standardFunctionDeclarations : [],
  );
  const hasFunctionDeclarationsInRequest = !!requestConfig.tools?.some((tool) => 'functionDeclarations' in tool);

  if (hasFunctionDeclarationsInRequest) {
    try {
      const toolLoopResult = await runStandardToolLoop({
        initialContents: [...historyForChat, { role: finalRole, parts: finalParts }],
        clientFunctions: standardClientFunctions,
        abortSignal: newAbortController.signal,
        runTurn: (contents) =>
          generateContentTurnApi(keyToUse, apiModelId, contents, requestConfig, newAbortController.signal),
      });

      if (toolLoopResult.toolMessages.length > 0) {
        const internalMessages = toolLoopResult.toolMessages.flatMap(({ modelContent, functionResponseParts }) => [
          createMessage('model', '', {
            apiParts: modelContent.parts,
            isInternalToolMessage: true,
            toolParentMessageId: generationId,
          }),
          createMessage('user', '', {
            apiParts: functionResponseParts,
            isInternalToolMessage: true,
            toolParentMessageId: generationId,
          }),
        ]);

        updateAndPersistSessions(
          (prev) =>
            updateSessionById(prev, finalSessionId, (session) => ({
              ...session,
              messages: session.messages.flatMap((message) => {
                if (message.id !== generationId) {
                  return [message];
                }

                return [
                  ...internalMessages,
                  {
                    ...message,
                  },
                ];
              }),
            })),
          { persist: false },
        );
      }

      for (const part of toolLoopResult.finalTurn.parts) {
        streamOnPart(part);
      }
      if (toolLoopResult.finalTurn.thoughts) {
        onThoughtChunk(toolLoopResult.finalTurn.thoughts);
      }
      streamOnComplete(
        toolLoopResult.finalTurn.usage,
        toolLoopResult.finalTurn.grounding,
        toolLoopResult.finalTurn.urlContext,
        toolLoopResult.generatedFiles,
      );
    } catch (error) {
      streamOnError(error instanceof Error ? error : new Error(String(error)));
    }
    return;
  }

  if (appSettings.isStreamingEnabled) {
    await routeThrownStreamError(
      () =>
        sendStatelessMessageStreamApi(
          keyToUse,
          apiModelId,
          historyForChat,
          finalParts,
          requestConfig,
          newAbortController.signal,
          streamOnPart,
          onThoughtChunk,
          streamOnError,
          streamOnComplete,
          finalRole,
        ),
      streamOnError,
    );
    return;
  }

  await routeThrownStreamError(
    () =>
      sendStatelessMessageNonStreamApi(
        keyToUse,
        apiModelId,
        historyForChat,
        finalParts,
        requestConfig,
        newAbortController.signal,
        streamOnError,
        nonStreamOnComplete,
        finalRole,
      ),
    streamOnError,
  );
};
