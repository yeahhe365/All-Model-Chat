import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HtmlPreviewContent } from '../modals/html-preview/HtmlPreviewContent';

describe('HtmlPreviewContent', () => {
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

  it('renders the preview iframe without same-origin privileges', () => {
    act(() => {
      root.render(
        <HtmlPreviewContent
          iframeRef={{ current: null }}
          htmlContent="<html><body>Hello</body></html>"
          scale={1}
          t={((key: string, fallback?: string) => fallback ?? key) as never}
        />
      );
    });

    const iframe = container.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute('sandbox')).not.toContain('allow-same-origin');
  });
});
