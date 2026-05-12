import type { Part } from '@google/genai';
import type { AppSettings, ChatMessage, ChatSettings as IndividualChatSettings, UploadedFile } from '@/types';
import type { ImageOutputMode, ImagePersonGeneration } from '@/types/settings';
import { editImageApi } from '@/services/api/generation/imageEditApi';
import { logService } from '@/services/logService';
import { buildContentParts, createChatHistoryForApi } from '@/utils/chat/builder';
import { createUploadedFileFromBase64 } from '@/utils/chat/parsing';
import { shouldStripThinkingFromContext } from '@/utils/modelHelpers';
import { isImageMimeType } from '@/utils/fileTypeUtils';
import { appendApiPart } from '@/features/chat-streaming/processors';
import { formatMessageSenderText } from './i18nFormat';
import { runOptimisticMessagePipeline } from './messagePipeline';
import type { MessageSenderTranslator, SessionsUpdater } from './types';

type MessageLifecycleRunner = Parameters<typeof runOptimisticMessagePipeline>[0]['runMessageLifecycle'];

const stripGeneratedInlinePayload = (part: Part): Part => {
  const inlineData = (part as Part & { inlineData?: { mimeType?: string; data?: string } }).inlineData;
  if (!inlineData?.data) return part;

  return {
    ...part,
    inlineData: {
      ...inlineData,
      data: '',
    },
  } as Part;
};

interface SendImageEditMessageParams {
  keyToUse: string;
  activeSessionId: string | null;
  messages: ChatMessage[];
  generationId: string;
  abortController: AbortController;
  appSettings: AppSettings;
  currentChatSettings: IndividualChatSettings;
  text: string;
  files: UploadedFile[];
  editingMessageId: string | null;
  aspectRatio: string;
  imageSize: string | undefined;
  imageOutputMode: ImageOutputMode;
  personGeneration: ImagePersonGeneration;
  shouldLockKey?: boolean;
  updateAndPersistSessions: SessionsUpdater;
  setActiveSessionId: (id: string | null) => void;
  runMessageLifecycle: MessageLifecycleRunner;
  t: MessageSenderTranslator;
}

export const sendImageEditMessage = async ({
  keyToUse,
  activeSessionId,
  messages,
  generationId,
  abortController,
  appSettings,
  currentChatSettings,
  text,
  files,
  editingMessageId,
  aspectRatio,
  imageSize,
  imageOutputMode,
  personGeneration,
  shouldLockKey,
  updateAndPersistSessions,
  setActiveSessionId,
  runMessageLifecycle,
  t,
}: SendImageEditMessageParams) => {
  const imageFiles = files.filter((file) => isImageMimeType(file.type));

  await runOptimisticMessagePipeline({
    activeSessionId,
    appSettings,
    currentChatSettings,
    updateAndPersistSessions,
    setActiveSessionId,
    text,
    files,
    generationId,
    editingMessageId,
    shouldGenerateTitle: !activeSessionId || (!!editingMessageId && messages.length === 0),
    shouldLockKey,
    keyToLock: keyToUse,
    abortController,
    errorPrefix: t('messageSender_imageEditErrorPrefix'),
    runMessageLifecycle,
    execute: async () => {
      const { contentParts: promptParts } = await buildContentParts(text, imageFiles, currentChatSettings.modelId);
      const shouldStripThinking = shouldStripThinkingFromContext(
        currentChatSettings.modelId,
        currentChatSettings.hideThinkingInContext ?? appSettings.hideThinkingInContext,
      );

      let historyMessages = messages;
      if (editingMessageId) {
        const index = messages.findIndex((message) => message.id === editingMessageId);
        if (index !== -1) historyMessages = messages.slice(0, index);
      }

      const historyForApi = await createChatHistoryForApi(
        historyMessages,
        shouldStripThinking,
        currentChatSettings.modelId,
      );

      const callApi = () =>
        editImageApi(
          keyToUse,
          currentChatSettings.modelId,
          historyForApi,
          promptParts,
          abortController.signal,
          aspectRatio,
          imageSize,
          {
            systemInstruction: currentChatSettings.systemInstruction,
            showThoughts: currentChatSettings.showThoughts,
            thinkingBudget: currentChatSettings.thinkingBudget,
            thinkingLevel: currentChatSettings.thinkingLevel,
            isGoogleSearchEnabled: !!currentChatSettings.isGoogleSearchEnabled,
            isDeepSearchEnabled: !!currentChatSettings.isDeepSearchEnabled,
            safetySettings: currentChatSettings.safetySettings,
            imageOutputMode,
            personGeneration,
          },
        );

      const apiCalls = appSettings.generateQuadImages ? [callApi(), callApi(), callApi(), callApi()] : [callApi()];
      const results = await Promise.allSettled(apiCalls);

      if (abortController.signal.aborted) throw new Error('aborted');

      let combinedText = '';
      const combinedFiles: UploadedFile[] = [];
      let combinedApiParts: Part[] = [];
      let successfulImageCount = 0;

      results.forEach((result, index) => {
        const prefix =
          results.length > 1
            ? formatMessageSenderText(t('messageSender_imageEditResultPrefix'), { index: index + 1 })
            : '';

        if (result.status === 'fulfilled') {
          const parts: Part[] = result.value;
          combinedApiParts = parts.reduce<Part[]>(
            (acc, part) => appendApiPart(acc, stripGeneratedInlinePayload(part)),
            combinedApiParts,
          );
          let hasImagePart = false;
          let textPartContent = '';

          parts.forEach((part) => {
            if (part.text) {
              textPartContent += part.text;
            } else if (part.inlineData) {
              const { mimeType, data } = part.inlineData;
              if (mimeType && data) {
                hasImagePart = true;
                successfulImageCount++;
                const newFile = createUploadedFileFromBase64(data, mimeType, `edited-image-${index + 1}`);
                combinedFiles.push(newFile);
              }
            }
          });

          if (textPartContent.trim()) {
            combinedText += `${prefix}${textPartContent.trim()}\n\n`;
          } else if (!hasImagePart && results.length > 1) {
            combinedText += `${prefix}${t('messageSender_imageEditNoImageGenerated')}\n\n`;
          }
        } else {
          logService.error(`Image edit API call failed for index ${index}`, { error: result.reason });
          combinedText += `${prefix}${formatMessageSenderText(t('messageSender_imageEditRequestFailed'), {
            message: result.reason instanceof Error ? result.reason.message : String(result.reason),
          })}\n\n`;
        }
      });

      if (appSettings.generateQuadImages && successfulImageCount < 4 && successfulImageCount > 0) {
        const failureReason = combinedText.toLowerCase().includes('block')
          ? t('messageSender_imageEditSafetyFailure')
          : t('messageSender_imageEditPartialFailure');
        combinedText += `\n${formatMessageSenderText(t('messageSender_imageEditPartialNote'), {
          count: successfulImageCount,
          reason: failureReason,
        })}`;
      } else if (successfulImageCount === 0 && combinedText.trim() === '') {
        combinedText = t('messageSender_imageEditEmptyFailure');
      }

      return {
        patch: {
          isLoading: false,
          content: combinedText.trim(),
          files: combinedFiles,
          apiParts: combinedApiParts,
          generationEndTime: new Date(),
        },
      };
    },
  });
};
