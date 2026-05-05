import { act } from 'react';
import { setupTestRenderer } from '@/test/testUtils';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./LazyMarkdownRenderer', () => ({
  LazyMarkdownRenderer: ({ content }: { content: string }) => <div data-testid="markdown">{content}</div>,
}));

import { GroundedResponse } from './GroundedResponse';

describe('GroundedResponse', () => {
  const renderer = setupTestRenderer();

  it('does not render fallback search query pills without an API-provided search entry point', () => {
    act(() => {
      renderer.root.render(
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

    expect(renderer.container.textContent).not.toContain('resplendent quetzal reference');
    expect(renderer.container.querySelector('a[href*="google.com/search"]')).toBeNull();
  });

  it('renders the API-provided search entry point widget when available', () => {
    act(() => {
      renderer.root.render(
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

    const surface = renderer.container.querySelector('.search-entry-surface') as HTMLDivElement | null;
    expect(surface).not.toBeNull();
    expect(surface?.shadowRoot).not.toBeNull();
    expect(surface?.shadowRoot?.querySelector('[data-testid="search-entry-widget"]')?.textContent).toContain(
      'Suggested follow-up search',
    );
    expect(renderer.container.querySelector('[data-testid="search-entry-google-logo"]')).not.toBeNull();
    expect(renderer.container.textContent).not.toContain('.container { display: flex; }');
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
      renderer.root.render(
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

    const surface = renderer.container.querySelector('.search-entry-surface') as HTMLDivElement | null;
    expect(surface?.shadowRoot?.querySelector('[data-testid="search-entry-widget"]')).not.toBeNull();
    expect(renderer.container.textContent).not.toContain('latest world news April 18 2026');
  });
});
