import type { Part } from '@google/genai';
import type { ApiUsageExactPricing } from '@/services/db/dbService';

const isPlainTextPart = (part: Part) => {
  const keys = Object.keys(part).filter(
    (key) => key !== 'thought' && key !== 'thoughtSignature' && key !== 'thought_signature',
  );
  return keys.length === 1 && keys[0] === 'text' && typeof (part as { text?: unknown }).text === 'string';
};

const buildPureTextChatExactPricing = ({
  requestParts,
  responseParts,
  promptTokens,
  cachedPromptTokens,
  toolUsePromptTokens,
  outputTokens,
}: {
  requestParts: Part[];
  responseParts: Part[];
  promptTokens: number;
  cachedPromptTokens: number;
  toolUsePromptTokens: number;
  outputTokens: number;
}): ApiUsageExactPricing | undefined => {
  if (!requestParts.length || !responseParts.length) {
    return undefined;
  }

  if (!requestParts.every(isPlainTextPart) || !responseParts.every(isPlainTextPart)) {
    return undefined;
  }

  const uncachedPromptTokens = Math.max(promptTokens - cachedPromptTokens, 0);

  return {
    version: 1,
    requestKind: 'chat',
    ...(uncachedPromptTokens > 0
      ? { promptTokensDetails: [{ modality: 'TEXT', tokenCount: uncachedPromptTokens }] }
      : {}),
    ...(cachedPromptTokens > 0 ? { cacheTokensDetails: [{ modality: 'TEXT', tokenCount: cachedPromptTokens }] } : {}),
    ...(toolUsePromptTokens > 0
      ? { toolUsePromptTokensDetails: [{ modality: 'TEXT', tokenCount: toolUsePromptTokens }] }
      : {}),
    ...(outputTokens > 0 ? { responseTokensDetails: [{ modality: 'TEXT', tokenCount: outputTokens }] } : {}),
  };
};

const hasCompleteChatEvidence = (exactPricing: ApiUsageExactPricing | undefined) =>
  Boolean(
    exactPricing &&
    exactPricing.requestKind === 'chat' &&
    exactPricing.promptTokensDetails?.length &&
    exactPricing.responseTokensDetails?.length,
  );

export const resolveChatExactPricing = ({
  providerExactPricing,
  requestParts,
  responseParts,
  promptTokens,
  cachedPromptTokens,
  toolUsePromptTokens,
  outputTokens,
}: {
  providerExactPricing?: ApiUsageExactPricing;
  requestParts: Part[];
  responseParts: Part[];
  promptTokens: number;
  cachedPromptTokens: number;
  toolUsePromptTokens: number;
  outputTokens: number;
}): ApiUsageExactPricing | undefined => {
  const localPureTextPricing = buildPureTextChatExactPricing({
    requestParts,
    responseParts,
    promptTokens,
    cachedPromptTokens,
    toolUsePromptTokens,
    outputTokens,
  });

  if (localPureTextPricing) {
    return localPureTextPricing;
  }

  if (hasCompleteChatEvidence(providerExactPricing)) {
    return providerExactPricing;
  }

  return providerExactPricing;
};
