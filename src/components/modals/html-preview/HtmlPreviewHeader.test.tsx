import { act } from 'react';
import { createTestRenderer, type TestRenderer } from '@/test/testUtils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HtmlPreviewHeader } from './HtmlPreviewHeader';

describe('HtmlPreviewHeader', () => {
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

  it('disables screenshot until the preview reports ready', () => {
    act(() => {
      root.render(
        <HtmlPreviewHeader
          title="Preview"
          scale={1}
          isTrueFullscreen={false}
          isPreviewReady={false}
          isScreenshotting={false}
          minZoom={0.25}
          maxZoom={3}
          onZoomIn={vi.fn()}
          onZoomOut={vi.fn()}
          onRefresh={vi.fn()}
          onDownload={vi.fn()}
          onScreenshot={vi.fn()}
          onToggleFullscreen={vi.fn()}
          onClose={vi.fn()}
        />,
      );
    });

    const screenshotButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.getAttribute('title') === 'Screenshot',
    );

    expect(screenshotButton).not.toBeUndefined();
    expect((screenshotButton as HTMLButtonElement).disabled).toBe(true);
  });

  it('adds visible keyboard focus styles to the close action', () => {
    act(() => {
      root.render(
        <HtmlPreviewHeader
          title="Preview"
          scale={1}
          isTrueFullscreen={false}
          isPreviewReady={true}
          isScreenshotting={false}
          minZoom={0.25}
          maxZoom={3}
          onZoomIn={vi.fn()}
          onZoomOut={vi.fn()}
          onRefresh={vi.fn()}
          onDownload={vi.fn()}
          onScreenshot={vi.fn()}
          onToggleFullscreen={vi.fn()}
          onClose={vi.fn()}
        />,
      );
    });

    const closeButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.getAttribute('title') === 'Close',
    );

    expect(closeButton?.className).toContain('focus-visible:ring-2');
  });
});
