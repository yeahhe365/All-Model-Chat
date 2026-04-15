import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useMessageStream } from './useMessageStream';
import { streamingStore } from '../../services/streamingStore';

const renderHook = <T,>(callback: () => T) => {
  const container = document.createElement('div');
  const root = createRoot(container);
  const result: { current: T | null } = { current: null };

  const TestComponent = () => {
    result.current = callback();
    return null;
  };

  act(() => {
    root.render(<TestComponent />);
  });

  return {
    result: result as { current: T },
    rerender: () => {
      act(() => {
        root.render(<TestComponent />);
      });
    },
    unmount: () => {
      act(() => {
        root.unmount();
      });
    },
  };
};

describe('useMessageStream', () => {
  beforeEach(() => {
    streamingStore.clear('message-stream');
  });

  afterEach(() => {
    streamingStore.clear('message-stream');
  });

  it('returns live store snapshots while streaming and resets when streaming stops', () => {
    let isStreaming = true;

    const { result, rerender, unmount } = renderHook(() =>
      useMessageStream('message-stream', isStreaming),
    );

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
});
