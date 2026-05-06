import { describe, expect, it } from 'vitest';
import { splitMarkdownSegments } from './markdownUtils';

describe('splitMarkdownSegments', () => {
  it('splits markdown into transformable text and code literals', () => {
    expect(splitMarkdownSegments('Before `inline` middle ```ts\nconst x = 1;\n``` after')).toEqual([
      { type: 'text', value: 'Before ' },
      { type: 'literal', value: '`inline`' },
      { type: 'text', value: ' middle ' },
      { type: 'literal', value: '```ts\nconst x = 1;\n```' },
      { type: 'text', value: ' after' },
    ]);
  });

  it('leaves unmatched inline ticks as transformable text', () => {
    expect(splitMarkdownSegments('Before `` unmatched')).toEqual([
      { type: 'text', value: 'Before ' },
      { type: 'text', value: '``' },
      { type: 'text', value: ' unmatched' },
    ]);
  });
});
