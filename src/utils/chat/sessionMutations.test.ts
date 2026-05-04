import { describe, expect, it } from 'vitest';
import type { SavedChatSession } from '../../types';
import { insertMessageAfter, updateFileInMessage, updateMessageInSession, updateSessionById } from './sessionMutations';

const makeSession = (id: string): SavedChatSession => ({
  id,
  title: id,
  timestamp: 1,
  groupId: null,
  settings: {} as any,
  messages: [],
});

describe('sessionMutations', () => {
  it('updates a session by id without rebuilding unrelated sessions', () => {
    const target = makeSession('target');
    const other = makeSession('other');
    const sessions = [target, other];

    const next = updateSessionById(sessions, 'target', (session) => ({ ...session, title: 'Updated' }));

    expect(next[0]).toEqual(expect.objectContaining({ id: 'target', title: 'Updated' }));
    expect(next[1]).toBe(other);
  });

  it('updates a nested message and file through focused helpers', () => {
    const sessions: SavedChatSession[] = [
      {
        ...makeSession('session-1'),
        messages: [
          {
            id: 'message-1',
            role: 'user',
            content: 'hello',
            timestamp: new Date('2026-05-04T00:00:00.000Z'),
            files: [
              { id: 'file-1', name: 'a.png', type: 'image/png', size: 1 },
              { id: 'file-2', name: 'b.png', type: 'image/png', size: 2 },
            ] as any,
          },
        ],
      },
    ];

    const withMessage = updateMessageInSession(sessions, 'session-1', 'message-1', { content: 'updated' });
    const withFile = updateFileInMessage(withMessage, 'session-1', 'message-1', 'file-2', {
      mediaResolution: 'low',
    } as any);

    expect(withFile[0].messages[0]).toEqual(expect.objectContaining({ content: 'updated' }));
    expect(withFile[0].messages[0].files?.[0]).toBe(sessions[0].messages[0].files?.[0]);
    expect(withFile[0].messages[0].files?.[1]).toEqual(
      expect.objectContaining({ id: 'file-2', mediaResolution: 'low' }),
    );
  });

  it('inserts a message after a source message or appends when the source is missing', () => {
    const inserted = {
      id: 'inserted',
      role: 'model' as const,
      content: '',
      timestamp: new Date('2026-05-04T00:01:00.000Z'),
    };
    const sessions: SavedChatSession[] = [
      {
        ...makeSession('session-1'),
        messages: [
          { id: 'first', role: 'user', content: 'one', timestamp: new Date('2026-05-04T00:00:00.000Z') },
          { id: 'second', role: 'model', content: 'two', timestamp: new Date('2026-05-04T00:00:01.000Z') },
        ],
      },
    ];

    const afterFirst = insertMessageAfter(sessions, 'session-1', 'first', inserted);
    const appended = insertMessageAfter(sessions, 'session-1', 'missing', inserted);

    expect(afterFirst[0].messages.map((message) => message.id)).toEqual(['first', 'inserted', 'second']);
    expect(appended[0].messages.map((message) => message.id)).toEqual(['first', 'second', 'inserted']);
  });
});
