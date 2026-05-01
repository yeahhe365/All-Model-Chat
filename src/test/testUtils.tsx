import { act } from 'react';
import type { ComponentType, PropsWithChildren } from 'react';
import { createRoot } from 'react-dom/client';

type RenderHookOptions = {
  attachToDocument?: boolean;
  wrapper?: ComponentType<PropsWithChildren>;
};

export const renderHook = <T,>(callback: () => T, options: RenderHookOptions = {}) => {
  const container = document.createElement('div');
  if (options.attachToDocument) {
    document.body.appendChild(container);
  }

  const root = createRoot(container);
  const result: { current: T | null } = { current: null };
  let currentCallback = callback;

  const TestComponent = () => {
    result.current = currentCallback();
    return null;
  };

  const render = () => {
    const Wrapper = options.wrapper;
    act(() => {
      root.render(Wrapper ? <Wrapper><TestComponent /></Wrapper> : <TestComponent />);
    });
  };

  render();

  return {
    result: result as { current: T },
    rerender: (nextCallback?: () => T) => {
      if (nextCallback) {
        currentCallback = nextCallback;
      }
      render();
    },
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

export const createDeferred = <T = void>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (error?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

export const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
};
