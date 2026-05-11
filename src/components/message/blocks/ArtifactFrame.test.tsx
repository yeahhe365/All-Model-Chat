import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setupTestRenderer } from '@/test/testUtils';
import {
  HTML_PREVIEW_CLEAR_SELECTION_EVENT,
  HTML_PREVIEW_DIAGNOSTIC_EVENT,
  HTML_PREVIEW_MESSAGE_CHANNEL,
  HTML_PREVIEW_STREAM_RENDER_EVENT,
} from '../../../utils/htmlPreview';
import { ArtifactFrame } from './ArtifactFrame';

const createRect = (overrides: Partial<DOMRect> = {}): DOMRect =>
  ({
    width: 320,
    height: 180,
    top: 100,
    left: 50,
    right: 370,
    bottom: 280,
    x: 50,
    y: 100,
    toJSON: () => ({}),
    ...overrides,
  }) as DOMRect;

describe('ArtifactFrame', () => {
  const renderer = setupTestRenderer();

  afterEach(() => {
    vi.useRealTimers();
  });

  it('relays iframe text selections to the parent selection toolbar event', () => {
    const handleSelection = vi.fn();
    window.addEventListener('amc-live-artifact-selection', handleSelection);

    try {
      act(() => {
        renderer.root.render(<ArtifactFrame html="<section><p>Artifact text</p></section>" />);
      });

      const iframe = renderer.container.querySelector('iframe');
      expect(iframe).not.toBeNull();
      iframe!.getBoundingClientRect = () => createRect();

      act(() => {
        window.dispatchEvent(
          new MessageEvent('message', {
            data: {
              channel: HTML_PREVIEW_MESSAGE_CHANNEL,
              event: 'selection',
              payload: {
                text: 'Artifact text',
                copyText: 'Artifact text',
                rect: {
                  top: 20,
                  left: 30,
                  width: 90,
                  height: 18,
                  bottom: 38,
                },
              },
            },
            source: iframe!.contentWindow,
          }),
        );
      });

      expect(handleSelection).toHaveBeenCalledTimes(1);
      const event = handleSelection.mock.calls[0][0] as CustomEvent;
      expect(event.detail).toEqual({
        text: 'Artifact text',
        copyText: 'Artifact text',
        rect: {
          top: 120,
          left: 80,
          width: 90,
          height: 18,
          bottom: 138,
        },
      });
    } finally {
      window.removeEventListener('amc-live-artifact-selection', handleSelection);
    }
  });

  it('keeps streaming iframe srcdoc stable and posts html updates to the runner', () => {
    vi.useFakeTimers();

    act(() => {
      renderer.root.render(<ArtifactFrame html="<section>First chunk</section>" isLoading />);
    });

    const iframe = renderer.container.querySelector('iframe');
    expect(iframe).not.toBeNull();
    const initialSrcDoc = iframe!.getAttribute('srcdoc');
    expect(initialSrcDoc).toContain('data-amc-stream-preview-root');

    const postMessage = vi.fn();
    Object.defineProperty(iframe!, 'contentWindow', {
      configurable: true,
      value: { postMessage },
    });

    act(() => {
      renderer.root.render(<ArtifactFrame html="<section>Second chunk</section>" isLoading />);
    });

    expect(iframe!.getAttribute('srcdoc')).toBe(initialSrcDoc);
    expect(postMessage).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(iframe!.getAttribute('srcdoc')).toBe(initialSrcDoc);
    expect(postMessage).toHaveBeenCalledWith(
      {
        channel: HTML_PREVIEW_MESSAGE_CHANNEL,
        event: HTML_PREVIEW_STREAM_RENDER_EVENT,
        html: '<section>Second chunk</section>',
      },
      '*',
    );
  });

  it('flushes the latest streaming html during continuous updates', () => {
    vi.useFakeTimers();

    act(() => {
      renderer.root.render(<ArtifactFrame html="<section>Chunk 1</section>" isLoading />);
    });

    const iframe = renderer.container.querySelector('iframe');
    const postMessage = vi.fn();
    Object.defineProperty(iframe!, 'contentWindow', {
      configurable: true,
      value: { postMessage },
    });

    act(() => {
      renderer.root.render(<ArtifactFrame html="<section>Chunk 2</section>" isLoading />);
    });

    act(() => {
      vi.advanceTimersByTime(60);
    });

    act(() => {
      renderer.root.render(<ArtifactFrame html="<section>Chunk 3</section>" isLoading />);
    });

    act(() => {
      vi.advanceTimersByTime(60);
    });

    expect(postMessage).toHaveBeenCalledWith(
      {
        channel: HTML_PREVIEW_MESSAGE_CHANNEL,
        event: HTML_PREVIEW_STREAM_RENDER_EVENT,
        html: '<section>Chunk 3</section>',
      },
      '*',
    );
  });

  it('asks the sandboxed iframe to clear selection without reading cross-origin selection state', () => {
    const postMessage = vi.fn();
    const contentWindowStub = {
      postMessage,
      getSelection: vi.fn(() => {
        throw new DOMException('Blocked', 'SecurityError');
      }),
    } as unknown as Window;

    act(() => {
      renderer.root.render(<ArtifactFrame html="<section><p>Artifact text</p></section>" />);
    });

    const iframe = renderer.container.querySelector('iframe');
    Object.defineProperty(iframe!, 'contentWindow', {
      configurable: true,
      value: contentWindowStub,
    });

    act(() => {
      window.dispatchEvent(new CustomEvent('amc-live-artifact-clear-selection'));
    });

    expect(contentWindowStub.getSelection).not.toHaveBeenCalled();
    expect(postMessage).toHaveBeenCalledWith(
      {
        channel: HTML_PREVIEW_MESSAGE_CHANNEL,
        event: HTML_PREVIEW_CLEAR_SELECTION_EVENT,
      },
      '*',
    );
  });

  it('logs preview diagnostics reported by the sandboxed iframe', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      act(() => {
        renderer.root.render(<ArtifactFrame html="<section><img src='https://example.com/missing.png' alt='Missing'></section>" />);
      });

      const iframe = renderer.container.querySelector('iframe');

      act(() => {
        window.dispatchEvent(
          new MessageEvent('message', {
            data: {
              channel: HTML_PREVIEW_MESSAGE_CHANNEL,
              event: HTML_PREVIEW_DIAGNOSTIC_EVENT,
              payload: {
                type: 'resource-error',
                tagName: 'img',
                url: 'https://example.com/missing.png',
              },
            },
            source: iframe!.contentWindow,
          }),
        );
      });

      expect(warnSpy).toHaveBeenCalledWith('Live Artifact preview diagnostic:', {
        type: 'resource-error',
        tagName: 'img',
        url: 'https://example.com/missing.png',
      });
    } finally {
      warnSpy.mockRestore();
    }
  });
});
