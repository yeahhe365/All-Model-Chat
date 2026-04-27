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

const TestCodeBlock = ({
  text,
  measurements,
  className = 'language-ts',
}: {
  text: string;
  measurements: Measurements;
  className?: string;
}) => {
  const { preRef, showPreview, finalLanguage } = useCodeBlock({
    children: <code>{text}</code>,
    className,
    expandCodeBlocksByDefault: false,
    onOpenHtmlPreview: () => {},
    onOpenSidePanel: () => {},
  });

  return (
    <pre
      data-show-preview={String(showPreview)}
      data-language={finalLanguage}
      ref={(node) => {
        (preRef as MutableRefObject<HTMLPreElement | null>).current = node;

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

  it('does not expose html preview controls for embedded html inside javascript code', () => {
    act(() => {
      root.render(
        <TestCodeBlock
          text={'const template = `<html><body>Hello</body></html>`;'}
          measurements={measurements}
          className="language-js"
        />,
      );
    });

    const pre = container.querySelector('pre');
    expect(pre?.dataset.showPreview).toBe('false');
    expect(pre?.dataset.language).toBe('js');
  });

  it('does not treat generic xml blocks as previewable html', () => {
    act(() => {
      root.render(
        <TestCodeBlock text={'<note><to>Jane</to></note>'} measurements={measurements} className="language-xml" />,
      );
    });

    const pre = container.querySelector('pre');
    expect(pre?.dataset.showPreview).toBe('false');
    expect(pre?.dataset.language).toBe('xml');
  });
});
