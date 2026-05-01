import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../services/logService', () => ({
  logService: {
    recordApiKeyUsage: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

interface MountedRoot {
  container: HTMLDivElement;
  root: Root;
}

const mountedRoots: MountedRoot[] = [];

type MockIntersectionObserverInstance = {
  observe: (target: Element) => void;
  disconnect: () => void;
  unobserve: (target: Element) => void;
  trigger: (isIntersecting?: boolean) => void;
};

const installMockIntersectionObserver = () => {
  const originalIntersectionObserver = globalThis.IntersectionObserver;
  const instances: MockIntersectionObserverInstance[] = [];

  class MockIntersectionObserver implements MockIntersectionObserverInstance {
    private readonly callback: IntersectionObserverCallback;
    private readonly targets = new Set<Element>();

    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback;
      instances.push(this);
    }

    observe = (target: Element) => {
      this.targets.add(target);
    };

    disconnect = () => {
      this.targets.clear();
    };

    unobserve = (target: Element) => {
      this.targets.delete(target);
    };

    trigger = (isIntersecting = true) => {
      const entries = Array.from(this.targets).map(
        (target) =>
          ({
            isIntersecting,
            intersectionRatio: isIntersecting ? 1 : 0,
            target,
          }) as IntersectionObserverEntry,
      );

      this.callback(entries, this as unknown as IntersectionObserver);
    };
  }

  (globalThis as typeof globalThis & { IntersectionObserver?: typeof IntersectionObserver }).IntersectionObserver =
    MockIntersectionObserver as unknown as typeof IntersectionObserver;

  return {
    instances,
    restore: () => {
      if (originalIntersectionObserver) {
        globalThis.IntersectionObserver = originalIntersectionObserver;
      } else {
        delete (globalThis as Partial<typeof globalThis>).IntersectionObserver;
      }
    },
  };
};

const renderIntoDom = (ui: JSX.Element) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

  act(() => {
    root.render(ui);
  });

  const mounted = { container, root };
  mountedRoots.push(mounted);
  return mounted;
};

afterEach(() => {
  while (mountedRoots.length > 0) {
    const mounted = mountedRoots.pop()!;
    act(() => {
      mounted.root.unmount();
    });
    mounted.container.remove();
  }
  vi.resetModules();
  vi.doUnmock('../message/blocks/MermaidBlock');
  vi.doUnmock('../message/blocks/GraphvizBlock');
});

describe('lazy diagram loading', () => {
  it('defers MermaidBlock import until the diagram preview enters the viewport', async () => {
    const { instances, restore } = installMockIntersectionObserver();
    let mermaidImported = false;

    vi.doMock('../message/blocks/MermaidBlock', () => {
      mermaidImported = true;
      return {
        MermaidBlock: () => <div>Mermaid preview loaded</div>,
      };
    });

    try {
      const { MarkdownRenderer } = await import('../message/MarkdownRenderer');
      const { container } = renderIntoDom(
        <MarkdownRenderer
          content={'```mermaid\ngraph TD\n  A --> B\n```'}
          isLoading={false}
          onImageClick={vi.fn()}
          onOpenHtmlPreview={vi.fn()}
          expandCodeBlocksByDefault={false}
          isMermaidRenderingEnabled
          isGraphvizRenderingEnabled
          themeId="pearl"
          onOpenSidePanel={vi.fn()}
        />,
      );

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(mermaidImported).toBe(false);
      expect(instances).toHaveLength(1);

      act(() => {
        instances[0].trigger(true);
      });

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(mermaidImported).toBe(true);
      expect(container).toHaveTextContent('Mermaid preview loaded');
    } finally {
      restore();
    }
  }, 15_000);

  it('defers GraphvizBlock import until the diagram preview enters the viewport', async () => {
    const { instances, restore } = installMockIntersectionObserver();
    let graphvizImported = false;

    vi.doMock('../message/blocks/GraphvizBlock', () => {
      graphvizImported = true;
      return {
        GraphvizBlock: () => <div>Graphviz preview loaded</div>,
      };
    });

    try {
      const { MarkdownRenderer } = await import('../message/MarkdownRenderer');
      const { container } = renderIntoDom(
        <MarkdownRenderer
          content={'```dot\ndigraph G {\n  A -> B;\n}\n```'}
          isLoading={false}
          onImageClick={vi.fn()}
          onOpenHtmlPreview={vi.fn()}
          expandCodeBlocksByDefault={false}
          isMermaidRenderingEnabled
          isGraphvizRenderingEnabled
          themeId="pearl"
          onOpenSidePanel={vi.fn()}
        />,
      );

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(graphvizImported).toBe(false);
      expect(instances).toHaveLength(1);

      act(() => {
        instances[0].trigger(true);
      });

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(graphvizImported).toBe(true);
      expect(container).toHaveTextContent('Graphviz preview loaded');
    } finally {
      restore();
    }
  }, 15_000);
});
