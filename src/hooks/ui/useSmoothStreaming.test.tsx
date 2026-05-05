import { act } from 'react';
import { setupTestRenderer } from '@/test/testUtils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSmoothStreaming } from './useSmoothStreaming';

const OUTPUT_SELECTOR = '[data-testid="stream-output"]';

const TestComponent = ({ text, isStreaming }: { text: string; isStreaming: boolean }) => {
  const displayedText = useSmoothStreaming(text, isStreaming);
  return <div data-testid="stream-output">{displayedText}</div>;
};

describe('useSmoothStreaming', () => {
  const renderer = setupTestRenderer();
  let nextAnimationFrameId: number;
  let scheduledFrames: Map<number, FrameRequestCallback>;
  let currentTime: number;

  const flushNextFrame = () => {
    const nextFrame = scheduledFrames.entries().next().value as [number, FrameRequestCallback] | undefined;

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
      if (renderer.container.querySelector(OUTPUT_SELECTOR)?.textContent === expectedText) {
        return;
      }

      if (!flushNextFrame()) {
        return;
      }
    }
  };

  beforeEach(() => {
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
      }),
    );

    vi.stubGlobal(
      'cancelAnimationFrame',
      vi.fn((frameId: number) => {
        scheduledFrames.delete(frameId);
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('stops scheduling animation frames after catching up to the current text', () => {
    act(() => {
      renderer.root.render(<TestComponent text="abc" isStreaming />);
    });

    expect(scheduledFrames.size).toBe(1);

    flushUntilTextMatches('abc');

    expect(renderer.container.querySelector(OUTPUT_SELECTOR)).toHaveTextContent('abc');
    expect(scheduledFrames.size).toBe(0);
  });

  it('restarts animation when new streamed text arrives after the previous text finished rendering', () => {
    act(() => {
      renderer.root.render(<TestComponent text="abc" isStreaming />);
    });

    flushUntilTextMatches('abc');

    expect(renderer.container.querySelector(OUTPUT_SELECTOR)).toHaveTextContent('abc');
    expect(scheduledFrames.size).toBe(0);

    act(() => {
      renderer.root.render(<TestComponent text="abcdef" isStreaming />);
    });

    expect(scheduledFrames.size).toBe(1);

    flushUntilTextMatches('abcdef');

    expect(renderer.container.querySelector(OUTPUT_SELECTOR)).toHaveTextContent('abcdef');
    expect(scheduledFrames.size).toBe(0);
  });

  it('bypasses character-by-character animation for markdown tables while streaming', () => {
    const tableMarkdown = ['| Name | Score |', '| --- | --- |', '| Alice | 42 |'].join('\n');

    act(() => {
      renderer.root.render(<TestComponent text={tableMarkdown} isStreaming />);
    });

    expect(renderer.container.querySelector(OUTPUT_SELECTOR)?.textContent).toBe(tableMarkdown);
    expect(scheduledFrames.size).toBe(0);
  });
});
