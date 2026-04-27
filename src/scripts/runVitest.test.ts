import { describe, expect, it } from 'vitest';

import { buildVitestNodeArgs } from '../../scripts/runVitest.mjs';

describe('buildVitestNodeArgs', () => {
  it('includes the webstorage opt-out flag when the current node supports it', () => {
    const args = buildVitestNodeArgs({ has: (value: string) => value === '--no-experimental-webstorage' }, [
      'run',
      'src/example.test.ts',
    ]);

    expect(args).toEqual([
      '--no-experimental-webstorage',
      './node_modules/vitest/vitest.mjs',
      'run',
      'src/example.test.ts',
    ]);
  });

  it('omits the webstorage opt-out flag when the current node does not support it', () => {
    const args = buildVitestNodeArgs({ has: () => false }, ['run', 'src/example.test.ts']);

    expect(args).toEqual(['./node_modules/vitest/vitest.mjs', 'run', 'src/example.test.ts']);
  });
});
