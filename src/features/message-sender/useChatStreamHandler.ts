import React, { useCallback } from 'react';
import { AppSettings, SavedChatSession, ChatSettings as IndividualChatSettings, UploadedFile } from '../../types';
import type { Part, UsageMetadata } from '@google/genai';
import { useApiErrorHandler } from './useApiErrorHandler';
import { logService } from '../../services/logService';
import { calculateTokenStats } from '../../utils/modelHelpers';
import { showNotification, playCompletionSound } from '../../utils/uiUtils';
import { finalizeMessages } from '@/features/chat-streaming/processors';
import { streamingStore } from '../../services/streamingStore';
import { buildExactPricingFromUsageMetadata } from '../../utils/usagePricingTelemetry';
import { resolveChatExactPricing } from '../../utils/chatPricingEvidence';
import { updateMessageInSession, updateSessionById } from '../../utils/chat/sessionMutations';
import {
  createMessageStreamState,
  getContentDeltaFromPart,
  mergeUniqueFiles,
  reduceMessageStreamEvent,
} from '@/features/chat-streaming/messageStreamReducer';

type SessionsUpdater = (
  updater: (prev: SavedChatSession[]) => SavedChatSession[],
  options?: { persist?: boolean },
) => void;

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
      let streamState = createMessageStreamState({ generationId, generationStartTime });

      // Reset store for this new generation
      streamingStore.clear(generationId);

      const syncFirstTokenTime = (previousFirstTokenTimeMs?: number) => {
        if (previousFirstTokenTimeMs === undefined && streamState.firstTokenTimeMs !== undefined) {
          updateAndPersistSessions(
            (prev) =>
              updateMessageInSession(prev, currentSessionId, generationId, {
                firstTokenTimeMs: streamState.firstTokenTimeMs,
              }),
            { persist: false },
          );
        }
      };

      const streamOnError = (error: Error) => {
        // Pass accumulated content so it can be saved even on error/abort
        handleApiError(error, currentSessionId, generationId, 'Error', streamState.content, streamState.thoughts);
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

        streamState = reduceMessageStreamEvent(streamState, {
          type: 'complete',
          usage: usageMetadata,
          grounding: groundingMetadata,
          urlContext: urlContextMetadata,
          generatedFiles,
          aborted: abortController.signal.aborted,
        });

        if (appSettings.isStreamingEnabled && !streamState.firstContentPartTime) {
          streamState = {
            ...streamState,
            firstContentPartTime: new Date(),
          };
        }

        if (streamState.usage) {
          const {
            promptTokens,
            cachedPromptTokens,
            completionTokens,
            thoughtTokens,
            toolUsePromptTokens,
            totalTokens,
          } = calculateTokenStats(streamState.usage);
          const exactPricing = resolveChatExactPricing({
            providerExactPricing: buildExactPricingFromUsageMetadata('chat', streamState.usage),
            requestParts,
            responseParts: streamState.apiParts,
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
                    content: (msg.content || '') + streamState.content,
                    thoughts: (msg.thoughts || '') + streamState.thoughts,
                    files: streamState.files.length ? mergeUniqueFiles(msg.files, streamState.files) : msg.files,
                    apiParts: msg.apiParts ? [...msg.apiParts, ...streamState.apiParts] : streamState.apiParts,
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
                streamState.firstContentPartTime,
                streamState.usage,
                streamState.grounding,
                streamState.urlContext,
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
          setTimeout(() => onSuccess(generationId, streamState.content), 0);
        }
      };

      const streamOnPart = (part: Part) => {
        const previousFirstTokenTimeMs = streamState.firstTokenTimeMs;
        const previousFiles = streamState.files;
        const contentDelta = getContentDeltaFromPart(part);

        streamState = reduceMessageStreamEvent(streamState, {
          type: 'part',
          part,
          receivedAt: new Date(),
        });
        syncFirstTokenTime(previousFirstTokenTimeMs);

        if (contentDelta) {
          streamingStore.updateContent(generationId, contentDelta);
        }

        const newFiles = streamState.files.filter((file) => !previousFiles.some((existing) => existing.id === file.id));
        if (newFiles.length > 0) {
          updateAndPersistSessions(
            (prev) =>
              updateMessageInSession(prev, currentSessionId, generationId, (message) => ({
                ...message,
                files: mergeUniqueFiles(message.files, newFiles),
              })),
            { persist: false },
          );
        }
      };

      const onThoughtChunk = (thoughtChunk: string) => {
        const previousFirstTokenTimeMs = streamState.firstTokenTimeMs;
        streamState = reduceMessageStreamEvent(streamState, {
          type: 'thought',
          text: thoughtChunk,
          receivedAt: new Date(),
        });
        syncFirstTokenTime(previousFirstTokenTimeMs);
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
