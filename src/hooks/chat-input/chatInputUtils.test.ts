import { describe, expect, it } from 'vitest';
import { buildChatInputSubmitText } from './chatInputUtils';

describe('buildChatInputSubmitText', () => {
  it('wraps transcript text with TTS context before sending', () => {
    expect(
      buildChatInputSubmitText({
        inputText: 'hello world',
        quotes: [],
        modelId: 'gemini-2.5-flash-preview-tts',
        ttsContext: 'Use a calm narrator voice.',
      })
    ).toBe('Use a calm narrator voice.\n\n#### TRANSCRIPT\nhello world');
  });

  it('formats multiple quotes before the input text', () => {
    expect(
      buildChatInputSubmitText({
        inputText: 'Summarize this.',
        quotes: ['first line\nsecond line', 'third line'],
        modelId: 'gemini-3.1-pro-preview',
      })
    ).toBe(
      '**Quote 1**:\n> first line\n> second line\n\n**Quote 2**:\n> third line\n\nSummarize this.'
    );
  });
});
