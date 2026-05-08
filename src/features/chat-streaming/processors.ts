import { ChatMessage, ChatSettings } from '../../types';
import type { UsageMetadata } from '@google/genai';
import { calculateTokenStats } from '../../utils/modelHelpers';
import { getTranslator } from '@/i18n/translations';
import { appendApiPart } from '@/features/chat-streaming/messageStreamReducer';

export { appendApiPart };

export const finalizeMessages = (
  messages: ChatMessage[],
  generationStartTime: Date,
  newModelMessageIds: Set<string>,
  _currentChatSettings: ChatSettings,
  language: 'en' | 'zh',
  firstContentPartTime: Date | null,
  usageMetadata?: UsageMetadata,
  groundingMetadata?: unknown,
  urlContextMetadata?: unknown,
  isAborted?: boolean,
): { updatedMessages: ChatMessage[]; completedMessageForNotification: ChatMessage | null } => {
  const t = getTranslator(language);
  let cumulativeTotal =
    [...messages]
      .reverse()
      .find((m) => m.cumulativeTotalTokens !== undefined && m.generationStartTime !== generationStartTime)
      ?.cumulativeTotalTokens || 0;

  let completedMessageForNotification: ChatMessage | null = null;

  let finalMessages = messages.map((m) => {
    // Identify message by exact object match on timestamp
    if (m.generationStartTime && m.generationStartTime.getTime() === generationStartTime.getTime() && m.isLoading) {
      let thinkingTime = m.thinkingTimeMs;
      if (thinkingTime === undefined && firstContentPartTime) {
        thinkingTime = firstContentPartTime.getTime() - generationStartTime.getTime();
      }
      const isLastMessageOfRun = m.id === Array.from(newModelMessageIds).pop();

      // Token Extraction Logic using helper
      const { promptTokens, cachedPromptTokens, completionTokens, totalTokens, thoughtTokens, toolUsePromptTokens } =
        calculateTokenStats(isLastMessageOfRun ? usageMetadata : undefined);

      if (isLastMessageOfRun) {
        cumulativeTotal += totalTokens;
      }

      const completedMessage = {
        ...m,
        isLoading: false,
        content: m.content,
        thoughts: m.thoughts, // Data preservation: Always save thoughts regardless of display setting
        generationEndTime: new Date(),
        thinkingTimeMs: thinkingTime,
        groundingMetadata: isLastMessageOfRun ? groundingMetadata : undefined,
        urlContextMetadata: isLastMessageOfRun ? urlContextMetadata : undefined,
        promptTokens: isLastMessageOfRun ? promptTokens : undefined,
        cachedPromptTokens: isLastMessageOfRun ? cachedPromptTokens : undefined,
        completionTokens: isLastMessageOfRun ? completionTokens : undefined,
        toolUsePromptTokens: isLastMessageOfRun ? toolUsePromptTokens : undefined,
        totalTokens: isLastMessageOfRun ? totalTokens : undefined,
        thoughtTokens: isLastMessageOfRun ? thoughtTokens : undefined,
        cumulativeTotalTokens: isLastMessageOfRun ? cumulativeTotal : undefined,
      };

      const isEmpty =
        !completedMessage.content?.trim() &&
        !completedMessage.files?.length &&
        !completedMessage.audioSrc &&
        !completedMessage.thoughts?.trim();

      if (isEmpty && !isAborted) {
        completedMessage.role = 'error';
        completedMessage.content = t('empty_response_error');
      }

      if (isLastMessageOfRun) {
        completedMessageForNotification = completedMessage;
      }
      return completedMessage;
    }
    return m;
  });

  if (!isAborted) {
    finalMessages = finalMessages.filter(
      (m) =>
        m.role !== 'model' ||
        m.content?.trim() !== '' ||
        (m.files && m.files.length > 0) ||
        m.audioSrc ||
        (m.thoughts && m.thoughts.trim() !== ''),
    );
  }

  return { updatedMessages: finalMessages, completedMessageForNotification };
};
