import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../services/logService', () => ({
  logService: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { useMessageActions } from './useMessageActions';

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
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

describe('useMessageActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('does not abort unrelated active jobs when the current session has no loading message', () => {
    const otherAbort = vi.fn();
    const activeJobs = {
      current: new Map<string, AbortController>([['job-other', { abort: otherAbort } as unknown as AbortController]]),
    };
    const setSessionLoading = vi.fn();

    const { result, unmount } = renderHook(() =>
      useMessageActions({
        messages: [],
        isLoading: true,
        activeSessionId: 'session-current',
        editingMessageId: null,
        activeJobs,
        setCommandedInput: vi.fn(),
        setSelectedFiles: vi.fn(),
        setEditingMessageId: vi.fn(),
        setEditMode: vi.fn(),
        setAppFileError: vi.fn(),
        updateAndPersistSessions: vi.fn(),
        userScrolledUpRef: { current: false },
        handleSendMessage: vi.fn(),
        setSessionLoading,
      }),
    );

    act(() => {
      result.current.handleStopGenerating();
    });

    expect(otherAbort).not.toHaveBeenCalled();
    expect(setSessionLoading).toHaveBeenCalledWith('session-current', false);
    unmount();
  });
});
