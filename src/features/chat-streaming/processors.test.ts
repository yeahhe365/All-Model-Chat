import { describe, expect, it, vi } from 'vitest';
import type { Part } from '@google/genai';

vi.mock('@/utils/chat/ids', () => ({
  generateUniqueId: () => 'generated-id',
}));

vi.mock('@/utils/modelHelpers', () => ({
  calculateTokenStats: () => ({
    promptTokens: 0,
    cachedPromptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    thoughtTokens: 0,
    toolUsePromptTokens: 0,
  }),
}));

vi.mock('@/utils/chat/parsing', () => ({
  createUploadedFileFromBase64: vi.fn((data: string, type: string, name: string) => ({
    id: 'generated-id',
    name: `${name}.png`,
    type,
    size: data.length,
    dataUrl: `data:${type};base64,${data}`,
    uploadState: 'active',
  })),
}));

vi.mock('@/i18n/translations', () => ({
  getTranslator: () => (key: string) => key,
}));

import { createChatSettings } from '@/test/factories';
import { appendApiPart, finalizeMessages } from './processors';

describe('appendApiPart', () => {
  it('preserves signature-only text parts instead of merging them into the previous text part', () => {
    const parts = appendApiPart([{ text: 'final answer' } as Part], { text: '', thoughtSignature: 'sig-123' } as Part);

    expect(parts).toEqual([{ text: 'final answer' }, { text: '', thoughtSignature: 'sig-123' }]);
  });

  it('still merges plain text chunks without metadata', () => {
    const parts = appendApiPart([{ text: 'hello' } as Part], { text: ' world' } as Part);

    expect(parts).toEqual([{ text: 'hello world' }]);
  });

  it('preserves code execution output inline data exactly for API context replay', () => {
    const parts = appendApiPart([], {
      inlineData: { mimeType: 'image/png', data: 'base64-chart' },
      thoughtSignature: 'sig-image',
    } as Part);

    expect(parts).toEqual([
      {
        inlineData: { mimeType: 'image/png', data: 'base64-chart' },
        thoughtSignature: 'sig-image',
      },
    ]);
  });
});

describe('finalizeMessages', () => {
  it('preserves files that were attached before finalizing the generated message', () => {
    const generationStartTime = new Date('2026-04-25T01:00:00.000Z');
    const existingFile = {
      id: 'plot-file',
      name: 'generated-plot.png',
      type: 'image/png',
      size: 12,
      dataUrl: 'blob:plot',
      uploadState: 'active' as const,
    };

    const { updatedMessages } = finalizeMessages(
      [
        {
          id: 'model-message',
          role: 'model',
          content: '已生成图片。',
          timestamp: generationStartTime,
          generationStartTime,
          isLoading: true,
          files: [existingFile],
        },
      ],
      generationStartTime,
      new Set(['model-message']),
      createChatSettings(),
      'zh',
      generationStartTime,
    );

    expect(updatedMessages[0]?.files).toEqual([existingFile]);
  });

  it('preserves empty internal tool model messages because their api parts rebuild context', () => {
    const generationStartTime = new Date('2026-04-25T01:00:00.000Z');
    const { updatedMessages } = finalizeMessages(
      [
        {
          id: 'user-message',
          role: 'user',
          content: 'Run Python.',
          timestamp: new Date('2026-04-25T00:59:59.000Z'),
        },
        {
          id: 'internal-tool-call',
          role: 'model',
          content: '',
          timestamp: new Date('2026-04-25T01:00:00.100Z'),
          isInternalToolMessage: true,
          toolParentMessageId: 'model-message',
          apiParts: [{ functionCall: { id: 'call-1', name: 'run_local_python', args: { code: 'print(42)' } } }],
        },
        {
          id: 'internal-tool-response',
          role: 'user',
          content: '',
          timestamp: new Date('2026-04-25T01:00:00.200Z'),
          isInternalToolMessage: true,
          toolParentMessageId: 'model-message',
          apiParts: [
            {
              functionResponse: {
                id: 'call-1',
                name: 'run_local_python',
                response: { result: { output: '42' } },
              },
            },
          ],
        },
        {
          id: 'model-message',
          role: 'model',
          content: 'The answer is 42.',
          timestamp: generationStartTime,
          generationStartTime,
          isLoading: true,
        },
      ],
      generationStartTime,
      new Set(['model-message']),
      createChatSettings(),
      'zh',
      generationStartTime,
    );

    expect(updatedMessages.map((message) => message.id)).toEqual([
      'user-message',
      'internal-tool-call',
      'internal-tool-response',
      'model-message',
    ]);
  });
});
