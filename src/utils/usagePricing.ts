import type { ApiUsageExactPricing, ApiUsageModalityTokenCount, ApiUsageRecord } from './db';

interface TokenPricingRule {
  kind: 'flat' | 'tiered';
  inputPerMillion: number;
  cachedInputPerMillion?: number;
  outputPerMillion: number;
  thresholdTokens?: number;
  inputPerMillionAboveThreshold?: number;
  cachedInputPerMillionAboveThreshold?: number;
  outputPerMillionAboveThreshold?: number;
}

const UNSUPPORTED = null;

const TOKEN_PRICING: Record<string, TokenPricingRule | null> = {
  // Official Google AI Studio / Gemini Developer API token pricing checked on 2026-04-17.
  // Keep only models whose exact request-time official price can be determined from the
  // fields we currently store: effective prompt tokens, cached prompt tokens, output tokens, and modelId.
  'gemini-3.1-pro-preview': {
    kind: 'tiered',
    inputPerMillion: 2,
    cachedInputPerMillion: 0.2,
    outputPerMillion: 12,
    thresholdTokens: 200_000,
    inputPerMillionAboveThreshold: 4,
    cachedInputPerMillionAboveThreshold: 0.4,
    outputPerMillionAboveThreshold: 18,
  },
  // These models have modality-specific, minute-based, or image-per-output
  // pricing. With current records we cannot reconstruct their exact official
  // cost, so strict mode leaves them unavailable.
  'gemini-3-flash-preview': UNSUPPORTED,
  'gemini-3.1-flash-lite-preview': UNSUPPORTED,
  'gemini-3.1-flash-live-preview': UNSUPPORTED,
  'gemini-2.5-pro-preview-tts': UNSUPPORTED,
  'gemini-2.5-flash-preview-tts': UNSUPPORTED,
  'gemini-2.5-flash-native-audio-preview-12-2025': UNSUPPORTED,
  'gemini-2.5-flash-image': UNSUPPORTED,
  'gemini-3-pro-image-preview': UNSUPPORTED,
  'gemini-3.1-flash-image-preview': UNSUPPORTED,
  'imagen-4.0-fast-generate-001': UNSUPPORTED,
  'imagen-4.0-generate-001': UNSUPPORTED,
  'imagen-4.0-ultra-generate-001': UNSUPPORTED,
  'gemma-4-31b-it': UNSUPPORTED,
  'gemma-4-26b-a4b-it': UNSUPPORTED,
};

const normalizeModelId = (modelId: string) => modelId.replace(/^models\//, '');

const IMAGE_GENERATION_PRICING: Record<string, { perImage: number } | null> = {
  'imagen-4.0-fast-generate-001': { perImage: 0.02 },
  'imagen-4.0-generate-001': { perImage: 0.04 },
  'imagen-4.0-ultra-generate-001': { perImage: 0.06 },
};

const MODALITY_TEXT_PRICING: Record<
  string,
  {
    prompt: Partial<Record<'TEXT' | 'IMAGE' | 'AUDIO', number>>;
    cache?: Partial<Record<'TEXT' | 'IMAGE' | 'AUDIO', number>>;
    response: Partial<Record<'TEXT' | 'IMAGE' | 'AUDIO', number>>;
    tool?: Partial<Record<'TEXT' | 'IMAGE' | 'AUDIO', number>>;
  } | null
> = {
  'gemini-3-flash-preview': {
    prompt: { TEXT: 0.5, IMAGE: 0.5, AUDIO: 1 },
    cache: { TEXT: 0.05, IMAGE: 0.05, AUDIO: 0.1 },
    response: { TEXT: 3 },
    tool: { TEXT: 0.5, IMAGE: 0.5, AUDIO: 1 },
  },
  'gemini-3.1-flash-lite-preview': {
    prompt: { TEXT: 0.25, IMAGE: 0.25, AUDIO: 0.5 },
    cache: { TEXT: 0.025, IMAGE: 0.025, AUDIO: 0.05 },
    response: { TEXT: 1.5 },
    tool: { TEXT: 0.25, IMAGE: 0.25, AUDIO: 0.5 },
  },
  'gemini-2.5-flash-native-audio-preview-12-2025': {
    prompt: { TEXT: 0.5, AUDIO: 3 },
    response: { TEXT: 2, AUDIO: 12 },
    tool: { TEXT: 0.5, AUDIO: 3 },
  },
};

const TTS_PRICING: Record<
  string,
  {
    promptTextPerMillion: number;
    responseAudioPerMillion: number;
  } | null
> = {
  'gemini-2.5-flash-preview-tts': {
    promptTextPerMillion: 0.5,
    responseAudioPerMillion: 10,
  },
  'gemini-2.5-pro-preview-tts': {
    promptTextPerMillion: 1,
    responseAudioPerMillion: 20,
  },
};

const sumTokensByRate = (
  details: ApiUsageModalityTokenCount[] | undefined,
  rates: Partial<Record<'TEXT' | 'IMAGE' | 'AUDIO', number>> | undefined,
) => {
  if (!details || details.length === 0) {
    return 0;
  }

  if (!rates) {
    return null;
  }

  let total = 0;
  for (const detail of details) {
    const rate = rates[detail.modality];
    if (rate === undefined) {
      return null;
    }
    total += (detail.tokenCount / 1_000_000) * rate;
  }
  return total;
};

const hasAnyDetails = (details: ApiUsageModalityTokenCount[] | undefined) =>
  Boolean(details && details.some((detail) => detail.tokenCount > 0));

const calculateFromExactPricing = (modelId: string, exactPricing: ApiUsageExactPricing): number | null => {
  const normalizedModelId = normalizeModelId(modelId);

  if (exactPricing.requestKind === 'image_generate') {
    const imagePricing = IMAGE_GENERATION_PRICING[normalizedModelId];
    if (!imagePricing || !exactPricing.generatedImageCount) {
      return null;
    }
    return exactPricing.generatedImageCount * imagePricing.perImage;
  }

  if (exactPricing.requestKind === 'tts') {
    const ttsPricing = TTS_PRICING[normalizedModelId];
    if (!ttsPricing) {
      return null;
    }

    const promptDetails = exactPricing.promptTokensDetails;
    const responseDetails = exactPricing.responseTokensDetails;
    if (!hasAnyDetails(promptDetails) || !hasAnyDetails(responseDetails)) {
      return null;
    }

    const promptCost = sumTokensByRate(promptDetails, { TEXT: ttsPricing.promptTextPerMillion });
    const responseCost = sumTokensByRate(responseDetails, { AUDIO: ttsPricing.responseAudioPerMillion });

    if (promptCost === null || responseCost === null) {
      return null;
    }

    return promptCost + responseCost;
  }

  const modalityPricing = MODALITY_TEXT_PRICING[normalizedModelId];
  if (!modalityPricing) {
    return null;
  }

  if (!hasAnyDetails(exactPricing.promptTokensDetails) || !hasAnyDetails(exactPricing.responseTokensDetails)) {
    return null;
  }

  const promptCost = sumTokensByRate(exactPricing.promptTokensDetails, modalityPricing.prompt);
  const cacheCost = sumTokensByRate(exactPricing.cacheTokensDetails, modalityPricing.cache);
  const responseCost = sumTokensByRate(exactPricing.responseTokensDetails, modalityPricing.response);
  const toolCost = sumTokensByRate(exactPricing.toolUsePromptTokensDetails, modalityPricing.tool ?? modalityPricing.prompt);

  if (promptCost === null || cacheCost === null || responseCost === null || toolCost === null) {
    return null;
  }

  return promptCost + cacheCost + responseCost + toolCost;
};

export const calculateTokenPriceUsd = (
  modelId: string,
  usage: {
    promptTokens: number;
    cachedPromptTokens?: number;
    inputTokens?: number;
    completionTokens: number;
  },
): number | null => {
  const pricing = TOKEN_PRICING[normalizeModelId(modelId)];

  if (!pricing) {
    return null;
  }
  const cachedPromptTokens = usage.cachedPromptTokens ?? 0;
  const thresholdPromptTokens = usage.promptTokens;
  const inputTokens = usage.inputTokens ?? Math.max(usage.promptTokens - cachedPromptTokens, 0);
  const completionTokens = usage.completionTokens;

  if (pricing.kind === 'flat') {
    const cachedRate = pricing.cachedInputPerMillion;
    if (cachedPromptTokens > 0 && cachedRate === undefined) {
      return null;
    }

    return (inputTokens / 1_000_000) * pricing.inputPerMillion
      + (cachedPromptTokens / 1_000_000) * (cachedRate ?? 0)
      + (completionTokens / 1_000_000) * pricing.outputPerMillion;
  }

  const useTierTwo = thresholdPromptTokens > (pricing.thresholdTokens ?? Number.MAX_SAFE_INTEGER);
  const inputRate = useTierTwo ? pricing.inputPerMillionAboveThreshold ?? pricing.inputPerMillion : pricing.inputPerMillion;
  const cachedInputRate = useTierTwo
    ? pricing.cachedInputPerMillionAboveThreshold ?? pricing.cachedInputPerMillion
    : pricing.cachedInputPerMillion;
  const outputRate = useTierTwo ? pricing.outputPerMillionAboveThreshold ?? pricing.outputPerMillion : pricing.outputPerMillion;

  if (cachedPromptTokens > 0 && cachedInputRate === undefined) {
    return null;
  }

  return (inputTokens / 1_000_000) * inputRate
    + (cachedPromptTokens / 1_000_000) * (cachedInputRate ?? 0)
    + (completionTokens / 1_000_000) * outputRate;
};

export const calculateApiUsageRecordPriceUsd = (record: ApiUsageRecord): number | null => {
  const exactPricing = record.exactPricing;
  if (exactPricing) {
    const exactPrice = calculateFromExactPricing(record.modelId, exactPricing);
    if (exactPrice !== null) {
      return exactPrice;
    }
  }

  return calculateTokenPriceUsd(record.modelId, {
    promptTokens: record.promptTokens,
    cachedPromptTokens: record.cachedPromptTokens,
    inputTokens: Math.max(record.promptTokens - (record.cachedPromptTokens ?? 0), 0) + (record.toolUsePromptTokens ?? 0),
    completionTokens: record.completionTokens + (record.thoughtTokens ?? 0),
  });
};

export const formatPriceUsd = (amount: number | null): string => {
  if (amount === null) {
    return '—';
  }

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: amount >= 0.01 ? 2 : 4,
    maximumFractionDigits: amount >= 0.01 ? 2 : 4,
  });

  return formatter.format(amount);
};
