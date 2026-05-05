import { act } from 'react';
import { createTestRenderer, type TestRenderer } from '@/test/testUtils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./LazyMarkdownRenderer', () => ({
  LazyMarkdownRenderer: ({ content }: { content: string }) => <div data-testid="markdown">{content}</div>,
}));

import { GroundedResponse } from './GroundedResponse';

describe('GroundedResponse', () => {
  let container: HTMLDivElement;
  let root: TestRenderer;

  beforeEach(() => {
    root = createTestRenderer();
    container = root.container;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
  });

  it('does not render fallback search query pills without an API-provided search entry point', () => {
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
          themeId="pearl"
          onOpenSidePanel={() => undefined}
        />,
      );
    });

    expect(container.textContent).not.toContain('resplendent quetzal reference');
    expect(container.querySelector('a[href*="google.com/search"]')).toBeNull();
  });

  it('renders the API-provided search entry point widget when available', () => {
    act(() => {
      root.render(
        <GroundedResponse
          text="Grounded text"
          metadata={{
            searchEntryPoint: {
              renderedContent:
                '<style>.secondary-logo { display: none; }</style><div class="container"><div class="leading-slot"><span class="google-logo" aria-label="Google"></span><div class="separator"></div><span class="secondary-logo">G</span></div><div data-testid="search-entry-widget">Suggested follow-up search</div></div>',
            },
          }}
          urlContextMetadata={undefined}
          isLoading={false}
          onOpenHtmlPreview={() => undefined}
          expandCodeBlocksByDefault={false}
          onImageClick={() => undefined}
          isMermaidRenderingEnabled={false}
          isGraphvizRenderingEnabled={false}
          themeId="pearl"
          onOpenSidePanel={() => undefined}
        />,
      );
    });

    const surface = container.querySelector('.search-entry-surface') as HTMLDivElement | null;
    expect(surface).not.toBeNull();
    expect(surface?.shadowRoot).not.toBeNull();
    expect(surface?.shadowRoot?.querySelector('[data-testid="search-entry-widget"]')?.textContent).toContain(
      'Suggested follow-up search',
    );
    expect(container.querySelector('[data-testid="search-entry-google-logo"]')).not.toBeNull();
    expect(container.textContent).not.toContain('.container { display: flex; }');
    expect(surface?.shadowRoot?.querySelector('.google-logo')).toBeNull();
    expect(surface?.shadowRoot?.querySelector('.secondary-logo')).toBeNull();
    expect(surface?.shadowRoot?.querySelector('.separator')).toBeNull();
    expect(surface?.shadowRoot?.querySelector('.leading-slot')).toBeNull();
    expect(surface?.shadowRoot?.querySelector('style')?.textContent).toContain('.container::before');
    expect(surface?.shadowRoot?.querySelector('style')?.textContent).not.toContain('.container > *::before');
    expect(surface?.className).toContain('custom-scrollbar');
  });

  it('hides fallback search query pills when the API-provided search entry point is available', () => {
    act(() => {
      root.render(
        <GroundedResponse
          text="Grounded text"
          metadata={{
            webSearchQueries: ['latest world news April 18 2026'],
            searchEntryPoint: {
              renderedContent: '<div data-testid="search-entry-widget">Suggested follow-up search</div>',
            },
          }}
          urlContextMetadata={undefined}
          isLoading={false}
          onOpenHtmlPreview={() => undefined}
          expandCodeBlocksByDefault={false}
          onImageClick={() => undefined}
          isMermaidRenderingEnabled={false}
          isGraphvizRenderingEnabled={false}
          themeId="pearl"
          onOpenSidePanel={() => undefined}
        />,
      );
    });

    const surface = container.querySelector('.search-entry-surface') as HTMLDivElement | null;
    expect(surface?.shadowRoot?.querySelector('[data-testid="search-entry-widget"]')).not.toBeNull();
    expect(container.textContent).not.toContain('latest world news April 18 2026');
  });
});
