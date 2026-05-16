import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMessageStream } from './useMessageStream';
import { streamingStore } from '@/services/streamingStore';
import { renderHook } from '@/test/testUtils';

describe('useMessageStream', () => {
  let nextAnimationFrameId: number;
  let scheduledFrames: Map<number, FrameRequestCallback>;

  const flushAnimationFrames = () => {
    for (const [frameId, callback] of Array.from(scheduledFrames.entries())) {
      scheduledFrames.delete(frameId);
      act(() => {
        callback(16);
      });
    }
  };

  beforeEach(() => {
    vi.useFakeTimers();
    nextAnimationFrameId = 0;
    scheduledFrames = new Map<number, FrameRequestCallback>();
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
    streamingStore.clear('message-stream');
    streamingStore.clear('stale-stream');
    streamingStore.clear('active-stream');
    streamingStore.clear('batched-stream');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    streamingStore.clear('message-stream');
    streamingStore.clear('stale-stream');
    streamingStore.clear('active-stream');
    streamingStore.clear('batched-stream');
  });

  it('returns live store snapshots while streaming and resets when streaming stops', () => {
    let isStreaming = true;

    const { result, rerender, unmount } = renderHook(() => useMessageStream('message-stream', isStreaming));

    expect(result.current.streamContent).toBe('');
    expect(result.current.streamThoughts).toBe('');

    act(() => {
      streamingStore.updateContent('message-stream', 'Hello');
      streamingStore.updateThoughts('message-stream', 'Thinking');
    });
    flushAnimationFrames();

    expect(result.current.streamContent).toBe('Hello');
    expect(result.current.streamThoughts).toBe('Thinking');

    isStreaming = false;
    rerender();

    expect(result.current.streamContent).toBe('');
    expect(result.current.streamThoughts).toBe('');

    unmount();
  });

  it('batches high-frequency stream notifications into a single animation frame', () => {
    const listener = vi.fn();
    const unsubscribe = streamingStore.subscribe('batched-stream', listener);

    streamingStore.updateContent('batched-stream', 'Hel');
    streamingStore.updateContent('batched-stream', 'lo');
    streamingStore.updateThoughts('batched-stream', 'Thinking');

    expect(streamingStore.getContent('batched-stream')).toBe('Hello');
    expect(streamingStore.getThoughts('batched-stream')).toBe('Thinking');
    expect(listener).not.toHaveBeenCalled();
    expect(scheduledFrames.size).toBe(1);

    flushAnimationFrames();

    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
  });

  it('evicts abandoned stream entries after the gc ttl elapses', () => {
    vi.useFakeTimers();

    streamingStore.updateContent('stale-stream', 'orphaned');
    streamingStore.updateThoughts('stale-stream', 'left behind');

    vi.advanceTimersByTime(5 * 60_000 + 1);

    streamingStore.sweepExpiredEntries();

    expect(streamingStore.getContent('stale-stream')).toBe('');
    expect(streamingStore.getThoughts('stale-stream')).toBe('');
  });

  it('does not evict stream entries that still have active listeners', () => {
    vi.useFakeTimers();

    const unsubscribe = streamingStore.subscribe('active-stream', () => undefined);

    streamingStore.updateContent('active-stream', 'still active');
    vi.advanceTimersByTime(5 * 60_000 + 1);

    streamingStore.sweepExpiredEntries();

    expect(streamingStore.getContent('active-stream')).toBe('still active');

    unsubscribe();
    vi.advanceTimersByTime(5 * 60_000 + 1);

    streamingStore.sweepExpiredEntries();

    expect(streamingStore.getContent('active-stream')).toBe('');
  });
});
