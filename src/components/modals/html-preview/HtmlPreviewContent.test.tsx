import { act } from 'react';
import { setupTestRenderer } from '@/test/testUtils';
import { describe, expect, it } from 'vitest';
import React from 'react';
import { HtmlPreviewContent } from './HtmlPreviewContent';

describe('HtmlPreviewContent', () => {
  const renderer = setupTestRenderer();

  it('renders the iframe with a safe sandbox and bridged srcDoc content', () => {
    const iframeRef = React.createRef<HTMLIFrameElement>();

    act(() => {
      renderer.root.render(
        <HtmlPreviewContent iframeRef={iframeRef} htmlContent="<html><body>Hello</body></html>" scale={1} />,
      );
    });

    const iframe = renderer.container.querySelector('iframe');
    expect(iframe?.getAttribute('sandbox')).toBe('allow-scripts allow-forms allow-popups allow-modals allow-downloads');
    expect(iframe?.getAttribute('srcdoc')).toContain('parent.postMessage');
  });
});
