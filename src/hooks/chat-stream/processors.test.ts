import { describe, expect, it, vi } from 'vitest';
import type { Part } from '@google/genai';

vi.mock('../../utils/appUtils', () => ({
  generateUniqueId: () => 'generated-id',
  calculateTokenStats: () => ({
    promptTokens: 0,
    cachedPromptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    thoughtTokens: 0,
    toolUsePromptTokens: 0,
  }),
  createUploadedFileFromBase64: vi.fn(),
  getTranslator: () => ((key: string) => key),
}));

import { appendApiPart } from './processors';

describe('appendApiPart', () => {
  it('preserves signature-only text parts instead of merging them into the previous text part', () => {
    const parts = appendApiPart(
      [{ text: 'final answer' } as Part],
      { text: '', thoughtSignature: 'sig-123' } as Part,
    );

    expect(parts).toEqual([
      { text: 'final answer' },
      { text: '', thoughtSignature: 'sig-123' },
    ]);
  });

  it('still merges plain text chunks without metadata', () => {
    const parts = appendApiPart(
      [{ text: 'hello' } as Part],
      { text: ' world' } as Part,
    );

    expect(parts).toEqual([{ text: 'hello world' }]);
  });
});
