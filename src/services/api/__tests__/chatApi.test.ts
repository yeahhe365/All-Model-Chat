import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockGetConfiguredApiClient,
  mockGenerateContent,
  mockGenerateContentStream,
} = vi.hoisted(() => ({
  mockGetConfiguredApiClient: vi.fn(),
  mockGenerateContent: vi.fn(),
  mockGenerateContentStream: vi.fn(),
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

import {
  sendStatelessMessageNonStreamApi,
  sendStatelessMessageStreamApi,
} from '../chatApi';

describe('chatApi media resolution routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConfiguredApiClient.mockResolvedValue({
      models: {
        generateContent: mockGenerateContent,
        generateContentStream: mockGenerateContentStream,
      },
    });
  });

  it('uses v1alpha for streaming requests with per-part media resolution', async () => {
    mockGenerateContentStream.mockResolvedValue(
      (async function* () {
        yield {
          candidates: [
            {
              content: {
                parts: [{ text: 'done' }],
              },
            },
          ],
        };
      })(),
    );

    await sendStatelessMessageStreamApi(
      'key',
      'gemini-3.1-pro-preview',
      [],
      [
        {
          text: 'describe this image',
          mediaResolution: { level: 'MEDIA_RESOLUTION_HIGH' },
        } as any,
      ],
      {},
      new AbortController().signal,
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
    );

    expect(mockGetConfiguredApiClient).toHaveBeenCalledWith('key', {
      apiVersion: 'v1alpha',
    });
  });

  it('uses v1alpha for non-stream requests when history carries per-part media resolution', async () => {
    mockGenerateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [{ text: 'done' }],
          },
        },
      ],
    });

    await sendStatelessMessageNonStreamApi(
      'key',
      'gemini-3.1-pro-preview',
      [
        {
          role: 'user',
          parts: [
            {
              fileData: {
                fileUri: 'files/123',
                mimeType: 'image/png',
              },
              mediaResolution: { level: 'MEDIA_RESOLUTION_HIGH' },
            } as any,
          ],
        },
      ],
      [{ text: 'continue' }],
      {},
      new AbortController().signal,
      vi.fn(),
      vi.fn(),
    );

    expect(mockGetConfiguredApiClient).toHaveBeenCalledWith('key', {
      apiVersion: 'v1alpha',
    });
  });
});
