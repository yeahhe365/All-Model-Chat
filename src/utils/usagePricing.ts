interface TokenPricingRule {
  kind: 'flat' | 'tiered';
  inputPerMillion: number;
  outputPerMillion: number;
  thresholdTokens?: number;
  inputPerMillionAboveThreshold?: number;
  outputPerMillionAboveThreshold?: number;
}

const UNSUPPORTED = null;

const TOKEN_PRICING: Record<string, TokenPricingRule | null> = {
  // Official Google AI Studio / Gemini Developer API token pricing checked on 2026-04-17.
  // Keep only models whose exact official price can be determined from the
  // fields we currently store: promptTokens + completionTokens + modelId.
  'gemini-3.1-pro-preview': {
    kind: 'tiered',
    inputPerMillion: 1,
    outputPerMillion: 6,
    thresholdTokens: 200_000,
    inputPerMillionAboveThreshold: 2,
    outputPerMillionAboveThreshold: 9,
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

export const calculateTokenPriceUsd = (
  modelId: string,
  promptTokens: number,
  completionTokens: number,
): number | null => {
  const pricing = TOKEN_PRICING[normalizeModelId(modelId)];

  if (!pricing) {
    return null;
  }

  if (pricing.kind === 'flat') {
    return (promptTokens / 1_000_000) * pricing.inputPerMillion + (completionTokens / 1_000_000) * pricing.outputPerMillion;
  }

  const useTierTwo = promptTokens > (pricing.thresholdTokens ?? Number.MAX_SAFE_INTEGER);
  const inputRate = useTierTwo ? pricing.inputPerMillionAboveThreshold ?? pricing.inputPerMillion : pricing.inputPerMillion;
  const outputRate = useTierTwo ? pricing.outputPerMillionAboveThreshold ?? pricing.outputPerMillion : pricing.outputPerMillion;

  return (promptTokens / 1_000_000) * inputRate + (completionTokens / 1_000_000) * outputRate;
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
