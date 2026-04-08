import { describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import { processGenerateContentResponse } from '../chatApi';

vi.mock('../../logService', () => ({
  logService: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('../baseApi', () => ({
  getConfiguredApiClient: vi.fn(),
}));

describe('processGenerateContentResponse', () => {
  it('extracts thoughts and server-side tool citations without leaking toolCall parts', () => {
    const response = {
      candidates: [
        {
          content: {
            parts: [
              { thought: true, text: 'internal reasoning' },
              { text: 'final answer' },
              {
                toolCall: {
                  args: {
                    urlContextMetadata: {
                      citations: [{ uri: 'https://example.com' }],
                    },
                  },
                },
              },
            ],
          },
          groundingMetadata: {
            webSearchQueries: ['query'],
          },
        },
      ],
      usageMetadata: {
        totalTokenCount: 12,
      },
    } as any;

    const result = processGenerateContentResponse(response);

    expect(result.parts).toEqual([{ text: 'final answer' }]);
    expect(result.thoughts).toBe('internal reasoning');
    expect(result.grounding).toMatchObject({
      webSearchQueries: ['query'],
      citations: [{ uri: 'https://example.com' }],
    });
    expect(result.usage?.totalTokenCount).toBe(12);
  });
});
