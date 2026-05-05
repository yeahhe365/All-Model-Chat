import { useEffect, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { createDeferred, createTestRenderer, flushPromises, render, renderHook } from './testUtils';

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

  it('renders components through the shared test renderer', () => {
    const renderer = createTestRenderer();

    renderer.render(<span>first</span>);
    expect(renderer.container).toHaveTextContent('first');

    renderer.render(<span>second</span>);
    expect(renderer.container).toHaveTextContent('second');

    renderer.unmount();
    expect(renderer.container).toBeEmptyDOMElement();
  });

  it('exposes the shared React Testing Library render helper', () => {
    const view = render(<span>shared render</span>);

    expect(view.container).toHaveTextContent('shared render');

    view.unmount();
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
