import { describe, expect, it } from 'vitest';
import { calculateTokenPriceUsd } from './usagePricing';

describe('calculateTokenPriceUsd', () => {
  it('uses the reduced cached-token rate when a supported model reports cache hits', () => {
    expect(
      calculateTokenPriceUsd('gemini-3.1-pro-preview', {
        promptTokens: 1_000_000,
        cachedPromptTokens: 500_000,
        completionTokens: 10_000,
      }),
    ).toBeCloseTo(2.38, 6);
  });
});
