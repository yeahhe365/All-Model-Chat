import { describe, expect, it } from 'vitest';
import type { Part } from '@google/genai';
import { buildPureTextChatExactPricing, resolveChatExactPricing } from './chatPricingEvidence';

describe('buildPureTextChatExactPricing', () => {
  it('builds text-only pricing evidence for pure text request/response pairs', () => {
    const requestParts: Part[] = [{ text: 'hello' }];
    const responseParts: Part[] = [{ text: 'world' }];

    expect(
      buildPureTextChatExactPricing({
        requestParts,
        responseParts,
        promptTokens: 120,
        cachedPromptTokens: 20,
        toolUsePromptTokens: 5,
        outputTokens: 80,
      }),
    ).toEqual({
      version: 1,
      requestKind: 'chat',
      promptTokensDetails: [{ modality: 'TEXT', tokenCount: 100 }],
      cacheTokensDetails: [{ modality: 'TEXT', tokenCount: 20 }],
      toolUsePromptTokensDetails: [{ modality: 'TEXT', tokenCount: 5 }],
      responseTokensDetails: [{ modality: 'TEXT', tokenCount: 80 }],
    });
  });

  it('returns undefined when the request contains non-text parts', () => {
    const requestParts: Part[] = [
      { text: 'hello' },
      { inlineData: { mimeType: 'image/png', data: 'base64' } },
    ];
    const responseParts: Part[] = [{ text: 'world' }];

    expect(
      buildPureTextChatExactPricing({
        requestParts,
        responseParts,
        promptTokens: 120,
        cachedPromptTokens: 0,
        toolUsePromptTokens: 0,
        outputTokens: 80,
      }),
    ).toBeUndefined();
  });

  it('returns undefined when the response contains non-text parts', () => {
    const requestParts: Part[] = [{ text: 'hello' }];
    const responseParts: Part[] = [{ inlineData: { mimeType: 'image/png', data: '' } }];

    expect(
      buildPureTextChatExactPricing({
        requestParts,
        responseParts,
        promptTokens: 120,
        cachedPromptTokens: 0,
        toolUsePromptTokens: 0,
        outputTokens: 80,
      }),
    ).toBeUndefined();
  });

  it('prefers locally proven pure-text evidence over partial provider details', () => {
    const requestParts: Part[] = [{ text: 'hello' }];
    const responseParts: Part[] = [{ text: 'world' }];

    expect(
      resolveChatExactPricing({
        providerExactPricing: {
          version: 1,
          requestKind: 'chat',
          promptTokensDetails: [{ modality: 'TEXT', tokenCount: 100 }],
        },
        requestParts,
        responseParts,
        promptTokens: 120,
        cachedPromptTokens: 20,
        toolUsePromptTokens: 0,
        outputTokens: 80,
      }),
    ).toEqual({
      version: 1,
      requestKind: 'chat',
      promptTokensDetails: [{ modality: 'TEXT', tokenCount: 100 }],
      cacheTokensDetails: [{ modality: 'TEXT', tokenCount: 20 }],
      responseTokensDetails: [{ modality: 'TEXT', tokenCount: 80 }],
    });
  });
});
