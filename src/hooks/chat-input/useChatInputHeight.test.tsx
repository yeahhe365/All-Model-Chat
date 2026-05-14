import { act, useEffect, useLayoutEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupTestRenderer } from '@/test/testUtils';
import { useChatInputHeight } from './useChatInputHeight';

const createRect = (height: number): DOMRect =>
  ({
    width: 320,
    height,
    top: 0,
    left: 0,
    right: 320,
    bottom: height,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  }) as DOMRect;

class ManualResizeObserver implements ResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    activeResizeCallback = callback;
  }

  observe(target: Element) {
    observedElement = target;
  }

  unobserve() {
    observedElement = null;
  }

  disconnect() {
    observedElement = null;
  }

  takeRecords() {
    return [];
  }
}

let activeResizeCallback: ResizeObserverCallback | null = null;
let observedElement: Element | null = null;
let measuredHeight = 160.8;

const emitObservedResize = () => {
  if (!observedElement || !activeResizeCallback) {
    return;
  }

  activeResizeCallback(
    [
      {
        target: observedElement,
        contentRect: observedElement.getBoundingClientRect(),
      } as ResizeObserverEntry,
    ],
    {} as ResizeObserver,
  );
};

const ChatInputHeightProbe = ({ onHeight }: { onHeight: (height: number) => void }) => {
  const { chatInputHeight, chatInputContainerRef } = useChatInputHeight();

  useLayoutEffect(() => {
    const inputElement = chatInputContainerRef.current;
    if (!inputElement) {
      return;
    }

    Object.defineProperty(inputElement, 'offsetHeight', {
      configurable: true,
      get: () => Math.round(measuredHeight),
    });
    inputElement.getBoundingClientRect = () => createRect(measuredHeight);
  }, [chatInputContainerRef]);

  useEffect(() => {
    onHeight(chatInputHeight);
  }, [chatInputHeight, onHeight]);

  return <div ref={chatInputContainerRef} />;
};

describe('useChatInputHeight', () => {
  const renderer = setupTestRenderer();

  beforeEach(() => {
    activeResizeCallback = null;
    observedElement = null;
    measuredHeight = 160.8;
    vi.stubGlobal('ResizeObserver', ManualResizeObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('preserves fractional CSS pixel heights from browser layout measurements', () => {
    const reportedHeights: number[] = [];

    renderer.render(<ChatInputHeightProbe onHeight={(height) => reportedHeights.push(height)} />);

    expect(reportedHeights.at(-1)).toBe(160.8);

    act(() => {
      measuredHeight = 174.6;
      emitObservedResize();
    });

    expect(reportedHeights.at(-1)).toBe(174.6);
  });
});
