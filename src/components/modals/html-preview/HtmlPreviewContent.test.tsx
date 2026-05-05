import { act } from 'react';
import { createTestRenderer, type TestRenderer } from '@/test/testUtils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import React from 'react';
import { HtmlPreviewContent } from './HtmlPreviewContent';

describe('HtmlPreviewContent', () => {
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

  it('renders the iframe with a safe sandbox and bridged srcDoc content', () => {
    const iframeRef = React.createRef<HTMLIFrameElement>();

    act(() => {
      root.render(<HtmlPreviewContent iframeRef={iframeRef} htmlContent="<html><body>Hello</body></html>" scale={1} />);
    });

    const iframe = container.querySelector('iframe');
    expect(iframe?.getAttribute('sandbox')).toBe('allow-scripts allow-forms allow-popups allow-modals allow-downloads');
    expect(iframe?.getAttribute('srcdoc')).toContain('parent.postMessage');
  });
});
