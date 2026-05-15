import type { ApiUsageExactPricing, ApiUsageModalityTokenCount, ApiUsageRecord } from '@/services/db/dbService';

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
    thresholdTokens?: number;
    promptAboveThreshold?: Partial<Record<'TEXT' | 'IMAGE' | 'AUDIO', number>>;
    cacheAboveThreshold?: Partial<Record<'TEXT' | 'IMAGE' | 'AUDIO', number>>;
    responseAboveThreshold?: Partial<Record<'TEXT' | 'IMAGE' | 'AUDIO', number>>;
    toolAboveThreshold?: Partial<Record<'TEXT' | 'IMAGE' | 'AUDIO', number>>;
  } | null
> = {
  'gemini-3-flash-preview': {
    prompt: { TEXT: 0.5, IMAGE: 0.5, AUDIO: 1 },
    cache: { TEXT: 0.05, IMAGE: 0.05, AUDIO: 0.1 },
    response: { TEXT: 3 },
    tool: { TEXT: 0.5, IMAGE: 0.5, AUDIO: 1 },
  },
  'gemini-3.1-flash-lite': {
    prompt: { TEXT: 0.25, IMAGE: 0.25, AUDIO: 0.5 },
    cache: { TEXT: 0.025, IMAGE: 0.025, AUDIO: 0.05 },
    response: { TEXT: 1.5 },
    tool: { TEXT: 0.25, IMAGE: 0.25, AUDIO: 0.5 },
  },
  'gemini-3.1-pro-preview': {
    prompt: { TEXT: 2 },
    cache: { TEXT: 0.2 },
    response: { TEXT: 12 },
    tool: { TEXT: 2 },
    thresholdTokens: 200_000,
    promptAboveThreshold: { TEXT: 4 },
    cacheAboveThreshold: { TEXT: 0.4 },
    responseAboveThreshold: { TEXT: 18 },
    toolAboveThreshold: { TEXT: 4 },
  },
};

const TTS_PRICING: Record<
  string,
  {
    promptTextPerMillion: number;
    responseAudioPerMillion: number;
  } | null
> = {};

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

  const useAboveThreshold = ((): boolean => {
    if (modalityPricing.thresholdTokens === undefined) {
      return false;
    }

    const promptTokens =
      (exactPricing.promptTokensDetails?.reduce((sum, detail) => sum + detail.tokenCount, 0) ?? 0) +
      (exactPricing.cacheTokensDetails?.reduce((sum, detail) => sum + detail.tokenCount, 0) ?? 0);

    return promptTokens > modalityPricing.thresholdTokens;
  })();

  const promptRates = useAboveThreshold
    ? (modalityPricing.promptAboveThreshold ?? modalityPricing.prompt)
    : modalityPricing.prompt;
  const cacheRates = useAboveThreshold
    ? (modalityPricing.cacheAboveThreshold ?? modalityPricing.cache)
    : modalityPricing.cache;
  const responseRates = useAboveThreshold
    ? (modalityPricing.responseAboveThreshold ?? modalityPricing.response)
    : modalityPricing.response;
  const toolRates = useAboveThreshold
    ? (modalityPricing.toolAboveThreshold ??
      modalityPricing.tool ??
      modalityPricing.promptAboveThreshold ??
      modalityPricing.prompt)
    : (modalityPricing.tool ?? modalityPricing.prompt);

  const promptCost = sumTokensByRate(exactPricing.promptTokensDetails, promptRates);
  const cacheCost = sumTokensByRate(exactPricing.cacheTokensDetails, cacheRates);
  const responseCost = sumTokensByRate(exactPricing.responseTokensDetails, responseRates);
  const toolCost = sumTokensByRate(exactPricing.toolUsePromptTokensDetails, toolRates);

  if (promptCost === null || cacheCost === null || responseCost === null || toolCost === null) {
    return null;
  }

  return promptCost + cacheCost + responseCost + toolCost;
};

export const calculateApiUsageRecordPriceUsd = (record: ApiUsageRecord): number | null => {
  const exactPricing = record.exactPricing;
  if (!exactPricing) {
    return null;
  }

  return calculateFromExactPricing(record.modelId, exactPricing);
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
