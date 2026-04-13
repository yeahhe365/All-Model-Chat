import { act } from 'react';
import type { MutableRefObject } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCodeBlock } from './useCodeBlock';

interface Measurements {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}

const TestCodeBlock = ({ text, measurements }: { text: string; measurements: Measurements }) => {
  const { preRef } = useCodeBlock({
    children: <code>{text}</code>,
    className: 'language-ts',
    expandCodeBlocksByDefault: false,
    onOpenHtmlPreview: () => {},
    onOpenSidePanel: () => {},
  });

  return (
    <pre
      ref={(node) => {
        (
          preRef as MutableRefObject<HTMLPreElement | null>
        ).current = node;

        if (node && !(node as HTMLPreElement & { __measured?: boolean }).__measured) {
          Object.defineProperties(node, {
            scrollTop: {
              configurable: true,
              get: () => measurements.scrollTop,
              set: (value: number) => {
                measurements.scrollTop = value;
              },
            },
            scrollHeight: {
              configurable: true,
              get: () => measurements.scrollHeight,
            },
            clientHeight: {
              configurable: true,
              get: () => measurements.clientHeight,
            },
          });

          (node as HTMLPreElement & { __measured?: boolean }).__measured = true;
        }
      }}
    >
      <code>{text}</code>
    </pre>
  );
};

describe('useCodeBlock', () => {
  let container: HTMLDivElement;
  let root: Root;
  let measurements: Measurements;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(16);
      return 1;
    });

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    measurements = {
      scrollTop: 0,
      scrollHeight: 400,
      clientHeight: 100,
    };
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('keeps auto-follow enabled when layout growth fires scroll without the user moving upward', () => {
    act(() => {
      root.render(<TestCodeBlock text={'a'.repeat(400)} measurements={measurements} />);
    });

    measurements.scrollHeight = 500;

    act(() => {
      root.render(<TestCodeBlock text={'b'.repeat(500)} measurements={measurements} />);
    });

    expect(measurements.scrollTop).toBe(500);

    act(() => {
      vi.advanceTimersByTime(100);
    });

    measurements.scrollHeight = 650;

    act(() => {
      container.querySelector('pre')?.dispatchEvent(new Event('scroll'));
    });

    measurements.scrollHeight = 700;

    act(() => {
      root.render(<TestCodeBlock text={'c'.repeat(700)} measurements={measurements} />);
    });

    expect(measurements.scrollTop).toBe(700);
  });
});
