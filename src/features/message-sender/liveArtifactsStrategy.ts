import { getGeminiKeyForRequest } from '@/utils/apiUtils';
import { generateUniqueId } from '@/utils/chat/ids';
import { getTranslator } from '@/i18n/translations';
import { sendStatelessMessageStreamApi } from '@/services/api/chatApi';
import { DEFAULT_LIVE_ARTIFACTS_MODEL_ID } from '@/constants/appConstants';
import { buildGenerationConfig } from '@/services/api/generationConfig';
import { loadLiveArtifactsSystemPrompt } from '@/constants/promptHelpers';
import { runOptimisticMessagePipeline } from './messagePipeline';
import { buildLiveArtifactsRequestParts, coerceLiveArtifactsOutput } from './liveArtifactsContracts';
import type { LiveArtifactsGeneratorProps, GetStreamHandlers } from './types';

type MessageLifecycleRunner = Parameters<typeof runOptimisticMessagePipeline>[0]['runMessageLifecycle'];

interface GenerateLiveArtifactsParams extends Omit<
  LiveArtifactsGeneratorProps,
  'messages' | 'getStreamHandlers' | 'activeJobs' | 'setSessionLoading'
> {
  getStreamHandlers: GetStreamHandlers;
  runMessageLifecycle: MessageLifecycleRunner;
  sourceMessageId: string;
  content: string;
}

export const generateLiveArtifactsMessage = async ({
  appSettings,
  currentChatSettings,
  activeSessionId,
  updateAndPersistSessions,
  getStreamHandlers,
  setAppFileError,
  aspectRatio,
  language,
  runMessageLifecycle,
  sourceMessageId,
  content,
}: GenerateLiveArtifactsParams) => {
  if (!activeSessionId) return;

  const keyResult = getGeminiKeyForRequest(appSettings, currentChatSettings, { skipIncrement: true });
  if ('error' in keyResult) {
    setAppFileError(keyResult.error);
    return;
  }
  const { key: keyToUse } = keyResult;

  const generationId = generateUniqueId();
  const generationStartTime = new Date();
  const abortController = new AbortController();

  const liveArtifactsModelId = appSettings.autoLiveArtifactsModelId || DEFAULT_LIVE_ARTIFACTS_MODEL_ID;
  const liveArtifactsThinkingLevel = 'HIGH';

  const liveArtifactsSettings = {
    ...currentChatSettings,
    modelId: liveArtifactsModelId,
    thinkingLevel: liveArtifactsThinkingLevel as 'HIGH',
    thinkingBudget: 0,
    showThoughts: true,
  };

  await runOptimisticMessagePipeline({
    activeSessionId,
    appSettings,
    currentChatSettings: liveArtifactsSettings,
    updateAndPersistSessions,
    setActiveSessionId: () => undefined,
    text: '',
    generationId,
    generationStartTime,
    abortController,
    errorPrefix: 'Live Artifacts Error',
    runMessageLifecycle,
    placement: {
      type: 'insert-model-after',
      sourceMessageId,
    },
    modelMessageOptions: {
      excludeFromContext: true,
    },
    execute: async () => {
      const liveArtifactsSystemPrompt =
        appSettings.liveArtifactsSystemPrompt?.trim() ||
        (await loadLiveArtifactsSystemPrompt(language, appSettings.liveArtifactsPromptMode ?? 'inline'));
      const liveArtifactsPromptMode = appSettings.liveArtifactsPromptMode ?? 'inline';
      const t = getTranslator(language);
      const promptInstruction = t('suggestion_html_desc');
      const requestParts = buildLiveArtifactsRequestParts({
        promptInstruction,
        sourceContent: content,
        language,
        promptMode: liveArtifactsPromptMode,
      });
      const { streamOnError, streamOnComplete, streamOnPart, onThoughtChunk } = getStreamHandlers(
        activeSessionId,
        generationId,
        abortController,
        generationStartTime,
        liveArtifactsSettings,
        requestParts,
        undefined,
        (finalContent) => coerceLiveArtifactsOutput(finalContent, language, liveArtifactsPromptMode),
      );

      const config = await buildGenerationConfig({
        settings: {
          ...liveArtifactsSettings,
          systemInstruction: liveArtifactsSystemPrompt,
          temperature: 0.7,
          topP: 0.95,
          isGoogleSearchEnabled: false,
          isCodeExecutionEnabled: false,
          isUrlContextEnabled: false,
          isDeepSearchEnabled: false,
          isLocalPythonEnabled: false,
        },
        aspectRatio,
        isLocalPythonEnabled: false,
      });

      try {
        await sendStatelessMessageStreamApi(
          keyToUse,
          liveArtifactsModelId,
          [],
          requestParts,
          config,
          abortController.signal,
          streamOnPart,
          onThoughtChunk,
          streamOnError,
          streamOnComplete,
        );
      } catch (error) {
        streamOnError(error instanceof Error ? error : new Error(String(error)));
      }
    },
  });
};
