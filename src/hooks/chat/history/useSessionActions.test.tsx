import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import type { ChatMessage, SavedChatSession, UploadedFile } from '../../../types';
import { useSessionActions } from './useSessionActions';

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
    },
  };
};

const createFile = (overrides: Partial<UploadedFile> = {}): UploadedFile => ({
  id: 'file-1',
  name: 'notes.txt',
  type: 'text/plain',
  size: 5,
  rawFile: new File(['hello'], 'notes.txt', { type: 'text/plain' }),
  ...overrides,
});

const createMessage = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 'message-1',
  role: 'user',
  content: 'hello',
  timestamp: new Date('2026-04-19T00:00:00.000Z'),
  files: [createFile()],
  ...overrides,
});

const createSession = (overrides: Partial<SavedChatSession> = {}): SavedChatSession => ({
  id: 'session-1',
  title: 'Original',
  timestamp: 1,
  messages: [createMessage()],
  settings: {} as SavedChatSession['settings'],
  ...overrides,
});

describe('useSessionActions', () => {
  it('duplicates attachments with fresh file ids', () => {
    let sessions = [createSession()];
    const updateAndPersistSessions = vi.fn((updater: (prev: SavedChatSession[]) => SavedChatSession[]) => {
      sessions = updater(sessions);
    });

    const { result, unmount } = renderHook(() =>
      useSessionActions({
        updateAndPersistSessions,
        activeJobs: { current: new Map() },
      }),
    );

    act(() => {
      result.current.handleDuplicateSession('session-1');
    });

    expect(sessions).toHaveLength(2);
    expect(sessions[0].id).not.toBe('session-1');
    expect(sessions[0].messages[0].id).not.toBe(sessions[1].messages[0].id);
    expect(sessions[0].messages[0].files?.[0].id).not.toBe(sessions[1].messages[0].files?.[0].id);

    unmount();
  });
});
