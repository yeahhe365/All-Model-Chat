import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { SavedChatSession } from '../../../types';
import { useChatSessionActions } from './useChatSessionActions';
import { renderHook } from '@/test/testUtils';

vi.mock('../../../utils/appUtils', () => ({
  cleanupFilePreviewUrls: vi.fn(),
}));

const createSession = (timestamp: number): SavedChatSession => ({
  id: 'session-1',
  title: 'Old Title',
  timestamp,
  messages: [
    {
      id: 'message-1',
      role: 'user',
      content: 'hello',
      timestamp: new Date('2026-04-18T00:00:00.000Z'),
    },
  ],
  settings: {} as SavedChatSession['settings'],
});

describe('useChatSessionActions', () => {
  it('refreshes the session timestamp when clearing the active chat', () => {
    let sessions = [createSession(1)];
    const updateAndPersistSessions = vi.fn((updater: (prev: SavedChatSession[]) => SavedChatSession[]) => {
      sessions = updater(sessions);
    });

    const { result, unmount } = renderHook(() =>
      useChatSessionActions({
        activeSessionId: 'session-1',
        isLoading: false,
        updateAndPersistSessions,
        setCurrentChatSettings: vi.fn(),
        setSelectedFiles: vi.fn(),
        handleStopGenerating: vi.fn(),
        startNewChat: vi.fn(),
        handleTogglePinSession: vi.fn(),
      }),
    );

    act(() => {
      result.current.handleClearCurrentChat();
    });

    expect(sessions[0].messages).toEqual([]);
    expect(sessions[0].title).toBe('New Chat');
    expect(sessions[0].timestamp).toBeGreaterThan(1);

    unmount();
  });
});
