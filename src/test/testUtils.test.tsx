import { useEffect, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createDeferred, createTestRenderer, flushPromises, render, renderHook, setupTestRenderer } from './testUtils';

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

  it('renders again after a manual unmount', () => {
    const renderer = createTestRenderer();

    renderer.render(<span>before unmount</span>);
    renderer.unmount();
    renderer.render(<span>after unmount</span>);

    expect(renderer.container).toHaveTextContent('after unmount');
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

  describe('setupTestRenderer', () => {
    const renderer = setupTestRenderer();
    const containers: HTMLDivElement[] = [];

    afterEach(() => {
      containers.push(renderer.container);
    });

    it('provides a renderer in the current test', () => {
      renderer.render(<span>first setup renderer</span>);

      expect(renderer.container).toHaveTextContent('first setup renderer');
    });

    it('creates a fresh renderer for each test', () => {
      renderer.render(<span>second setup renderer</span>);

      expect(renderer.container).toHaveTextContent('second setup renderer');
      expect(renderer.container).not.toBe(containers[0]);
    });
  });
});
