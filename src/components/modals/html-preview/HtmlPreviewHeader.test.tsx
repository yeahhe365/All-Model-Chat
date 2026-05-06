import { act } from 'react';
import { setupTestRenderer } from '@/test/testUtils';
import { describe, expect, it, vi } from 'vitest';
import { HtmlPreviewHeader } from './HtmlPreviewHeader';

describe('HtmlPreviewHeader', () => {
  const renderer = setupTestRenderer();

  it('disables screenshot until the preview reports ready', () => {
    act(() => {
      renderer.root.render(
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

    const screenshotButton = Array.from(renderer.container.querySelectorAll('button')).find(
      (button) => button.getAttribute('title') === 'Screenshot',
    );

    expect(screenshotButton).not.toBeUndefined();
    expect((screenshotButton as HTMLButtonElement).disabled).toBe(true);
  });

  it('keeps the preview toolbar 20 percent shorter than the previous 56px height', () => {
    act(() => {
      renderer.root.render(
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

    expect(renderer.container.querySelector('header')?.className).toContain('h-[45px]');
  });

  it('adds visible keyboard focus styles to the close action', () => {
    act(() => {
      renderer.root.render(
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

    const closeButton = Array.from(renderer.container.querySelectorAll('button')).find(
      (button) => button.getAttribute('title') === 'Close',
    );

    expect(closeButton?.className).toContain('focus-visible:ring-2');
  });
});
