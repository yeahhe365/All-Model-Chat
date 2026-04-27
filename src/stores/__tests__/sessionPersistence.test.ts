import { describe, expect, it } from 'vitest';
import type { ChatMessage, SavedChatSession } from '../../types';
import {
  createVirtualFullSessions,
  getSessionPersistenceChanges,
  mergePersistedSessionMessages,
  stripStoredSessionMessages,
} from '../sessionPersistence';

const makeMessage = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 'message',
  role: 'user',
  content: 'Hello',
  timestamp: new Date(),
  ...overrides,
});

const makeSession = (overrides: Partial<SavedChatSession> = {}): SavedChatSession => ({
  id: 'session',
  title: 'Session',
  timestamp: 0,
  messages: [],
  settings: {} as SavedChatSession['settings'],
  ...overrides,
});

describe('sessionPersistence', () => {
  it('builds a virtual full session list using active messages', () => {
    const activeMessages = [makeMessage({ id: 'active-message' })];
    const inactiveSession = makeSession({
      id: 'inactive',
      messages: [makeMessage({ id: 'inactive-message' })],
    });

    const virtualSessions = createVirtualFullSessions(
      [makeSession({ id: 'active', messages: [] }), inactiveSession],
      'active',
      activeMessages,
    );

    expect(virtualSessions.find((session) => session.id === 'active')?.messages).toBe(activeMessages);
    expect(virtualSessions.find((session) => session.id === 'inactive')).toBe(inactiveSession);
  });

  it('detects modified sessions by reference and removed sessions by id', () => {
    const unchanged = makeSession({ id: 'unchanged' });
    const changedBefore = makeSession({ id: 'changed', title: 'Before' });
    const changedAfter = { ...changedBefore, title: 'After' };
    const removed = makeSession({ id: 'removed' });

    const changes = getSessionPersistenceChanges([unchanged, changedBefore, removed], [changedAfter, unchanged]);

    expect(changes.modifiedSessions).toEqual([changedAfter]);
    expect(changes.deletedSessionIds).toEqual(['removed']);
  });

  it('restores persisted messages when saving a metadata-only inactive session', () => {
    const persistedMessage = makeMessage({ id: 'persisted-message' });
    const metadataUpdate = makeSession({
      id: 'archive',
      title: 'Updated Title',
      messages: [],
      settings: { temperature: 0.3 } as SavedChatSession['settings'],
    });
    const persistedSession = makeSession({
      id: 'archive',
      title: 'Old Title',
      messages: [persistedMessage],
      settings: { topP: 0.9 } as SavedChatSession['settings'],
    });

    const merged = mergePersistedSessionMessages(metadataUpdate, persistedSession);

    expect(merged.title).toBe('Updated Title');
    expect(merged.messages).toEqual([persistedMessage]);
    expect(merged.settings).toEqual({
      topP: 0.9,
      temperature: 0.3,
    });
  });

  it('strips messages from stored sessions except active and loading sessions', () => {
    const activeMessage = makeMessage({ id: 'active-message' });
    const loadingMessage = makeMessage({ id: 'loading-message' });
    const inactiveMessage = makeMessage({ id: 'inactive-message' });

    const stored = stripStoredSessionMessages(
      [
        makeSession({ id: 'active', messages: [activeMessage] }),
        makeSession({ id: 'loading', messages: [loadingMessage] }),
        makeSession({ id: 'inactive', messages: [inactiveMessage] }),
      ],
      'active',
      new Set(['loading']),
    );

    expect(stored.find((session) => session.id === 'active')?.messages).toEqual([activeMessage]);
    expect(stored.find((session) => session.id === 'loading')?.messages).toEqual([loadingMessage]);
    expect(stored.find((session) => session.id === 'inactive')?.messages).toEqual([]);
  });
});
