import { useEffect, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { createDeferred, flushPromises, renderHook } from './testUtils';

describe('testUtils', () => {
  it('renders hooks and runs cleanup on unmount', () => {
    const cleanup = vi.fn();

    const { result, unmount } = renderHook(() => {
      const [value] = useState('ready');
      useEffect(() => cleanup, []);
      return value;
    });

    expect(result.current).toBe('ready');

    unmount();

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('creates controllable promises for async tests', async () => {
    const deferred = createDeferred<string>();
    let value = '';

    deferred.promise.then((resolvedValue) => {
      value = resolvedValue;
    });

    deferred.resolve('loaded');
    await flushPromises();

    expect(value).toBe('loaded');
  });

  it('rerenders with an updated hook callback', () => {
    const { result, rerender, unmount } = renderHook(() => 'first');

    rerender(() => 'second');

    expect(result.current).toBe('second');
    unmount();
  });
});
