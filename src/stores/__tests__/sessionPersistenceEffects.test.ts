import { describe, expect, it, vi } from 'vitest';
import type { SavedChatSession } from '../../types';
import { createChatSettings } from '../../test/factories';
import { persistSessionChanges } from '../sessionPersistenceEffects';

const makeSession = (overrides: Partial<SavedChatSession> = {}): SavedChatSession => ({
  id: 'session',
  title: 'Session',
  timestamp: 0,
  messages: [],
  settings: createChatSettings(),
  ...overrides,
});

describe('sessionPersistenceEffects', () => {
  it('saves a changed active session and broadcasts a content update', async () => {
    const session = makeSession({
      id: 'active',
      messages: [{ id: 'message', role: 'user', content: 'Hi', timestamp: new Date() }],
    });
    const saveSession = vi.fn();
    const broadcastSyncMessage = vi.fn();
    const sessionPersistVersions = new Map<string, number>();

    await persistSessionChanges({
      modifiedSessions: [session],
      deletedSessionIds: [],
      activeSessionId: 'active',
      sessionPersistVersions,
      getSession: vi.fn(),
      saveSession,
      deleteSession: vi.fn(),
      broadcastSyncMessage,
    });

    expect(sessionPersistVersions.get('active')).toBe(1);
    expect(saveSession).toHaveBeenCalledWith(session);
    expect(broadcastSyncMessage).toHaveBeenCalledWith({
      type: 'SESSION_CONTENT_UPDATED',
      sessionId: 'active',
    });
  });

  it('preserves persisted messages when saving a metadata-only inactive session', async () => {
    const persistedMessage = {
      id: 'persisted-message',
      role: 'model' as const,
      content: 'Keep me',
      timestamp: new Date(),
    };
    const session = makeSession({ id: 'archive', title: 'Renamed', messages: [] });
    const persistedSession = makeSession({
      id: 'archive',
      title: 'Archive',
      messages: [persistedMessage],
    });
    const saveSession = vi.fn();

    await persistSessionChanges({
      modifiedSessions: [session],
      deletedSessionIds: [],
      activeSessionId: null,
      sessionPersistVersions: new Map(),
      getSession: vi.fn(async () => persistedSession),
      saveSession,
      deleteSession: vi.fn(),
      broadcastSyncMessage: vi.fn(),
    });

    expect(saveSession).toHaveBeenCalledWith({
      ...persistedSession,
      ...session,
      settings: { ...persistedSession.settings, ...session.settings },
      messages: [persistedMessage],
    });
  });

  it('skips stale session saves when a newer persist version appears before DB lookup finishes', async () => {
    let resolvePersistedSession: (session: SavedChatSession) => void = () => {};
    const sessionPersistVersions = new Map<string, number>();
    const session = makeSession({ id: 'archive', messages: [] });
    const saveSession = vi.fn();

    const persistPromise = persistSessionChanges({
      modifiedSessions: [session],
      deletedSessionIds: [],
      activeSessionId: null,
      sessionPersistVersions,
      getSession: vi.fn(
        () =>
          new Promise<SavedChatSession>((resolve) => {
            resolvePersistedSession = resolve;
          }),
      ),
      saveSession,
      deleteSession: vi.fn(),
      broadcastSyncMessage: vi.fn(),
    });

    expect(sessionPersistVersions.get('archive')).toBe(1);
    sessionPersistVersions.set('archive', 2);
    resolvePersistedSession(makeSession({ id: 'archive', messages: [] }));
    await persistPromise;

    expect(saveSession).not.toHaveBeenCalled();
  });

  it('deletes removed sessions and broadcasts a sessions update', async () => {
    const deleteSession = vi.fn();
    const broadcastSyncMessage = vi.fn();

    await persistSessionChanges({
      modifiedSessions: [],
      deletedSessionIds: ['removed'],
      activeSessionId: null,
      sessionPersistVersions: new Map(),
      getSession: vi.fn(),
      saveSession: vi.fn(),
      deleteSession,
      broadcastSyncMessage,
    });

    expect(deleteSession).toHaveBeenCalledWith('removed');
    expect(broadcastSyncMessage).toHaveBeenCalledWith({ type: 'SESSIONS_UPDATED' });
  });
});
