import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Part } from '@google/genai';

const { mockGetConfiguredApiClient, mockGenerateContent, mockGenerateContentStream } = vi.hoisted(() => ({
  mockGetConfiguredApiClient: vi.fn(),
  mockGenerateContent: vi.fn(),
  mockGenerateContentStream: vi.fn(),
}));

vi.mock('../apiClient', async () => {
  const actual = await vi.importActual<typeof import('../apiClient')>('../apiClient');
  return {
    ...actual,
    getConfiguredApiClient: mockGetConfiguredApiClient,
  };
});

vi.mock('../../logService', async () => {
  const { createMockLogService } = await import('../../../test/serviceTestDoubles');

  return { logService: createMockLogService() };
});

import { sendStatelessMessageNonStreamApi, sendStatelessMessageStreamApi } from '../chatApi';

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
        } as unknown as Part,
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
            } as unknown as Part,
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

  it('uses the provided role for non-stream prefilled model turns', async () => {
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
      'gemini-3-flash-preview',
      [{ role: 'user', parts: [{ text: 'Question' }] }],
      [{ text: '<thinking>' }],
      {},
      new AbortController().signal,
      vi.fn(),
      vi.fn(),
      'model',
    );

    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: [
          { role: 'user', parts: [{ text: 'Question' }] },
          { role: 'model', parts: [{ text: '<thinking>' }] },
        ],
      }),
    );
  });

  it('accumulates streamed grounding metadata across chunks', async () => {
    mockGenerateContentStream.mockResolvedValue(
      (async function* () {
        yield {
          candidates: [
            {
              groundingMetadata: {
                webSearchQueries: ['latest gemini release'],
                groundingChunks: [
                  {
                    web: {
                      uri: 'https://example.com/first',
                      title: 'First source',
                    },
                  },
                ],
              },
              content: {
                parts: [{ text: 'Gemini ' }],
              },
            },
          ],
        };

        yield {
          candidates: [
            {
              groundingMetadata: {
                groundingChunks: [
                  {
                    web: {
                      uri: 'https://example.com/second',
                      title: 'Second source',
                    },
                  },
                ],
                groundingSupports: [
                  {
                    segment: { endIndex: 6 },
                    groundingChunkIndices: [0, 1],
                  },
                ],
              },
              content: {
                parts: [{ text: '3.1' }],
              },
            },
          ],
        };
      })(),
    );

    const onComplete = vi.fn();

    await sendStatelessMessageStreamApi(
      'key',
      'gemini-3-flash-preview',
      [],
      [{ text: 'What is the latest Gemini release?' }],
      { tools: [{ googleSearch: {} }] },
      new AbortController().signal,
      vi.fn(),
      vi.fn(),
      vi.fn(),
      onComplete,
    );

    expect(onComplete).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({
        webSearchQueries: ['latest gemini release'],
        groundingChunks: [
          {
            web: {
              uri: 'https://example.com/first',
              title: 'First source',
            },
          },
          {
            web: {
              uri: 'https://example.com/second',
              title: 'Second source',
            },
          },
        ],
        groundingSupports: [
          {
            segment: { endIndex: 6 },
            groundingChunkIndices: [0, 1],
          },
        ],
      }),
      null,
    );
  });

  it('preserves streamed plain-text chunk boundaries when chunks start or end with newlines', async () => {
    mockGenerateContentStream.mockResolvedValue(
      (async function* () {
        yield {
          candidates: [
            {
              content: {
                parts: [{ text: 'Hello\n' }],
              },
            },
          ],
        };

        yield {
          candidates: [
            {
              content: {
                parts: [{ text: '\nworld' }],
              },
            },
          ],
        };
      })(),
    );

    const onPart = vi.fn();

    await sendStatelessMessageStreamApi(
      'key',
      'gemini-3-flash-preview',
      [],
      [{ text: 'Write two paragraphs.' }],
      {},
      new AbortController().signal,
      onPart,
      vi.fn(),
      vi.fn(),
      vi.fn(),
    );

    expect(onPart).toHaveBeenNthCalledWith(1, { text: 'Hello\n' });
    expect(onPart).toHaveBeenNthCalledWith(2, { text: '\nworld' });
  });

  it('preserves streamed thought signatures as context parts without rendering thought text', async () => {
    mockGenerateContentStream.mockResolvedValue(
      (async function* () {
        yield {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: 'Plan internally.',
                    thought: true,
                    thoughtSignature: 'sig-thought-stream',
                  },
                ],
              },
            },
          ],
        };
      })(),
    );

    const onPart = vi.fn();
    const onThoughtChunk = vi.fn();

    await sendStatelessMessageStreamApi(
      'key',
      'gemini-3-flash-preview',
      [],
      [{ text: 'Solve this.' }],
      {},
      new AbortController().signal,
      onPart,
      onThoughtChunk,
      vi.fn(),
      vi.fn(),
    );

    expect(onThoughtChunk).toHaveBeenCalledWith('Plan internally.');
    expect(onPart).toHaveBeenCalledWith({
      text: '',
      thoughtSignature: 'sig-thought-stream',
    });
  });

  it('extracts Gemma thought channels from official non-stream text responses', async () => {
    mockGenerateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [
              {
                text: '<|channel>thought\nPlan carefully.\n<channel|>Final answer.',
              },
            ],
          },
        },
      ],
    });

    const onComplete = vi.fn();

    await sendStatelessMessageNonStreamApi(
      'key',
      'gemma-4-31b-it',
      [],
      [{ text: 'Solve this' }],
      {},
      new AbortController().signal,
      vi.fn(),
      onComplete,
    );

    expect(onComplete).toHaveBeenCalledWith(
      [{ text: 'Final answer.' }],
      'Plan carefully.',
      undefined,
      undefined,
      undefined,
    );
  });

  it('preserves non-stream thought signatures as context parts without rendering thought text', async () => {
    mockGenerateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [
              {
                text: 'Plan internally.',
                thought: true,
                thoughtSignature: 'sig-thought-nonstream',
              },
              { text: 'Final answer.' },
            ],
          },
        },
      ],
    });

    const onComplete = vi.fn();

    await sendStatelessMessageNonStreamApi(
      'key',
      'gemini-3-flash-preview',
      [],
      [{ text: 'Solve this.' }],
      {},
      new AbortController().signal,
      vi.fn(),
      onComplete,
    );

    expect(onComplete).toHaveBeenCalledWith(
      [
        {
          text: '',
          thoughtSignature: 'sig-thought-nonstream',
        },
        { text: 'Final answer.' },
      ],
      'Plan internally.',
      undefined,
      undefined,
      undefined,
    );
  });

  it('forwards abortSignal through generateContent config for non-stream requests', async () => {
    mockGenerateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [{ text: 'done' }],
          },
        },
      ],
    });

    const abortController = new AbortController();

    await sendStatelessMessageNonStreamApi(
      'key',
      'gemini-3.1-flash-image-preview',
      [],
      [{ text: 'Generate an icon.' }],
      { responseModalities: ['IMAGE', 'TEXT'] },
      abortController.signal,
      vi.fn(),
      vi.fn(),
    );

    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          abortSignal: abortController.signal,
        }),
      }),
    );
  });

  it('keeps backward compatibility for legacy Gemma thought channel formatting', async () => {
    mockGenerateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [
              {
                text: '<|channel|thought>Plan carefully.<channel|>Final answer.',
              },
            ],
          },
        },
      ],
    });

    const onComplete = vi.fn();

    await sendStatelessMessageNonStreamApi(
      'key',
      'gemma-4-31b-it',
      [],
      [{ text: 'Solve this' }],
      {},
      new AbortController().signal,
      vi.fn(),
      onComplete,
    );

    expect(onComplete).toHaveBeenCalledWith(
      [{ text: 'Final answer.' }],
      'Plan carefully.',
      undefined,
      undefined,
      undefined,
    );
  });
});
