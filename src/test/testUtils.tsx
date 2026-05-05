import type { ComponentType, JSXElementConstructor, PropsWithChildren, ReactNode } from 'react';
import { render as testingLibraryRender } from '@testing-library/react';
import type { RenderOptions, RenderResult } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

export type TestWrapper = ComponentType<PropsWithChildren> | JSXElementConstructor<{ children: ReactNode }>;

export type RenderHookOptions = Omit<RenderOptions, 'wrapper'> & {
  attachToDocument?: boolean;
  wrapper?: TestWrapper;
};

export const render = (ui: ReactNode, options?: RenderOptions) => testingLibraryRender(ui, options);

export type TestRenderer = {
  readonly container: HTMLDivElement;
  render: (ui: ReactNode) => void;
  unmount: () => void;
};

type SetupTestRenderer = TestRenderer & {
  readonly root: TestRenderer;
};

export type TestRendererOptions = RenderOptions & {
  attachToDocument?: boolean;
};

const activeTestRenderers = new Set<TestRenderer>();

afterEach(() => {
  for (const renderer of Array.from(activeTestRenderers)) {
    renderer.unmount();
  }
  activeTestRenderers.clear();
});

export const createTestRenderer = (options: TestRendererOptions = {}): TestRenderer => {
  const { attachToDocument = true, ...renderOptions } = options;
  let container = document.createElement('div');
  let view: RenderResult | null = null;
  let hasUnmounted = false;

  const renderer: TestRenderer = {
    get container() {
      return container;
    },
    render: (ui: ReactNode) => {
      if (view) {
        view.rerender(ui);
        return;
      }

      if (hasUnmounted) {
        container = document.createElement('div');
        hasUnmounted = false;
      }

      activeTestRenderers.add(renderer);

      if (attachToDocument && !container.isConnected) {
        document.body.appendChild(container);
      }

      view = testingLibraryRender(ui, {
        ...renderOptions,
        baseElement: renderOptions.baseElement ?? (attachToDocument ? document.body : container),
        container,
      });
    },
    unmount: () => {
      view?.unmount();
      view = null;
      container.remove();
      hasUnmounted = true;
      activeTestRenderers.delete(renderer);
    },
  };

  activeTestRenderers.add(renderer);
  return renderer;
};

export const setupTestRenderer = (options: TestRendererOptions = {}): SetupTestRenderer => {
  let renderer: TestRenderer | null = null;

  beforeEach(() => {
    renderer = createTestRenderer(options);
  });

  return {
    get root() {
      return renderer!;
    },
    get container() {
      return renderer!.container;
    },
    render: (ui: ReactNode) => {
      renderer!.render(ui);
    },
    unmount: () => {
      renderer!.unmount();
    },
  };
};

export const renderHook = <T,>(callback: () => T, options: RenderHookOptions = {}) => {
  const { attachToDocument = false, wrapper: Wrapper, ...renderOptions } = options;
  const container = document.createElement('div');
  if (attachToDocument) {
    document.body.appendChild(container);
  }

  const result: { current: T | null } = { current: null };
  let currentCallback = callback;

  const TestComponent = () => {
    result.current = currentCallback();
    return null;
  };

  const renderNode = () =>
    Wrapper ? (
      <Wrapper>
        <TestComponent />
      </Wrapper>
    ) : (
      <TestComponent />
    );

  const view = testingLibraryRender(renderNode(), {
    ...renderOptions,
    baseElement: renderOptions.baseElement ?? (attachToDocument ? document.body : container),
    container,
  });

  return {
    result: result as { current: T },
    rerender: (nextCallback?: () => T) => {
      if (nextCallback) {
        currentCallback = nextCallback;
      }
      view.rerender(renderNode());
    },
    unmount: () => {
      view.unmount();
      container.remove();
    },
  };
};

export const createDeferred = <T = void,>() => {
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
