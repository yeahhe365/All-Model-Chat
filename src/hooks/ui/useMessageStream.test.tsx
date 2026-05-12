import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMessageStream } from './useMessageStream';
import { streamingStore } from '@/services/streamingStore';
import { renderHook } from '@/test/testUtils';

describe('useMessageStream', () => {
  beforeEach(() => {
    vi.useRealTimers();
    streamingStore.clear('message-stream');
    streamingStore.clear('stale-stream');
    streamingStore.clear('active-stream');
  });

  afterEach(() => {
    vi.useRealTimers();
    streamingStore.clear('message-stream');
    streamingStore.clear('stale-stream');
    streamingStore.clear('active-stream');
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

    expect(result.current.streamContent).toBe('Hello');
    expect(result.current.streamThoughts).toBe('Thinking');

    isStreaming = false;
    rerender();

    expect(result.current.streamContent).toBe('');
    expect(result.current.streamThoughts).toBe('');

    unmount();
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
