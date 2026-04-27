import { describe, expect, it } from 'vitest';
import { DEFAULT_MODEL_ID } from '../../constants/modelConstants';
import type { SavedChatSession } from '../../types';
import { mergeSessionMetadata } from '../sessionRefresh';

const makeSession = (overrides: Partial<SavedChatSession> = {}): SavedChatSession => ({
  id: 'session',
  title: 'Session',
  timestamp: 0,
  messages: [],
  settings: {} as SavedChatSession['settings'],
  ...overrides,
});

describe('sessionRefresh', () => {
  it('merges refreshed metadata without replacing active runtime messages', () => {
    const runtimeMessage = {
      id: 'runtime-message',
      role: 'model' as const,
      content: 'streaming',
      timestamp: new Date(),
    };
    const previousSession = makeSession({
      id: 'active',
      title: 'Local Title',
      timestamp: 1,
      messages: [runtimeMessage],
      settings: { temperature: 0.7 } as SavedChatSession['settings'],
    });
    const incomingMetadata = makeSession({
      id: 'active',
      title: 'Persisted Title',
      timestamp: 2,
      messages: [],
      settings: {} as SavedChatSession['settings'],
    });

    const merged = mergeSessionMetadata([previousSession], [incomingMetadata], {
      activeSessionId: 'active',
      loadingSessionIds: new Set(),
    });

    expect(merged).toHaveLength(1);
    expect(merged[0].messages).toEqual([runtimeMessage]);
    expect(merged[0].title).toBe('Local Title');
    expect(merged[0].settings.modelId).toBe(DEFAULT_MODEL_ID);
    expect(merged[0].settings.temperature).toBe(0.7);
  });

  it('keeps loading session messages and strips inactive non-loading messages', () => {
    const loadingMessage = {
      id: 'loading-message',
      role: 'model' as const,
      content: 'partial',
      timestamp: new Date(),
    };
    const inactiveMessage = {
      id: 'inactive-message',
      role: 'user' as const,
      content: 'archived',
      timestamp: new Date(),
    };

    const merged = mergeSessionMetadata(
      [
        makeSession({ id: 'loading', messages: [loadingMessage], timestamp: 1 }),
        makeSession({ id: 'inactive', messages: [inactiveMessage], timestamp: 2 }),
      ],
      [makeSession({ id: 'inactive', timestamp: 2 }), makeSession({ id: 'loading', timestamp: 1 })],
      {
        activeSessionId: null,
        loadingSessionIds: new Set(['loading']),
      },
    );

    expect(merged.find((session) => session.id === 'loading')?.messages).toEqual([loadingMessage]);
    expect(merged.find((session) => session.id === 'inactive')?.messages).toEqual([]);
  });

  it('sorts merged sessions and preserves local sessions absent from refreshed metadata', () => {
    const merged = mergeSessionMetadata(
      [makeSession({ id: 'local-only', timestamp: 3 })],
      [makeSession({ id: 'old', timestamp: 1 }), makeSession({ id: 'pinned', timestamp: 2, isPinned: true })],
      {
        activeSessionId: null,
        loadingSessionIds: new Set(),
      },
    );

    expect(merged.map((session) => session.id)).toEqual(['pinned', 'local-only', 'old']);
  });
});
