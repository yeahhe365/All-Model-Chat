import React, { useCallback } from 'react';
import {
  AppSettings,
  ChatMessage,
  SavedChatSession,
  UploadedFile,
  ChatSettings as IndividualChatSettings,
} from '../../types';
import type { ImageOutputMode, ImagePersonGeneration } from '../../types/settings';
import { geminiServiceInstance } from '../../services/geminiService';
import { logService } from '../../services/logService';
import { buildContentParts, createChatHistoryForApi } from '../../utils/chat/builder';
import { generateUniqueId } from '../../utils/chat/ids';
import { createUploadedFileFromBase64 } from '../../utils/chat/parsing';
import { performOptimisticSessionUpdate, createMessage, generateSessionTitle } from '../../utils/chat/session';
import { shouldStripThinkingFromContext } from '../../utils/modelHelpers';
import { playCompletionSound } from '../../utils/uiUtils';
import { DEFAULT_CHAT_SETTINGS } from '../../constants/appConstants';
import type { Part } from '@google/genai';
import { appendApiPart } from '../chat-stream/processors';
import { useMessageLifecycle } from './useMessageLifecycle';

type SessionsUpdater = (updater: (prev: SavedChatSession[]) => SavedChatSession[]) => void;

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

interface ImageEditSenderProps {
  updateAndPersistSessions: SessionsUpdater;
  setSessionLoading: (sessionId: string, isLoading: boolean) => void;
  activeJobs: React.MutableRefObject<Map<string, AbortController>>;
  setActiveSessionId: (id: string | null) => void;
}

export const useImageEditSender = ({
  updateAndPersistSessions,
  setSessionLoading,
  activeJobs,
  setActiveSessionId,
}: ImageEditSenderProps) => {
  const { createLoadingModelMessage, runMessageLifecycle } = useMessageLifecycle({
    updateAndPersistSessions,
    setSessionLoading,
    activeJobs,
  });

  const handleImageEditMessage = useCallback(
    async (
      keyToUse: string,
      activeSessionId: string | null,
      messages: ChatMessage[],
      generationId: string,
      newAbortController: AbortController,
      appSettings: AppSettings,
      currentChatSettings: IndividualChatSettings,
      text: string,
      files: UploadedFile[],
      effectiveEditingId: string | null,
      aspectRatio: string,
      imageSize: string | undefined,
      imageOutputMode: ImageOutputMode,
      personGeneration: ImagePersonGeneration,
      options: { shouldLockKey?: boolean } = {},
    ) => {
      const modelMessageId = generationId;
      const imageFiles = files.filter((f) => f.type.startsWith('image/'));

      const finalSessionId = activeSessionId || generateUniqueId();

      const userMessage = createMessage('user', text, { files });
      const modelMessage = createLoadingModelMessage({
        id: modelMessageId,
        generationStartTime: new Date(),
      });

      let newTitle = undefined;
      if (!activeSessionId || (effectiveEditingId && messages.length === 0)) {
        // Set a temporary placeholder title based on content
        newTitle = generateSessionTitle([userMessage, modelMessage]);
      }

      updateAndPersistSessions((prev) =>
        performOptimisticSessionUpdate(prev, {
          activeSessionId,
          newSessionId: finalSessionId,
          newMessages: [userMessage, modelMessage],
          settings: { ...DEFAULT_CHAT_SETTINGS, ...appSettings, ...currentChatSettings },
          editingMessageId: effectiveEditingId,
          title: newTitle,
          shouldLockKey: options.shouldLockKey,
          keyToLock: keyToUse,
        }),
      );

      if (!activeSessionId) {
        setActiveSessionId(finalSessionId);
      }

      await runMessageLifecycle({
        sessionId: finalSessionId,
        generationId,
        abortController: newAbortController,
        modelMessageId,
        errorPrefix: 'Image Edit Error',
        execute: async () => {
          const { contentParts: promptParts } = await buildContentParts(text, imageFiles, currentChatSettings.modelId);
          const shouldStripThinking = shouldStripThinkingFromContext(
            currentChatSettings.modelId,
            currentChatSettings.hideThinkingInContext ?? appSettings.hideThinkingInContext,
          );

          // Note: messages here is current messages *before* update.
          // If editing, we need to slice it for context.
          let historyMessages = messages;
          if (effectiveEditingId) {
            const idx = messages.findIndex((m) => m.id === effectiveEditingId);
            if (idx !== -1) historyMessages = messages.slice(0, idx);
          }

          const historyForApi = await createChatHistoryForApi(
            historyMessages,
            shouldStripThinking,
            currentChatSettings.modelId,
          );

          const callApi = () =>
            geminiServiceInstance.editImage(
              keyToUse,
              currentChatSettings.modelId,
              historyForApi,
              promptParts,
              newAbortController.signal,
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

          if (newAbortController.signal.aborted) throw new Error('aborted');

          let combinedText = '';
          const combinedFiles: UploadedFile[] = [];
          let combinedApiParts: Part[] = [];
          let successfulImageCount = 0;

          results.forEach((result, index) => {
            const prefix = results.length > 1 ? `Image ${index + 1}: ` : '';

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
                combinedText += `${prefix}No image was generated for this request.\n\n`;
              }
            } else {
              logService.error(`Image edit API call failed for index ${index}`, { error: result.reason });
              combinedText += `${prefix}Request failed. Error: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}\n\n`;
            }
          });

          if (appSettings.generateQuadImages && successfulImageCount < 4 && successfulImageCount > 0) {
            const failureReason = combinedText.toLowerCase().includes('block')
              ? 'Some images may have been blocked due to safety policies.'
              : 'Some image requests may have failed.';
            combinedText += `\n*[Note: Only ${successfulImageCount} of 4 images were generated successfully. ${failureReason}]*`;
          } else if (successfulImageCount === 0 && combinedText.trim() === '') {
            combinedText = '[Error: Image generation failed with no specific message.]';
          }

          updateAndPersistSessions((p) =>
            p.map((s) =>
              s.id === finalSessionId
                ? {
                    ...s,
                    messages: s.messages.map((m) =>
                      m.id === modelMessageId
                        ? {
                            ...m,
                            isLoading: false,
                            content: combinedText.trim(),
                            files: combinedFiles,
                            apiParts: combinedApiParts,
                            generationEndTime: new Date(),
                          }
                        : m,
                    ),
                  }
                : s,
            ),
          );

          if (appSettings.isCompletionSoundEnabled) {
            playCompletionSound();
          }
        },
      });
    },
    [createLoadingModelMessage, runMessageLifecycle, updateAndPersistSessions, setActiveSessionId],
  );

  return { handleImageEditMessage };
};
