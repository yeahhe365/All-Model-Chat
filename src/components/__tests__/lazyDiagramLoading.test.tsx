import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WindowProvider } from '../../contexts/WindowContext';

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
          }) as IntersectionObserverEntry
      );

      this.callback(entries, this as unknown as IntersectionObserver);
    };
  }

  (globalThis as any).IntersectionObserver = MockIntersectionObserver;

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
          t={(key) => key}
          themeId="pearl"
          onOpenSidePanel={vi.fn()}
        />
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
  });

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
          t={(key) => key}
          themeId="pearl"
          onOpenSidePanel={vi.fn()}
        />
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
  });

  it('does not eagerly import MermaidBlock or GraphvizBlock for plain markdown content', async () => {
    vi.doMock('../message/blocks/MermaidBlock', () => {
      throw new Error('MermaidBlock should not load for plain markdown');
    });
    vi.doMock('../message/blocks/GraphvizBlock', () => {
      throw new Error('GraphvizBlock should not load for plain markdown');
    });

    const { MarkdownRenderer } = await import('../message/MarkdownRenderer');
    const { container } = renderIntoDom(
      <MarkdownRenderer
        content="Regular paragraph\n\n```ts\nconst value = 1;\n```"
        isLoading={false}
        onImageClick={vi.fn()}
        onOpenHtmlPreview={vi.fn()}
        expandCodeBlocksByDefault={false}
        isMermaidRenderingEnabled
        isGraphvizRenderingEnabled
        t={(key) => key}
        themeId="pearl"
        onOpenSidePanel={vi.fn()}
      />
    );

    expect(container.textContent).toContain('Regular paragraph');
  });

  it('does not eagerly import pyodideService for a non-python code block', async () => {
    let pyodideImported = false;

    vi.doMock('../../services/pyodideService', () => {
      pyodideImported = true;
      return {
        pyodideService: {
          runPython: vi.fn(),
          mountFiles: vi.fn(),
        },
      };
    });

    const { CodeBlock } = await import('../message/blocks/CodeBlock');
    renderIntoDom(
      <CodeBlock
        className="language-ts"
        onOpenHtmlPreview={vi.fn()}
        expandCodeBlocksByDefault={false}
        t={(key) => key}
        onOpenSidePanel={vi.fn()}
      >
        <code className="language-ts">{'const value = 1;'}</code>
      </CodeBlock>
    );

    expect(pyodideImported).toBe(false);
  });

  it('does not eagerly import pyodideService when loading the standard API interaction hook', async () => {
    let pyodideImported = false;

    vi.doMock('../../services/pyodideService', () => {
      pyodideImported = true;
      return {
        pyodideService: {
          runPython: vi.fn(),
          mountFiles: vi.fn(),
        },
      };
    });

    await import('../../hooks/message-sender/standard/useApiInteraction');

    expect(pyodideImported).toBe(false);
  });

  it('does not eagerly import geminiService when loading the message sender hook', async () => {
    let geminiImported = false;

    vi.doMock('../../services/geminiService', () => {
      geminiImported = true;
      return {
        geminiServiceInstance: {},
      };
    });

    await import('../../hooks/useMessageSender');

    expect(geminiImported).toBe(false);
  });

  it('does not eagerly import baseApi when loading the message sender hook', async () => {
    let baseApiImported = false;

    vi.doMock('../../services/api/baseApi', () => {
      baseApiImported = true;
      return {
        buildGenerationConfig: vi.fn(),
      };
    });

    await import('../../hooks/useMessageSender');

    expect(baseApiImported).toBe(false);
  });

  it('does not eagerly import geminiService when loading the chat hook', async () => {
    let geminiImported = false;

    vi.doMock('../../services/geminiService', () => {
      geminiImported = true;
      return {
        geminiServiceInstance: {},
      };
    });

    await import('../../hooks/chat/useChat');

    expect(geminiImported).toBe(false);
  });

  it('does not eagerly import baseApi when loading the chat hook', async () => {
    let baseApiImported = false;

    vi.doMock('../../services/api/baseApi', () => {
      baseApiImported = true;
      return {
        POLLING_INTERVAL_MS: 2000,
        MAX_POLLING_DURATION_MS: 600000,
        buildGenerationConfig: vi.fn(),
        getConfiguredApiClient: vi.fn(),
      };
    });

    await import('../../hooks/chat/useChat');

    expect(baseApiImported).toBe(false);
  });

  it('does not eagerly import geminiService when loading MessageThoughts', async () => {
    let geminiImported = false;

    vi.doMock('../../services/geminiService', () => {
      geminiImported = true;
      return {
        geminiServiceInstance: {},
      };
    });

    await import('../message/content/MessageThoughts');

    expect(geminiImported).toBe(false);
  });

  it('does not eagerly import geminiService when loading token count logic', async () => {
    let geminiImported = false;

    vi.doMock('../../services/geminiService', () => {
      geminiImported = true;
      return {
        geminiServiceInstance: {},
      };
    });

    await import('../../hooks/features/useTokenCountLogic');

    expect(geminiImported).toBe(false);
  });

  it('does not eagerly import baseApi when loading useLiveAPI', async () => {
    let baseApiImported = false;

    vi.doMock('../../services/api/baseApi', () => {
      baseApiImported = true;
      return {
        getConfiguredApiClient: vi.fn(),
      };
    });

    await import('../../hooks/useLiveAPI');

    expect(baseApiImported).toBe(false);
  });

  it('does not eagerly import MarkdownRenderer when loading MessageText', async () => {
    let markdownImported = false;

    vi.doMock('../message/MarkdownRenderer', () => {
      markdownImported = true;
      return {
        MarkdownRenderer: () => <div>Markdown loaded</div>,
      };
    });

    await import('../message/content/MessageText');

    expect(markdownImported).toBe(false);
  });

  it('does not eagerly import MarkdownRenderer when loading MessageThoughts', async () => {
    let markdownImported = false;

    vi.doMock('../message/MarkdownRenderer', () => {
      markdownImported = true;
      return {
        MarkdownRenderer: () => <div>Markdown loaded</div>,
      };
    });

    await import('../message/content/MessageThoughts');

    expect(markdownImported).toBe(false);
  });

  it('does not eagerly import MarkdownRenderer when loading ChatQuoteDisplay', async () => {
    let markdownImported = false;

    vi.doMock('../message/MarkdownRenderer', () => {
      markdownImported = true;
      return {
        MarkdownRenderer: () => <div>Markdown loaded</div>,
      };
    });

    await import('../chat/input/area/ChatQuoteDisplay');

    expect(markdownImported).toBe(false);
  });

  it('does not eagerly import MarkdownRenderer when loading CreateFileBody', async () => {
    let markdownImported = false;

    vi.doMock('../message/MarkdownRenderer', () => {
      markdownImported = true;
      return {
        MarkdownRenderer: () => <div>Markdown loaded</div>,
      };
    });

    await import('../modals/create-file/CreateFileBody');

    expect(markdownImported).toBe(false);
  });

  it('does not eagerly import GroundedResponse when loading MessageText', async () => {
    let groundedResponseImported = false;

    vi.doMock('../message/GroundedResponse', () => {
      groundedResponseImported = true;
      return {
        GroundedResponse: () => <div>Grounded response loaded</div>,
      };
    });

    await import('../message/content/MessageText');

    expect(groundedResponseImported).toBe(false);
  });

  it('does not eagerly import MermaidBlock or GraphvizBlock for html side panel content', async () => {
    vi.doMock('../message/blocks/MermaidBlock', () => {
      throw new Error('MermaidBlock should not load for html side panel content');
    });
    vi.doMock('../message/blocks/GraphvizBlock', () => {
      throw new Error('GraphvizBlock should not load for html side panel content');
    });

    const { SidePanel } = await import('../layout/SidePanel');
    const { container } = renderIntoDom(
      <WindowProvider>
        <SidePanel
          content={{ type: 'html', content: '<html><body>Hello</body></html>', title: 'Preview' }}
          onClose={vi.fn()}
          themeId="pearl"
        />
      </WindowProvider>
    );

    expect(container.querySelector('iframe')).not.toBeNull();
  });
});
