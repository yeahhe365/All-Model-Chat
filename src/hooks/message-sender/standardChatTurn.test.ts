import { describe, expect, it } from 'vitest';
import type { ChatMessage } from '../../types';
import { resolveStandardChatTurn } from './standardChatTurn';

describe('resolveStandardChatTurn', () => {
  const messages: ChatMessage[] = [
    {
      id: 'user-1',
      role: 'user',
      content: 'draft prompt',
      timestamp: new Date('2026-04-30T00:00:00Z'),
    },
    {
      id: 'model-1',
      role: 'model',
      content: 'partial answer',
      timestamp: new Date('2026-04-30T00:00:01Z'),
    },
  ];

  it('prefills the target model message when continuing an existing response', () => {
    expect(
      resolveStandardChatTurn({
        messages,
        promptParts: [{ text: 'ignored' }],
        textToUse: 'ignored',
        enrichedFiles: [],
        effectiveEditingId: 'model-1',
        isContinueMode: true,
        isRawMode: false,
        apiModelId: 'gemini-3.1-pro',
      }),
    ).toEqual({
      baseMessagesForApi: [messages[0]],
      finalRole: 'model',
      finalParts: [{ text: 'partial answer' }],
      shouldSkipApiCall: false,
    });
  });

  it('adds a temporary user turn and starts the model turn with a thinking prefill in raw mode', () => {
    const result = resolveStandardChatTurn({
      messages,
      promptParts: [{ text: 'Explain' }],
      textToUse: 'Explain',
      enrichedFiles: [],
      effectiveEditingId: null,
      isContinueMode: false,
      isRawMode: true,
      apiModelId: 'gemini-3.1-pro',
    });

    expect(result.finalRole).toBe('model');
    expect(result.finalParts).toEqual([{ text: '<thinking>' }]);
    expect(result.baseMessagesForApi).toEqual([
      ...messages,
      expect.objectContaining({
        id: 'temp-raw-user',
        role: 'user',
        content: 'Explain',
      }),
    ]);
    expect(result.shouldSkipApiCall).toBe(false);
  });

  it('marks a normal turn with no prompt parts as skippable', () => {
    expect(
      resolveStandardChatTurn({
        messages,
        promptParts: [],
        textToUse: '',
        enrichedFiles: [],
        effectiveEditingId: null,
        isContinueMode: false,
        isRawMode: false,
        apiModelId: 'gemini-3.1-pro',
      }),
    ).toMatchObject({
      finalRole: 'user',
      finalParts: [],
      shouldSkipApiCall: true,
    });
  });
});
