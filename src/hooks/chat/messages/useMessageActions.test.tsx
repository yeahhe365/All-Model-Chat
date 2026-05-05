import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage, SavedChatSession } from '../../../types';
import { createChatSettings } from '../../../test/factories';

vi.mock('../../../services/logService', async () => {
  const { createLogServiceMockModule } = await import('../../../test/moduleMockDoubles');

  return createLogServiceMockModule();
});

import { useMessageActions } from './useMessageActions';
import { renderHook } from '@/test/testUtils';

describe('useMessageActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
        setActiveSessionId: vi.fn(),
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

  it('forks the active session through the selected message and switches to the new session', () => {
    const messages: ChatMessage[] = [
      {
        id: 'user-1',
        role: 'user',
        content: 'first prompt',
        timestamp: new Date('2026-04-29T00:00:00.000Z'),
      },
      {
        id: 'model-1',
        role: 'model',
        content: 'first answer',
        timestamp: new Date('2026-04-29T00:00:01.000Z'),
      },
      {
        id: 'user-2',
        role: 'user',
        content: 'second prompt',
        timestamp: new Date('2026-04-29T00:00:02.000Z'),
      },
      {
        id: 'model-2',
        role: 'model',
        content: 'second answer',
        timestamp: new Date('2026-04-29T00:00:03.000Z'),
      },
    ];
    let sessions: SavedChatSession[] = [
      {
        id: 'session-current',
        title: 'Original chat',
        timestamp: 1,
        messages,
        settings: createChatSettings(),
      },
    ];
    const updateAndPersistSessions = vi.fn((updater: (prev: SavedChatSession[]) => SavedChatSession[]) => {
      sessions = updater(sessions);
    });
    const setActiveSessionId = vi.fn();

    const { result, unmount } = renderHook(() =>
      useMessageActions({
        messages,
        isLoading: false,
        activeSessionId: 'session-current',
        editingMessageId: null,
        activeJobs: { current: new Map() },
        setCommandedInput: vi.fn(),
        setSelectedFiles: vi.fn(),
        setEditingMessageId: vi.fn(),
        setEditMode: vi.fn(),
        setAppFileError: vi.fn(),
        updateAndPersistSessions,
        setActiveSessionId,
        userScrolledUpRef: { current: false },
        handleSendMessage: vi.fn(),
        setSessionLoading: vi.fn(),
      }),
    );

    act(() => {
      result.current.handleForkMessage('model-1');
    });

    expect(sessions).toHaveLength(2);
    expect(sessions[0].id).not.toBe('session-current');
    expect(sessions[0].title).toBe('Original chat (Fork)');
    expect(sessions[0].messages.map((message) => message.content)).toEqual(['first prompt', 'first answer']);
    expect(sessions[0].messages.map((message) => message.id)).not.toEqual(['user-1', 'model-1']);
    expect(setActiveSessionId).toHaveBeenCalledWith(sessions[0].id, { history: 'push' });

    unmount();
  });
});
