import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { ChatMessage, SavedChatSession, UploadedFile } from '../../../types';
import { dbService } from '../../../utils/db';
import { useSessionActions } from './useSessionActions';
import { renderHook } from '@/test/testUtils';

vi.mock('../../../utils/db', () => ({
  dbService: {
    getSession: vi.fn(),
  },
}));

vi.mock('../../../utils/appUtils', () => ({
  createNewSession: vi.fn((settings, messages, title) => ({
    id: `copy-${Math.random().toString(36).slice(2, 8)}`,
    title,
    messages,
    settings,
    timestamp: Date.now(),
  })),
  logService: {
    info: vi.fn(),
  },
  cleanupFilePreviewUrls: vi.fn(),
  generateUniqueId: vi.fn(() => `generated-${Math.random().toString(36).slice(2, 8)}`),
}));

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
  it('duplicates attachments with fresh file ids', async () => {
    let sessions: SavedChatSession[] = [createSession()];
    vi.mocked(dbService.getSession).mockResolvedValue(sessions[0]);
    const updateAndPersistSessions = vi.fn((updater: (prev: SavedChatSession[]) => SavedChatSession[]) => {
      sessions = updater(sessions);
    });

    const { result, unmount } = renderHook(() =>
      useSessionActions({
        updateAndPersistSessions,
        activeJobs: { current: new Map() },
      }),
    );

    await act(async () => {
      await result.current.handleDuplicateSession('session-1');
    });

    expect(sessions).toHaveLength(2);
    expect(sessions[0].id).not.toBe('session-1');
    expect(sessions[0].messages[0].id).not.toBe(sessions[1].messages[0].id);
    expect(sessions[0].messages[0].files?.[0].id).not.toBe(sessions[1].messages[0].files?.[0].id);

    unmount();
  });

  it('duplicates a metadata-only session using the persisted full history', async () => {
    const persistedSession = createSession({
      id: 'session-2',
      title: 'Persisted',
      messages: [createMessage({ id: 'persisted-message' })],
    });
    let sessions: SavedChatSession[] = [{ ...persistedSession, messages: [] }];
    vi.mocked(dbService.getSession).mockResolvedValue(persistedSession);

    const updateAndPersistSessions = vi.fn((updater: (prev: SavedChatSession[]) => SavedChatSession[]) => {
      sessions = updater(sessions);
    });

    const { result, unmount } = renderHook(() =>
      useSessionActions({
        updateAndPersistSessions,
        activeJobs: { current: new Map() },
      }),
    );

    await act(async () => {
      await result.current.handleDuplicateSession('session-2');
    });

    expect(sessions).toHaveLength(2);
    expect(sessions[0].title).toBe('Persisted (Copy)');
    expect(sessions[0].messages).toHaveLength(1);
    expect(sessions[0].messages[0].content).toBe('hello');

    unmount();
  });
});
