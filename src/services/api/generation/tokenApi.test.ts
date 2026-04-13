import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetConfiguredApiClient, mockCountTokens } = vi.hoisted(() => ({
  mockGetConfiguredApiClient: vi.fn(),
  mockCountTokens: vi.fn(),
}));

vi.mock('../baseApi', async () => {
  const actual = await vi.importActual<typeof import('../baseApi')>('../baseApi');
  return {
    ...actual,
    getConfiguredApiClient: mockGetConfiguredApiClient,
  };
});

vi.mock('../../logService', () => ({
  logService: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
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
      } as any,
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
});
