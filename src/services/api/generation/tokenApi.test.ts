import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CountTokensConfig, Part } from '@google/genai';

const { mockGetConfiguredApiClient, mockCountTokens } = vi.hoisted(() => ({
  mockGetConfiguredApiClient: vi.fn(),
  mockCountTokens: vi.fn(),
}));

vi.mock('../apiClient', async () => {
  const actual = await vi.importActual<typeof import('../apiClient')>('../apiClient');
  return {
    ...actual,
    getConfiguredApiClient: mockGetConfiguredApiClient,
  };
});

vi.mock('../../logService', () => ({
  logService: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(), recordTokenUsage: vi.fn() },
}));

import { countTokensApi } from './tokenApi';

describe('countTokensApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConfiguredApiClient.mockResolvedValue({
      models: {
        countTokens: mockCountTokens,
      },
    });
    mockCountTokens.mockResolvedValue({ totalTokens: 42 });
  });

  it('uses v1alpha and preserves mediaResolution when counting tokens for per-part media inputs', async () => {
    await countTokensApi('key', 'gemini-3.1-pro-preview', [
      {
        inlineData: {
          mimeType: 'image/png',
          data: 'base64',
        },
        mediaResolution: { level: 'MEDIA_RESOLUTION_HIGH' },
        thoughtSignature: 'sig-1',
      } as unknown as Part,
    ]);

    expect(mockGetConfiguredApiClient).toHaveBeenCalledWith('key', {
      apiVersion: 'v1alpha',
    });

    expect(mockCountTokens).toHaveBeenCalledWith({
      model: 'gemini-3.1-pro-preview',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: 'image/png',
                data: 'base64',
              },
              mediaResolution: { level: 'MEDIA_RESOLUTION_HIGH' },
            },
          ],
        },
      ],
    });
  });

  it('omits generationConfig from countTokens requests for the Gemini Developer API', async () => {
    const config: CountTokensConfig = {
      systemInstruction: 'You are concise.',
      tools: [{ googleSearch: {} }],
      generationConfig: {
        thinkingConfig: {
          includeThoughts: true,
          thinkingBudget: 256,
        },
      },
    };

    await countTokensApi(
      'key',
      'gemini-3.1-pro-preview',
      [{ text: 'How many tokens?' } as Part],
      config,
    );

    expect(mockCountTokens).toHaveBeenCalledWith({
      model: 'gemini-3.1-pro-preview',
      contents: [
        {
          role: 'user',
          parts: [{ text: 'How many tokens?' }],
        },
      ],
      config: {
        systemInstruction: 'You are concise.',
        tools: [{ googleSearch: {} }],
      },
    });
  });

  it('retries without config when Gemini Developer API rejects unsupported token-count parameters', async () => {
    mockCountTokens
      .mockRejectedValueOnce(new Error('tools parameter is not supported in Gemini API.'))
      .mockResolvedValueOnce({ totalTokens: 17 });

    await expect(
      countTokensApi(
        'key',
        'gemini-3.1-pro-preview',
        [{ text: 'How many tokens?' } as Part],
        {
          systemInstruction: 'You are concise.',
          tools: [{ googleSearch: {} }],
        },
      ),
    ).resolves.toBe(17);

    expect(mockCountTokens).toHaveBeenNthCalledWith(1, {
      model: 'gemini-3.1-pro-preview',
      contents: [
        {
          role: 'user',
          parts: [{ text: 'How many tokens?' }],
        },
      ],
      config: {
        systemInstruction: 'You are concise.',
        tools: [{ googleSearch: {} }],
      },
    });

    expect(mockCountTokens).toHaveBeenNthCalledWith(2, {
      model: 'gemini-3.1-pro-preview',
      contents: [
        {
          role: 'user',
          parts: [{ text: 'How many tokens?' }],
        },
      ],
    });
  });

  it('falls back to plain-text contents when structured text counting returns INVALID_ARGUMENT', async () => {
    mockCountTokens
      .mockRejectedValueOnce(new Error('Request contains an invalid argument.'))
      .mockResolvedValueOnce({ totalTokens: 9 });

    await expect(
      countTokensApi(
        'key',
        'gemini-3-flash-preview',
        [{ text: 'screenshot' } as Part],
      ),
    ).resolves.toBe(9);

    expect(mockCountTokens).toHaveBeenNthCalledWith(1, {
      model: 'gemini-3-flash-preview',
      contents: [
        {
          role: 'user',
          parts: [{ text: 'screenshot' }],
        },
      ],
    });

    expect(mockCountTokens).toHaveBeenNthCalledWith(2, {
      model: 'gemini-3-flash-preview',
      contents: 'screenshot',
    });
  });
});
