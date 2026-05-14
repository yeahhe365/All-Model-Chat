import { describe, expect, it } from 'vitest';
import { toStructuredToolResponse } from './toolResponse';

describe('toStructuredToolResponse', () => {
  it('keeps plain object tool responses unchanged', () => {
    expect(toStructuredToolResponse({ output: '42' })).toEqual({ output: '42' });
  });

  it('wraps primitive and array tool responses in a result object', () => {
    expect(toStructuredToolResponse('done')).toEqual({ result: 'done' });
    expect(toStructuredToolResponse(['a', 'b'])).toEqual({ result: ['a', 'b'] });
  });
});
