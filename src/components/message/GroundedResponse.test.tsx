import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./LazyMarkdownRenderer', () => ({
  LazyMarkdownRenderer: ({ content }: { content: string }) => <div data-testid="markdown">{content}</div>,
}));

import { GroundedResponse } from './GroundedResponse';

describe('GroundedResponse', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders image search queries when provided by grounding metadata', () => {
    act(() => {
      root.render(
        <GroundedResponse
          text="Grounded image"
          metadata={{ imageSearchQueries: ['resplendent quetzal reference'] }}
          urlContextMetadata={undefined}
          isLoading={false}
          onOpenHtmlPreview={() => undefined}
          expandCodeBlocksByDefault={false}
          onImageClick={() => undefined}
          isMermaidRenderingEnabled={false}
          isGraphvizRenderingEnabled={false}
          t={(key) => key}
          themeId="pearl"
          onOpenSidePanel={() => undefined}
        />,
      );
    });

    expect(container.textContent).toContain('resplendent quetzal reference');
    const searchLink = container.querySelector('a[href*="google.com/search"]');
    expect(searchLink?.getAttribute('href')).toContain(
      encodeURIComponent('resplendent quetzal reference'),
    );
  });

  it('renders the API-provided search entry point widget when available', () => {
    act(() => {
      root.render(
        <GroundedResponse
          text="Grounded text"
          metadata={{
            searchEntryPoint: {
              renderedContent:
                '<div data-testid="search-entry-widget">Suggested follow-up search</div>',
            },
          }}
          urlContextMetadata={undefined}
          isLoading={false}
          onOpenHtmlPreview={() => undefined}
          expandCodeBlocksByDefault={false}
          onImageClick={() => undefined}
          isMermaidRenderingEnabled={false}
          isGraphvizRenderingEnabled={false}
          t={(key) => key}
          themeId="pearl"
          onOpenSidePanel={() => undefined}
        />,
      );
    });

    expect(container.querySelector('[data-testid="search-entry-widget"]')?.textContent).toContain(
      'Suggested follow-up search',
    );
  });
});
