import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSmoothStreaming } from './useSmoothStreaming';

const OUTPUT_SELECTOR = '[data-testid="stream-output"]';

const TestComponent = ({ text, isStreaming }: { text: string; isStreaming: boolean }) => {
  const displayedText = useSmoothStreaming(text, isStreaming);
  return <div data-testid="stream-output">{displayedText}</div>;
};

describe('useSmoothStreaming', () => {
  let container: HTMLDivElement;
  let root: Root;
  let nextAnimationFrameId: number;
  let scheduledFrames: Map<number, FrameRequestCallback>;
  let currentTime: number;

  const flushNextFrame = () => {
    const nextFrame = scheduledFrames.entries().next().value as
      | [number, FrameRequestCallback]
      | undefined;

    if (!nextFrame) {
      return false;
    }

    const [frameId, callback] = nextFrame;
    scheduledFrames.delete(frameId);
    currentTime += 16;

    act(() => {
      callback(currentTime);
    });

    return true;
  };

  const flushUntilTextMatches = (expectedText: string, maxFrames = 20) => {
    for (let i = 0; i < maxFrames; i += 1) {
      if (container.querySelector(OUTPUT_SELECTOR)?.textContent === expectedText) {
        return;
      }

      if (!flushNextFrame()) {
        return;
      }
    }
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    nextAnimationFrameId = 0;
    scheduledFrames = new Map<number, FrameRequestCallback>();
    currentTime = 0;

    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    });

    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        const frameId = ++nextAnimationFrameId;
        scheduledFrames.set(frameId, callback);
        return frameId;
      })
    );

    vi.stubGlobal(
      'cancelAnimationFrame',
      vi.fn((frameId: number) => {
        scheduledFrames.delete(frameId);
      })
    );
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  it('stops scheduling animation frames after catching up to the current text', () => {
    act(() => {
      root.render(<TestComponent text="abc" isStreaming />);
    });

    expect(scheduledFrames.size).toBe(1);

    flushUntilTextMatches('abc');

    expect(container.querySelector(OUTPUT_SELECTOR)).toHaveTextContent('abc');
    expect(scheduledFrames.size).toBe(0);
  });

  it('restarts animation when new streamed text arrives after the previous text finished rendering', () => {
    act(() => {
      root.render(<TestComponent text="abc" isStreaming />);
    });

    flushUntilTextMatches('abc');

    expect(container.querySelector(OUTPUT_SELECTOR)).toHaveTextContent('abc');
    expect(scheduledFrames.size).toBe(0);

    act(() => {
      root.render(<TestComponent text="abcdef" isStreaming />);
    });

    expect(scheduledFrames.size).toBe(1);

    flushUntilTextMatches('abcdef');

    expect(container.querySelector(OUTPUT_SELECTOR)).toHaveTextContent('abcdef');
    expect(scheduledFrames.size).toBe(0);
  });

  it('bypasses character-by-character animation for markdown tables while streaming', () => {
    const tableMarkdown = ['| Name | Score |', '| --- | --- |', '| Alice | 42 |'].join('\n');

    act(() => {
      root.render(<TestComponent text={tableMarkdown} isStreaming />);
    });

    expect(container.querySelector(OUTPUT_SELECTOR)?.textContent).toBe(tableMarkdown);
    expect(scheduledFrames.size).toBe(0);
  });
});
