import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RefObject } from 'react';
import { WindowProvider } from '../../contexts/WindowContext';
import { useHtmlPreviewModal } from './useHtmlPreviewModal';
import { HTML_PREVIEW_MESSAGE_CHANNEL } from '../../utils/htmlPreview';

vi.mock('./useFullscreen', () => ({
  useFullscreen: () => ({
    enterFullscreen: vi.fn(),
    exitFullscreen: vi.fn(),
  }),
}));

const renderHook = <T,>(callback: () => T) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const result: { current: T | null } = { current: null };

  const TestComponent = () => {
    result.current = callback();
    return null;
  };

  act(() => {
    root.render(
      <WindowProvider window={window} document={document}>
        <TestComponent />
      </WindowProvider>,
    );
  });

  return {
    result: result as { current: T },
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

describe('useHtmlPreviewModal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('tracks iframe readiness from bridge messages', () => {
    const iframe = document.createElement('iframe');
    const contentWindowStub = {} as Window;
    Object.defineProperty(iframe, 'contentWindow', {
      value: contentWindowStub,
      configurable: true,
    });
    const iframeRef = { current: iframe } as RefObject<HTMLIFrameElement>;

    const { result, unmount } = renderHook(() =>
      useHtmlPreviewModal({
        isOpen: true,
        onClose: vi.fn(),
        htmlContent: '<html><body>Hello</body></html>',
        iframeRef,
      }),
    );

    expect(result.current.isPreviewReady).toBe(false);

    act(() => {
      window.dispatchEvent(new MessageEvent('message', {
        data: { channel: HTML_PREVIEW_MESSAGE_CHANNEL, event: 'ready' },
        source: contentWindowStub,
      }));
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

    const { unmount } = renderHook(() =>
      useHtmlPreviewModal({
        isOpen: true,
        onClose,
        htmlContent: '<html><body>Hello</body></html>',
        iframeRef,
      }),
    );

    act(() => {
      window.dispatchEvent(new MessageEvent('message', {
        data: { channel: HTML_PREVIEW_MESSAGE_CHANNEL, event: 'escape' },
        source: contentWindowStub,
      }));
    });

    expect(onClose).toHaveBeenCalledTimes(1);

    unmount();
  });
});
