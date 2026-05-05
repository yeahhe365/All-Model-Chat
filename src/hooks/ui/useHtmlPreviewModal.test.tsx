import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PropsWithChildren, RefObject } from 'react';
import { WindowProvider } from '../../contexts/WindowContext';
import { useHtmlPreviewModal } from './useHtmlPreviewModal';
import { HTML_PREVIEW_MESSAGE_CHANNEL } from '../../utils/htmlPreview';
import { renderHook } from '@/test/testUtils';

vi.mock('./useFullscreen', () => ({
  useFullscreen: () => ({
    enterFullscreen: vi.fn(),
    exitFullscreen: vi.fn(),
  }),
}));

const HtmlPreviewWrapper = ({ children }: PropsWithChildren) => (
  <WindowProvider window={window} document={document}>
    {children}
  </WindowProvider>
);

describe('useHtmlPreviewModal', () => {
  beforeEach(() => {});

  afterEach(() => {});

  it('tracks iframe readiness from bridge messages', () => {
    const iframe = document.createElement('iframe');
    const contentWindowStub = {} as Window;
    Object.defineProperty(iframe, 'contentWindow', {
      value: contentWindowStub,
      configurable: true,
    });
    const iframeRef = { current: iframe } as RefObject<HTMLIFrameElement>;

    const { result, unmount } = renderHook(
      () =>
        useHtmlPreviewModal({
          isOpen: true,
          onClose: vi.fn(),
          htmlContent: '<html><body>Hello</body></html>',
          iframeRef,
        }),
      { attachToDocument: true, wrapper: HtmlPreviewWrapper },
    );

    expect(result.current.isPreviewReady).toBe(false);

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { channel: HTML_PREVIEW_MESSAGE_CHANNEL, event: 'ready' },
          source: contentWindowStub,
        }),
      );
    });

    expect(result.current.isPreviewReady).toBe(true);

    unmount();
  });

  it('closes the preview when the sandboxed iframe reports Escape', () => {
    const onClose = vi.fn();
    const iframe = document.createElement('iframe');
    const contentWindowStub = {} as Window;
    Object.defineProperty(iframe, 'contentWindow', {
      value: contentWindowStub,
      configurable: true,
    });
    const iframeRef = { current: iframe } as RefObject<HTMLIFrameElement>;

    const { unmount } = renderHook(
      () =>
        useHtmlPreviewModal({
          isOpen: true,
          onClose,
          htmlContent: '<html><body>Hello</body></html>',
          iframeRef,
        }),
      { attachToDocument: true, wrapper: HtmlPreviewWrapper },
    );

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { channel: HTML_PREVIEW_MESSAGE_CHANNEL, event: 'escape' },
          source: contentWindowStub,
        }),
      );
    });

    expect(onClose).toHaveBeenCalledTimes(1);

    unmount();
  });
});
