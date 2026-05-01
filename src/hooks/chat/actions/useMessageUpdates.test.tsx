import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useMessageUpdates } from './useMessageUpdates';
import { renderHook } from '@/test/testUtils';

describe('useMessageUpdates', () => {
  it('creates and updates a live model message when generated files arrive before text', () => {
    let sessions = [
      {
        id: 'session-1',
        title: 'Live Session',
        timestamp: Date.now(),
        messages: [],
        settings: {} as any,
      },
    ];

    const updateAndPersistSessions = vi.fn(
      (updater: typeof sessions | ((prev: typeof sessions) => typeof sessions)) => {
        sessions =
          typeof updater === 'function' ? (updater as (prev: typeof sessions) => typeof sessions)(sessions) : updater;
        return sessions;
      },
    );

    const { result, unmount } = renderHook(() =>
      useMessageUpdates({
        activeSessionId: 'session-1',
        setActiveSessionId: vi.fn(),
        appSettings: {} as any,
        currentChatSettings: {} as any,
        updateAndPersistSessions: updateAndPersistSessions as any,
        userScrolledUpRef: { current: false },
      }),
    );

    const generatedFile = {
      id: 'file-1',
      name: 'chart.png',
      type: 'image/png',
      size: 123,
      uploadState: 'active',
    } as any;

    act(() => {
      result.current.handleLiveTranscript('', 'model', false, 'content', undefined, [generatedFile]);
    });

    expect(sessions[0].messages).toHaveLength(1);
    expect(sessions[0].messages[0]).toEqual(
      expect.objectContaining({
        role: 'model',
        content: '',
        files: [generatedFile],
        isLoading: true,
      }),
    );

    act(() => {
      result.current.handleLiveTranscript('Done.', 'model', true, 'content');
    });

    expect(sessions[0].messages[0]).toEqual(
      expect.objectContaining({
        role: 'model',
        content: 'Done.',
        files: [generatedFile],
        isLoading: false,
      }),
    );

    unmount();
  });

  it('creates a new live session when generated files arrive before any transcript text', () => {
    let sessions: any[] = [];

    const updateAndPersistSessions = vi.fn(
      (updater: typeof sessions | ((prev: typeof sessions) => typeof sessions)) => {
        sessions =
          typeof updater === 'function' ? (updater as (prev: typeof sessions) => typeof sessions)(sessions) : updater;
        return sessions;
      },
    );
    const setActiveSessionId = vi.fn();

    const { result, unmount } = renderHook(() =>
      useMessageUpdates({
        activeSessionId: null,
        setActiveSessionId,
        appSettings: {} as any,
        currentChatSettings: {} as any,
        updateAndPersistSessions: updateAndPersistSessions as any,
        userScrolledUpRef: { current: false },
      }),
    );

    const generatedFile = {
      id: 'file-1',
      name: 'chart.png',
      type: 'image/png',
      size: 123,
      uploadState: 'active',
    } as any;

    act(() => {
      result.current.handleLiveTranscript('', 'model', false, 'content', undefined, [generatedFile]);
    });

    expect(setActiveSessionId).toHaveBeenCalledTimes(1);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].title).toBe('Live Session');
    expect(sessions[0].messages).toHaveLength(1);
    expect(sessions[0].messages[0]).toEqual(
      expect.objectContaining({
        role: 'model',
        files: [generatedFile],
        isLoading: true,
      }),
    );

    unmount();
  });
});
