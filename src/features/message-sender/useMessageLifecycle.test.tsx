import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { handleApiErrorMock, createMessageMock } = vi.hoisted(() => ({
  handleApiErrorMock: vi.fn(),
  createMessageMock: vi.fn((role: string, content: string, options: Record<string, unknown> = {}) => ({
    id: options.id ?? `${role}-message`,
    role,
    content,
    timestamp: new Date('2026-05-01T00:00:00.000Z'),
    ...options,
  })),
}));

vi.mock('./useApiErrorHandler', () => ({
  useApiErrorHandler: () => ({
    handleApiError: handleApiErrorMock,
  }),
}));

vi.mock('../../utils/chat/session', () => ({
  createMessage: createMessageMock,
}));

import { useMessageLifecycle } from './useMessageLifecycle';
import { renderHook } from '@/test/testUtils';

describe('useMessageLifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates loading model placeholders with the shared message shape', () => {
    const setSessionLoading = vi.fn();
    const activeJobs = { current: new Map<string, AbortController>() };
    const { result, unmount } = renderHook(() =>
      useMessageLifecycle({
        updateAndPersistSessions: vi.fn(),
        setSessionLoading,
        activeJobs,
      }),
    );
    const generationStartTime = new Date('2026-05-01T08:00:00.000Z');

    const message = result.current.createLoadingModelMessage({
      id: 'generation-1',
      generationStartTime,
      excludeFromContext: true,
    });

    expect(createMessageMock).toHaveBeenCalledWith('model', '', {
      id: 'generation-1',
      isLoading: true,
      generationStartTime,
      excludeFromContext: true,
    });
    expect(message).toEqual(
      expect.objectContaining({
        id: 'generation-1',
        role: 'model',
        isLoading: true,
        generationStartTime,
        excludeFromContext: true,
      }),
    );

    unmount();
  });

  it('registers loading state and always clears jobs after successful work', async () => {
    const setSessionLoading = vi.fn();
    const activeJobs = { current: new Map<string, AbortController>() };
    const abortController = new AbortController();
    const execute = vi.fn(async () => 'ok');
    const { result, unmount } = renderHook(() =>
      useMessageLifecycle({
        updateAndPersistSessions: vi.fn(),
        setSessionLoading,
        activeJobs,
      }),
    );

    const value = await act(async () =>
      result.current.runMessageLifecycle({
        sessionId: 'session-1',
        generationId: 'generation-1',
        abortController,
        execute,
      }),
    );

    expect(value).toBe('ok');
    expect(setSessionLoading).toHaveBeenNthCalledWith(1, 'session-1', true);
    expect(setSessionLoading).toHaveBeenLastCalledWith('session-1', false);
    expect(activeJobs.current.has('generation-1')).toBe(false);
    expect(execute).toHaveBeenCalledOnce();

    unmount();
  });

  it('delegates failed work to the API error handler and clears lifecycle state', async () => {
    const setSessionLoading = vi.fn();
    const activeJobs = { current: new Map<string, AbortController>() };
    const abortController = new AbortController();
    const error = new Error('boom');
    const { result, unmount } = renderHook(() =>
      useMessageLifecycle({
        updateAndPersistSessions: vi.fn(),
        setSessionLoading,
        activeJobs,
      }),
    );

    await act(async () => {
      await result.current.runMessageLifecycle({
        sessionId: 'session-1',
        generationId: 'generation-1',
        modelMessageId: 'model-message-1',
        abortController,
        errorPrefix: 'Image Edit Error',
        execute: async () => {
          throw error;
        },
      });
    });

    expect(handleApiErrorMock).toHaveBeenCalledWith(error, 'session-1', 'model-message-1', 'Image Edit Error');
    expect(setSessionLoading).toHaveBeenLastCalledWith('session-1', false);
    expect(activeJobs.current.has('generation-1')).toBe(false);

    unmount();
  });

  it('allows senders with stream handlers to own error handling', async () => {
    const setSessionLoading = vi.fn();
    const activeJobs = { current: new Map<string, AbortController>() };
    const abortController = new AbortController();
    const error = new Error('stream broke');
    const onError = vi.fn();
    const { result, unmount } = renderHook(() =>
      useMessageLifecycle({
        updateAndPersistSessions: vi.fn(),
        setSessionLoading,
        activeJobs,
      }),
    );

    await act(async () => {
      await result.current.runMessageLifecycle({
        sessionId: 'session-1',
        generationId: 'generation-1',
        abortController,
        onError,
        execute: async () => {
          throw error;
        },
      });
    });

    expect(onError).toHaveBeenCalledWith(error);
    expect(handleApiErrorMock).not.toHaveBeenCalled();
    expect(setSessionLoading).toHaveBeenLastCalledWith('session-1', false);
    expect(activeJobs.current.has('generation-1')).toBe(false);

    unmount();
  });
});
