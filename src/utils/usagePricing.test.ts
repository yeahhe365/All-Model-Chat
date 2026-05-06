import { describe, expect, it } from 'vitest';
import { calculateApiUsageRecordPriceUsd } from './usagePricing';
import type { ApiUsageRecord } from '@/services/db/dbService';

describe('calculateApiUsageRecordPriceUsd', () => {
  it('keeps legacy Gemini 3.1 Pro records unavailable when exact evidence is missing', () => {
    const record: ApiUsageRecord = {
      timestamp: Date.now(),
      modelId: 'gemini-3.1-pro-preview',
      promptTokens: 1000,
      cachedPromptTokens: 0,
      completionTokens: 500,
    };

    expect(calculateApiUsageRecordPriceUsd(record)).toBeNull();
  });

  it('prices Gemini 3 Flash exactly when modality token details are present', () => {
    const record: ApiUsageRecord = {
      timestamp: Date.now(),
      modelId: 'gemini-3-flash-preview',
      promptTokens: 1_500_000,
      cachedPromptTokens: 500_000,
      completionTokens: 100_000,
      totalTokens: 1_600_000,
      exactPricing: {
        version: 1,
        requestKind: 'chat',
        promptTokensDetails: [
          { modality: 'TEXT', tokenCount: 1_000_000 },
          { modality: 'AUDIO', tokenCount: 500_000 },
        ],
        cacheTokensDetails: [{ modality: 'TEXT', tokenCount: 500_000 }],
        responseTokensDetails: [{ modality: 'TEXT', tokenCount: 100_000 }],
      },
    };

    expect(calculateApiUsageRecordPriceUsd(record)).toBeCloseTo(1.325, 6);
  });

  it('keeps legacy Gemini 3 Flash records unavailable when exact modality data is missing', () => {
    const record: ApiUsageRecord = {
      timestamp: Date.now(),
      modelId: 'gemini-3-flash-preview',
      promptTokens: 1000,
      completionTokens: 500,
    };

    expect(calculateApiUsageRecordPriceUsd(record)).toBeNull();
  });

  it('keeps removed Gemini 2.5 TTS pricing unavailable even when exact evidence is stored', () => {
    const record: ApiUsageRecord = {
      timestamp: Date.now(),
      modelId: 'gemini-2.5-flash-preview-tts',
      promptTokens: 1_000_000,
      completionTokens: 1_000_000,
      totalTokens: 2_000_000,
      exactPricing: {
        version: 1,
        requestKind: 'tts',
        promptTokensDetails: [{ modality: 'TEXT', tokenCount: 1_000_000 }],
        responseTokensDetails: [{ modality: 'AUDIO', tokenCount: 1_000_000 }],
      },
    };

    expect(calculateApiUsageRecordPriceUsd(record)).toBeNull();
  });

  it('keeps removed Gemini 2.5 native audio pricing unavailable even when exact evidence is stored', () => {
    const record: ApiUsageRecord = {
      timestamp: Date.now(),
      modelId: 'gemini-2.5-flash-native-audio-preview-12-2025',
      promptTokens: 1_000_000,
      completionTokens: 1_000_000,
      totalTokens: 2_000_000,
      exactPricing: {
        version: 1,
        requestKind: 'chat',
        promptTokensDetails: [
          { modality: 'TEXT', tokenCount: 500_000 },
          { modality: 'AUDIO', tokenCount: 500_000 },
        ],
        responseTokensDetails: [
          { modality: 'TEXT', tokenCount: 500_000 },
          { modality: 'AUDIO', tokenCount: 500_000 },
        ],
      },
    };

    expect(calculateApiUsageRecordPriceUsd(record)).toBeNull();
  });

  it('prices Imagen 4 exactly from generated image count', () => {
    const record: ApiUsageRecord = {
      timestamp: Date.now(),
      modelId: 'imagen-4.0-generate-001',
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      exactPricing: {
        version: 1,
        requestKind: 'image_generate',
        generatedImageCount: 2,
      },
    };

    expect(calculateApiUsageRecordPriceUsd(record)).toBeCloseTo(0.08, 6);
  });

  it('prices Gemini 3.1 Pro exactly when modality evidence exists', () => {
    const record: ApiUsageRecord = {
      timestamp: Date.now(),
      modelId: 'gemini-3.1-pro-preview',
      promptTokens: 1_000_000,
      cachedPromptTokens: 500_000,
      completionTokens: 10_000,
      totalTokens: 1_010_000,
      exactPricing: {
        version: 1,
        requestKind: 'chat',
        promptTokensDetails: [{ modality: 'TEXT', tokenCount: 500_000 }],
        cacheTokensDetails: [{ modality: 'TEXT', tokenCount: 500_000 }],
        responseTokensDetails: [{ modality: 'TEXT', tokenCount: 10_000 }],
      },
    };

    expect(calculateApiUsageRecordPriceUsd(record)).toBeCloseTo(2.38, 6);
  });
});
