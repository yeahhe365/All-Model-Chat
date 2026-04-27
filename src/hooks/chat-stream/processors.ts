import { ChatMessage, ChatSettings } from '../../types';
import type { Part, UsageMetadata } from '@google/genai';
import { generateUniqueId } from '../../utils/chat/ids';
import { createUploadedFileFromBase64 } from '../../utils/chat/parsing';
import { calculateTokenStats } from '../../utils/modelHelpers';
import { getTranslator } from '../../utils/translations';
import { SUPPORTED_GENERATED_MIME_TYPES } from '../../constants/fileConstants';

export const appendApiPart = (parts: Part[] = [], newPart: Part) => {
  const newParts = [...parts];
  const hasThoughtSignature = (part: Part) =>
    Boolean(
      (part as Part & { thoughtSignature?: string; thought_signature?: string }).thoughtSignature ||
      (part as Part & { thoughtSignature?: string; thought_signature?: string }).thought_signature,
    );
  const isPlainTextOnlyPart = (part: Part) => Object.keys(part).every((key) => key === 'text');

  if ('text' in newPart && typeof newPart.text === 'string') {
    const lastPart = newParts[newParts.length - 1];
    if (
      lastPart &&
      'text' in lastPart &&
      typeof lastPart.text === 'string' &&
      !('thought' in lastPart && lastPart.thought) &&
      !hasThoughtSignature(lastPart) &&
      !hasThoughtSignature(newPart) &&
      isPlainTextOnlyPart(lastPart) &&
      isPlainTextOnlyPart(newPart)
    ) {
      newParts[newParts.length - 1] = { ...lastPart, text: lastPart.text + newPart.text } as Part;
      return newParts;
    }
  }

  newParts.push({ ...newPart });
  return newParts;
};

const findLoadingModelMessageIndex = (messages: ChatMessage[], generationStartTime: Date) => {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (
      msg.isLoading &&
      msg.role === 'model' &&
      msg.generationStartTime &&
      msg.generationStartTime.getTime() === generationStartTime.getTime()
    ) {
      return i;
    }
  }

  return -1;
};

/**
 * Core logic to mutate the messages array with a new part.
 * Used by both single and batch updaters to avoid code duplication.
 * Mutates the `messages` array in place.
 */
const applyPartToMessages = (
  messages: ChatMessage[],
  part: Part,
  generationStartTime: Date,
  _newModelMessageIds: Set<string>,
  firstContentPartTime: Date | null,
) => {
  const now = Date.now();
  const lastMessageIndex = findLoadingModelMessageIndex(messages, generationStartTime);

  if (lastMessageIndex === -1) return;
  let lastMessage = messages[lastMessageIndex];

  // Update thinking time on the first content part if applicable
  if (firstContentPartTime && lastMessage.thinkingTimeMs === undefined) {
    const thinkingTime = firstContentPartTime.getTime() - generationStartTime.getTime();
    lastMessage = { ...lastMessage, thinkingTimeMs: thinkingTime };
    messages[lastMessageIndex] = lastMessage;
  }

  if (lastMessage.firstTokenTimeMs === undefined) {
    lastMessage = { ...lastMessage, firstTokenTimeMs: now - generationStartTime.getTime() };
    messages[lastMessageIndex] = lastMessage;
  }

  const partWithInlineData = part as Part & { inlineData?: { mimeType: string; data?: string } };
  if (partWithInlineData.inlineData) {
    const { mimeType, data } = partWithInlineData.inlineData;

    const isSupportedFile =
      mimeType.startsWith('image/') ||
      mimeType.startsWith('audio/') ||
      mimeType.startsWith('video/') ||
      SUPPORTED_GENERATED_MIME_TYPES.has(mimeType);

    if (isSupportedFile && data) {
      let baseName = 'generated-file';
      if (mimeType.startsWith('image/')) {
        baseName = `generated-plot-${generateUniqueId().slice(-4)}`;
      }

      const newFile = createUploadedFileFromBase64(data, mimeType, baseName);
      messages[lastMessageIndex] = {
        ...lastMessage,
        files: [...(lastMessage.files || []), newFile],
      };
    }
  }

  // Capture thought signatures
  const partWithThoughtSignature = part as Part & {
    thoughtSignature?: string;
    thought_signature?: string;
  };
  const thoughtSignature = partWithThoughtSignature.thoughtSignature || partWithThoughtSignature.thought_signature;
  if (thoughtSignature) {
    const newSignatures = [...(lastMessage.thoughtSignatures || [])];
    if (!newSignatures.includes(thoughtSignature)) {
      newSignatures.push(thoughtSignature);
      messages[lastMessageIndex] = { ...messages[lastMessageIndex], thoughtSignatures: newSignatures };
    }
  }
};

/**
 * Apply thought text chunk to the latest message.
 * Mutates `messages` array in place.
 */
const applyThoughtToMessages = (messages: ChatMessage[], thoughtChunk: string, generationStartTime: Date) => {
  const now = Date.now();
  const lastMessageIndex = findLoadingModelMessageIndex(messages, generationStartTime);

  if (lastMessageIndex !== -1) {
    const lastMessage = messages[lastMessageIndex];
    const updates: Partial<ChatMessage> = {
      thoughts: (lastMessage.thoughts || '') + thoughtChunk,
    };
    if (lastMessage.firstTokenTimeMs === undefined) {
      updates.firstTokenTimeMs = now - generationStartTime.getTime();
    }
    messages[lastMessageIndex] = { ...lastMessage, ...updates };
  }
};

/**
 * Efficiently updates messages with a batch of parts and thoughts.
 * Clones the array once to prevent excessive memory allocation during high-frequency streams.
 */
export const updateMessagesWithBatch = (
  messages: ChatMessage[],
  parts: Part[],
  thoughts: string,
  generationStartTime: Date,
  newModelMessageIds: Set<string>,
  firstContentPartTime: Date | null,
): ChatMessage[] => {
  // Clone once
  const newMessages = [...messages];

  // Apply all parts in the batch
  for (const part of parts) {
    applyPartToMessages(newMessages, part, generationStartTime, newModelMessageIds, firstContentPartTime);
  }

  // Apply accumulated thoughts
  if (thoughts) {
    applyThoughtToMessages(newMessages, thoughts, generationStartTime);
  }

  return newMessages;
};

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
