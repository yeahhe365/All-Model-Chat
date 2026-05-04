import React, { useCallback } from 'react';
import { AppSettings, SavedChatSession, ChatSettings as IndividualChatSettings, UploadedFile } from '../../types';
import type { Part, UsageMetadata } from '@google/genai';
import { useApiErrorHandler } from './useApiErrorHandler';
import { logService } from '../../services/logService';
import { calculateTokenStats } from '../../utils/modelHelpers';
import { showNotification, playCompletionSound } from '../../utils/uiUtils';
import { finalizeMessages, appendApiPart } from '../chat-stream/processors';
import { streamingStore } from '../../services/streamingStore';
import { SUPPORTED_GENERATED_MIME_TYPES } from '../../constants/fileConstants';
import { buildExactPricingFromUsageMetadata } from '../../utils/usagePricingTelemetry';
import { resolveChatExactPricing } from '../../utils/chatPricingEvidence';
import { createUploadedFileFromBase64 } from '../../utils/chat/parsing';
import { updateMessageInSession, updateSessionById } from '../../utils/chat/sessionMutations';
import { isAudioMimeType, isImageMimeType, isVideoMimeType } from '../../utils/fileTypeUtils';

type SessionsUpdater = (
  updater: (prev: SavedChatSession[]) => SavedChatSession[],
  options?: { persist?: boolean },
) => void;

const mergeUniqueFiles = (existing: UploadedFile[] = [], incoming: UploadedFile[] = []) => {
  const files = [...existing];
  const seen = new Set(files.map((file) => file.id));

  for (const file of incoming) {
    if (!seen.has(file.id)) {
      files.push(file);
      seen.add(file.id);
    }
  }

  return files;
};

interface ChatStreamHandlerProps {
  appSettings: AppSettings;
  updateAndPersistSessions: SessionsUpdater;
  setSessionLoading: (sessionId: string, isLoading: boolean) => void;
  activeJobs: React.MutableRefObject<Map<string, AbortController>>;
}

export const useChatStreamHandler = ({
  appSettings,
  updateAndPersistSessions,
  setSessionLoading,
  activeJobs,
}: ChatStreamHandlerProps) => {
  const { handleApiError } = useApiErrorHandler(updateAndPersistSessions);

  const getStreamHandlers = useCallback(
    (
      currentSessionId: string,
      generationId: string,
      abortController: AbortController,
      generationStartTime: Date,
      currentChatSettings: IndividualChatSettings,
      requestParts: Part[] = [],
      onSuccess?: (generationId: string, finalContent: string) => void,
    ) => {
      const newModelMessageIds = new Set<string>([generationId]);
      let firstContentPartTime: Date | null = null;
      let firstTokenTime: Date | null = null; // Track first token (thought or content) for TTFT
      let accumulatedText = '';
      let accumulatedThoughts = '';
      let accumulatedApiParts: Part[] = [];
      let accumulatedGeneratedFiles: UploadedFile[] = [];

      // Reset store for this new generation
      streamingStore.clear(generationId);

      // Helper to record TTFT immediately on first activity
      const recordFirstToken = () => {
        if (!firstTokenTime) {
          firstTokenTime = new Date();
          const ttft = firstTokenTime.getTime() - generationStartTime.getTime();

          updateAndPersistSessions(
            (prev) => updateMessageInSession(prev, currentSessionId, generationId, { firstTokenTimeMs: ttft }),
            { persist: false },
          );
        }
      };

      const streamOnError = (error: Error) => {
        // Pass accumulated content so it can be saved even on error/abort
        handleApiError(error, currentSessionId, generationId, 'Error', accumulatedText, accumulatedThoughts);
        setSessionLoading(currentSessionId, false);
        activeJobs.current.delete(generationId);
        streamingStore.clear(generationId);
      };

      const streamOnComplete = (
        usageMetadata?: UsageMetadata,
        groundingMetadata?: unknown,
        urlContextMetadata?: unknown,
        generatedFiles?: UploadedFile[],
      ) => {
        const lang =
          appSettings.language === 'system'
            ? navigator.language.toLowerCase().startsWith('zh')
              ? 'zh'
              : 'en'
            : appSettings.language;

        if (appSettings.isStreamingEnabled && !firstContentPartTime) {
          firstContentPartTime = new Date();
        }

        if (usageMetadata) {
          const {
            promptTokens,
            cachedPromptTokens,
            completionTokens,
            thoughtTokens,
            toolUsePromptTokens,
            totalTokens,
          } = calculateTokenStats(usageMetadata);
          const exactPricing = resolveChatExactPricing({
            providerExactPricing: buildExactPricingFromUsageMetadata('chat', usageMetadata),
            requestParts,
            responseParts: accumulatedApiParts,
            promptTokens,
            cachedPromptTokens,
            toolUsePromptTokens,
            outputTokens: completionTokens + thoughtTokens,
          });
          logService.recordTokenUsage(
            currentChatSettings.modelId,
            {
              promptTokens,
              cachedPromptTokens,
              completionTokens,
              thoughtTokens,
              toolUsePromptTokens,
              totalTokens,
            },
            exactPricing,
          );
        }

        // Perform the Final Update to State (and DB)
        updateAndPersistSessions(
          (prev) =>
            updateSessionById(prev, currentSessionId, (sessionToUpdate) => {
              const updatedMessages = sessionToUpdate.messages.map((msg) => {
                if (msg.id === generationId) {
                  return {
                    ...msg,
                    content: (msg.content || '') + accumulatedText,
                    thoughts: (msg.thoughts || '') + accumulatedThoughts,
                    files: [...accumulatedGeneratedFiles, ...(generatedFiles || [])].length
                      ? mergeUniqueFiles(msg.files, [...accumulatedGeneratedFiles, ...(generatedFiles || [])])
                      : msg.files,
                    apiParts: msg.apiParts ? [...msg.apiParts, ...accumulatedApiParts] : accumulatedApiParts,
                  };
                }
                return msg;
              });

              // Finalize (mark loading false, set stats)
              const finalizationResult = finalizeMessages(
                updatedMessages,
                generationStartTime,
                newModelMessageIds,
                currentChatSettings,
                lang,
                firstContentPartTime,
                usageMetadata,
                groundingMetadata,
                urlContextMetadata,
                abortController.signal.aborted,
              );

              if (finalizationResult.completedMessageForNotification) {
                if (appSettings.isCompletionSoundEnabled) {
                  playCompletionSound();
                }
                if (appSettings.isCompletionNotificationEnabled && document.hidden) {
                  const msg = finalizationResult.completedMessageForNotification;
                  const notificationBody =
                    (msg.content || 'Media or tool response received').substring(0, 150) +
                    (msg.content && msg.content.length > 150 ? '...' : '');
                  void import('../../constants/assets').then(({ APP_LOGO_SVG_DATA_URI }) => {
                    showNotification('Response Ready', {
                      body: notificationBody,
                      icon: APP_LOGO_SVG_DATA_URI,
                    });
                  });
                }
              }

              return {
                ...sessionToUpdate,
                messages: finalizationResult.updatedMessages,
              };
            }),
          { persist: true },
        );

        setSessionLoading(currentSessionId, false);
        activeJobs.current.delete(generationId);
        streamingStore.clear(generationId);

        if (onSuccess && !abortController.signal.aborted) {
          setTimeout(() => onSuccess(generationId, accumulatedText), 0);
        }
      };

      const streamOnPart = (part: Part) => {
        recordFirstToken(); // Capture TTFT

        accumulatedApiParts = appendApiPart(accumulatedApiParts, part);

        const anyPart = part as Part & {
          text?: string;
          executableCode?: { language: string; code: string };
          codeExecutionResult?: { outcome: string; output?: string };
          inlineData?: { mimeType: string; data?: string };
        };

        // 1. Accumulate plain text
        if (anyPart.text) {
          const chunkText = anyPart.text;
          accumulatedText += chunkText;
          streamingStore.updateContent(generationId, chunkText);
        }

        // 2. Handle Tools / Code (Convert to text representation for the store)
        if (anyPart.executableCode) {
          const codePart = anyPart.executableCode as { language: string; code: string };
          const toolContent = `\n\n\`\`\`${codePart.language.toLowerCase() || 'python'}\n${codePart.code}\n\`\`\`\n\n`;
          accumulatedText += toolContent;
          streamingStore.updateContent(generationId, toolContent);
        } else if (anyPart.codeExecutionResult) {
          const resultPart = anyPart.codeExecutionResult as { outcome: string; output?: string };
          const escapeHtml = (unsafe: string) => {
            if (typeof unsafe !== 'string') return '';
            return unsafe
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
          };
          let toolContent = `\n\n<div class="tool-result outcome-${resultPart.outcome.toLowerCase()}"><strong>Execution Result (${resultPart.outcome}):</strong>`;
          if (resultPart.output) {
            toolContent += `<pre><code class="language-text">${escapeHtml(resultPart.output)}</code></pre>`;
          }
          toolContent += '</div>\n\n';
          accumulatedText += toolContent;
          streamingStore.updateContent(generationId, toolContent);
        } else if (anyPart.inlineData) {
          const { mimeType, data } = anyPart.inlineData;

          const isSupportedFile =
            isImageMimeType(mimeType) ||
            isAudioMimeType(mimeType) ||
            isVideoMimeType(mimeType) ||
            SUPPORTED_GENERATED_MIME_TYPES.has(mimeType);

          if (isSupportedFile) {
            const generatedFile = data
              ? createUploadedFileFromBase64(
                  data,
                  mimeType,
                  isImageMimeType(mimeType) ? `generated-plot-${Date.now()}` : 'generated-file',
                )
              : undefined;

            if (generatedFile) {
              accumulatedGeneratedFiles = [...accumulatedGeneratedFiles, generatedFile];
            }

            // Save to files array instead of hardcoding base64 into text to prevent critical performance issues
            updateAndPersistSessions(
              (prev) =>
                generatedFile
                  ? updateMessageInSession(prev, currentSessionId, generationId, (message) => ({
                      ...message,
                      files: mergeUniqueFiles(message.files, [generatedFile]),
                    }))
                  : prev,
              { persist: false },
            );
          }
        }

        const hasMeaningfulContent =
          (anyPart.text && anyPart.text.trim().length > 0) ||
          anyPart.executableCode ||
          anyPart.codeExecutionResult ||
          anyPart.inlineData;

        if (appSettings.isStreamingEnabled && !firstContentPartTime && hasMeaningfulContent) {
          firstContentPartTime = new Date();
        }
      };

      const onThoughtChunk = (thoughtChunk: string) => {
        recordFirstToken(); // Capture TTFT (thoughts usually come first)

        accumulatedThoughts += thoughtChunk;
        streamingStore.updateThoughts(generationId, thoughtChunk);
      };

      return { streamOnError, streamOnComplete, streamOnPart, onThoughtChunk };
    },
    [
      appSettings.isStreamingEnabled,
      appSettings.isCompletionNotificationEnabled,
      appSettings.isCompletionSoundEnabled,
      appSettings.language,
      updateAndPersistSessions,
      handleApiError,
      setSessionLoading,
      activeJobs,
    ],
  );

  return { getStreamHandlers };
};
