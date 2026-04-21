import { describe, expect, it } from 'vitest';
import { extractGemmaThoughtChannel, stripReasoningMarkup } from '../reasoning';

describe('extractGemmaThoughtChannel', () => {
  it('returns plain text unchanged when no Gemma thought channel markup is present', () => {
    const plainText = 'Hello\n\nworld\n';

    expect(extractGemmaThoughtChannel(plainText)).toEqual({
      content: plainText,
    });
  });

  it('extracts official Gemma thought channels without changing the final answer text', () => {
    expect(
      extractGemmaThoughtChannel(
        '<|channel>thought\nPlan carefully.\n<channel|>Final answer.',
      ),
    ).toEqual({
      content: 'Final answer.',
      thoughts: 'Plan carefully.',
    });
  });
});

describe('stripReasoningMarkup', () => {
  it('preserves plain-text whitespace when no reasoning markup exists', () => {
    const plainText = '\n\n- item 1\n- item 2\n';

    expect(stripReasoningMarkup(plainText)).toBe(plainText);
  });
});
