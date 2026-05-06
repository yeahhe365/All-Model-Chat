import { describe, expect, it, vi } from 'vitest';
import type { Part, UsageMetadata } from '@google/genai';
import {
  createMessageStreamState,
  reduceMessageStreamEvent,
  type MessageStreamEvent,
} from './messageStreamReducer';

vi.mock('../../utils/chat/ids', () => ({
  generateUniqueId: () => 'generated-id',
}));

describe('messageStreamReducer', () => {
  it('accumulates content, thoughts, api parts, files, and first-token timings from normalized events', () => {
    const generationStartTime = new Date('2026-05-05T10:00:00.000Z');
    const firstTokenTime = new Date('2026-05-05T10:00:00.125Z');
    const firstContentTime = new Date('2026-05-05T10:00:00.250Z');

    const events: MessageStreamEvent[] = [
      { type: 'thought', text: 'I should calculate.', receivedAt: firstTokenTime },
      { type: 'part', part: { text: 'Result: ' } as Part, receivedAt: firstContentTime },
      {
        type: 'part',
        part: { executableCode: { language: 'PYTHON', code: 'print(42)' } } as Part,
        receivedAt: firstContentTime,
      },
      {
        type: 'part',
        part: { codeExecutionResult: { outcome: 'OUTCOME_OK', output: '42\n' } } as Part,
        receivedAt: firstContentTime,
      },
      {
        type: 'part',
        part: { inlineData: { mimeType: 'image/png', data: 'Y2hhcnQ=' }, thoughtSignature: 'sig-image' } as Part,
        receivedAt: firstContentTime,
      },
    ];
    const state = events.reduce(
      reduceMessageStreamEvent,
      createMessageStreamState({ generationId: 'model-message', generationStartTime }),
    );

    expect(state.content).toContain('Result: ');
    expect(state.content).toContain('```python\nprint(42)\n```');
    expect(state.content).toContain('class="tool-result outcome-outcome_ok"');
    expect(state.thoughts).toBe('I should calculate.');
    expect(state.apiParts).toEqual([
      { text: 'Result: ' },
      { executableCode: { language: 'PYTHON', code: 'print(42)' } },
      { codeExecutionResult: { outcome: 'OUTCOME_OK', output: '42\n' } },
      { inlineData: { mimeType: 'image/png', data: 'Y2hhcnQ=' }, thoughtSignature: 'sig-image' },
    ]);
    expect(state.files).toEqual([
      expect.objectContaining({
        name: 'generated-plot-d-id.png',
        type: 'image/png',
      }),
    ]);
    expect(state.firstTokenTimeMs).toBe(125);
    expect(state.firstContentPartTime).toEqual(firstContentTime);
  });

  it('merges usage, grounding, and url context metadata from repeated completion events', () => {
    const events: MessageStreamEvent[] = [
      {
        type: 'complete',
        usage: {
          promptTokenCount: 10,
          responseTokenCount: 2,
          totalTokenCount: 12,
          responseTokensDetails: [{ modality: 'TEXT', tokenCount: 2 }],
        } as UsageMetadata,
        grounding: {
          webSearchQueries: ['alpha'],
          citations: [{ uri: 'https://example.com/a' }],
        },
        urlContext: {
          urlMetadata: [{ retrievedUrl: 'https://example.com/doc', urlRetrievalStatus: 'FAILED' }],
        },
      },
      {
        type: 'complete',
        usage: {
          responseTokenCount: 3,
          totalTokenCount: 3,
          responseTokensDetails: [{ modality: 'TEXT', tokenCount: 3 }],
        } as UsageMetadata,
        grounding: {
          webSearchQueries: ['alpha', 'beta'],
          citations: [{ uri: 'https://example.com/a' }, { uri: 'https://example.com/b' }],
        },
        urlContext: {
          urlMetadata: [{ retrievedUrl: 'https://example.com/doc', urlRetrievalStatus: 'SUCCESS' }],
        },
      },
    ];
    const state = events.reduce(
      reduceMessageStreamEvent,
      createMessageStreamState({ generationId: 'model-message', generationStartTime: new Date(0) }),
    );

    expect(state.usage).toEqual({
      promptTokenCount: 10,
      responseTokenCount: 5,
      totalTokenCount: 15,
      responseTokensDetails: [{ modality: 'TEXT', tokenCount: 5 }],
    });
    expect(state.grounding).toEqual({
      webSearchQueries: ['alpha', 'beta'],
      citations: [{ uri: 'https://example.com/a' }, { uri: 'https://example.com/b' }],
    });
    expect(state.urlContext).toEqual({
      urlMetadata: [{ retrievedUrl: 'https://example.com/doc', urlRetrievalStatus: 'SUCCESS' }],
    });
  });

  it('preserves recursive url context metadata while replacing repeated URL retrieval statuses', () => {
    const state = [
      {
        type: 'complete',
        urlContext: {
          nested: { first: true },
          extraUrls: ['https://example.com/a'],
          urlMetadata: [{ retrievedUrl: 'https://example.com/doc', urlRetrievalStatus: 'FAILED' }],
        },
      },
      {
        type: 'complete',
        urlContext: {
          nested: { second: true },
          extraUrls: ['https://example.com/a', 'https://example.com/b'],
          urlMetadata: [{ retrievedUrl: 'https://example.com/doc', urlRetrievalStatus: 'SUCCESS' }],
        },
      },
    ] satisfies MessageStreamEvent[];

    const stateAfterEvents = state.reduce(
      reduceMessageStreamEvent,
      createMessageStreamState({ generationId: 'model-message', generationStartTime: new Date(0) }),
    );

    expect(stateAfterEvents.urlContext).toEqual({
      nested: { first: true, second: true },
      extraUrls: ['https://example.com/a', 'https://example.com/b'],
      urlMetadata: [{ retrievedUrl: 'https://example.com/doc', urlRetrievalStatus: 'SUCCESS' }],
    });
  });
});
