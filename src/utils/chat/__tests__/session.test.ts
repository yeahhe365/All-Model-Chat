import { describe, it, expect } from 'vitest';
import {
  createMessage,
  createNewSession,
  generateSessionTitle,
  performOptimisticSessionUpdate,
  sanitizeSessionForExport,
  updateSessionWithNewMessages,
} from '../session';
import { ChatMessage, SavedChatSession, ChatSettings } from '../../../types';
import { DEFAULT_CHAT_SETTINGS } from '../../../constants/appConstants';

const makeMessage = (role: 'user' | 'model' | 'error', content: string, extra?: Partial<ChatMessage>): ChatMessage => ({
  id: `msg-${Math.random().toString(36).slice(2, 8)}`,
  role,
  content,
  timestamp: new Date(),
  ...extra,
});

const makeSettings = (overrides?: Partial<ChatSettings>): ChatSettings => ({
  ...DEFAULT_CHAT_SETTINGS,
  ...overrides,
});

const makeSession = (overrides?: Partial<SavedChatSession>): SavedChatSession => ({
  id: 'sess-1',
  title: 'Test Session',
  messages: [],
  settings: makeSettings(),
  timestamp: Date.now(),
  ...overrides,
});

// ── createMessage ──

describe('createMessage', () => {
  it('creates a message with required fields', () => {
    const msg = createMessage('user', 'Hello');
    expect(msg.role).toBe('user');
    expect(msg.content).toBe('Hello');
    expect(msg.id).toBeTruthy();
    expect(msg.timestamp).toBeInstanceOf(Date);
  });

  it('accepts optional overrides', () => {
    const msg = createMessage('model', 'Response', { thoughts: 'thinking...' });
    expect(msg.thoughts).toBe('thinking...');
  });

  it('uses provided id and timestamp', () => {
    const ts = new Date('2024-01-01');
    const msg = createMessage('user', 'Hi', { id: 'custom-id', timestamp: ts });
    expect(msg.id).toBe('custom-id');
    expect(msg.timestamp).toBe(ts);
  });
});

// ── createNewSession ──

describe('createNewSession', () => {
  it('creates a session with defaults', () => {
    const session = createNewSession(makeSettings());
    expect(session.id).toBeTruthy();
    expect(session.title).toBe('New Chat');
    expect(session.messages).toEqual([]);
    expect(session.groupId).toBeNull();
  });

  it('uses provided title and messages', () => {
    const msgs = [makeMessage('user', 'Hi')];
    const session = createNewSession(makeSettings(), msgs, 'My Chat');
    expect(session.title).toBe('My Chat');
    expect(session.messages).toHaveLength(1);
  });

  it('sets groupId when provided', () => {
    const session = createNewSession(makeSettings(), [], 'Title', 'group-1');
    expect(session.groupId).toBe('group-1');
  });
});

// ── generateSessionTitle ──

describe('generateSessionTitle', () => {
  it('returns "New Chat" for empty messages', () => {
    expect(generateSessionTitle([])).toBe('New Chat');
  });

  it('uses first user message (first 7 words)', () => {
    const msgs = [makeMessage('user', 'How to write a unit test for React components properly')];
    expect(generateSessionTitle(msgs)).toBe('How to write a unit test for...');
  });

  it('does not add ellipsis when 7 words or fewer', () => {
    const msgs = [makeMessage('user', 'Hello world')];
    expect(generateSessionTitle(msgs)).toBe('Hello world');
  });

  it('falls back to model message when no user message', () => {
    const msgs = [makeMessage('model', 'Here is a detailed response for you')];
    expect(generateSessionTitle(msgs)).toBe('Model: Here is a detailed response...');
  });

  it('falls back to file name when no text messages', () => {
    const msgs = [makeMessage('user', '', { files: [{ name: 'report.pdf' } as any] })];
    expect(generateSessionTitle(msgs)).toBe('Chat with report.pdf');
  });
});

// ── performOptimisticSessionUpdate ──

describe('performOptimisticSessionUpdate', () => {
  it('creates a new session when activeSessionId not found', () => {
    const result = performOptimisticSessionUpdate([], {
      activeSessionId: null,
      newSessionId: 'new-1',
      newMessages: [makeMessage('user', 'Hello')],
      settings: makeSettings(),
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('new-1');
    expect(result[0].messages).toHaveLength(1);
  });

  it('updates an existing session by appending messages', () => {
    const existing = makeSession({
      id: 'sess-1',
      messages: [makeMessage('user', 'First')],
    });
    const result = performOptimisticSessionUpdate([existing], {
      activeSessionId: 'sess-1',
      newSessionId: 'sess-1',
      newMessages: [makeMessage('model', 'Reply')],
      settings: makeSettings(),
    });
    expect(result).toHaveLength(1);
    expect(result[0].messages).toHaveLength(2);
  });

  it('handles edit mode by truncating at editingMessageId', () => {
    const msg1 = makeMessage('user', 'First');
    const msg2 = makeMessage('model', 'Reply');
    const msg3 = makeMessage('user', 'Second');
    const existing = makeSession({
      id: 'sess-1',
      messages: [msg1, msg2, msg3],
    });
    const result = performOptimisticSessionUpdate([existing], {
      activeSessionId: 'sess-1',
      newSessionId: 'sess-1',
      newMessages: [makeMessage('user', 'Edited second')],
      settings: makeSettings(),
      editingMessageId: msg3.id,
    });
    // Should have msg1, msg2, and new message (msg3 and after removed)
    expect(result[0].messages).toHaveLength(3);
    expect(result[0].messages[2].content).toBe('Edited second');
  });

  it('spreads new settings over existing (lockedApiKey can be overwritten by settings param)', () => {
    const existing = makeSession({
      id: 'sess-1',
      settings: makeSettings({ lockedApiKey: 'existing-key' }),
    });
    const result = performOptimisticSessionUpdate([existing], {
      activeSessionId: 'sess-1',
      newSessionId: 'sess-1',
      newMessages: [],
      settings: makeSettings({ lockedApiKey: 'new-key' }),
    });
    expect(result[0].settings.lockedApiKey).toBe('new-key');
  });

  it('locks API key on new session when shouldLockKey is true', () => {
    const result = performOptimisticSessionUpdate([], {
      activeSessionId: null,
      newSessionId: 'new-1',
      newMessages: [],
      settings: makeSettings(),
      shouldLockKey: true,
      keyToLock: 'my-api-key',
    });
    expect(result[0].settings.lockedApiKey).toBe('my-api-key');
  });

  it('does not lock key when session already has one and shouldLockKey is true', () => {
    // The spread overwrites, but the conditional lock only applies when no existing key
    const existing = makeSession({
      id: 'sess-1',
      settings: makeSettings({ lockedApiKey: 'existing-key' }),
    });
    const result = performOptimisticSessionUpdate([existing], {
      activeSessionId: 'sess-1',
      newSessionId: 'sess-1',
      newMessages: [],
      settings: makeSettings(), // lockedApiKey: null
      shouldLockKey: true,
      keyToLock: 'new-key',
    });
    // The settings spread overwrites lockedApiKey to null, then the lock check
    // sees session already had one, so doesn't re-lock
    expect(result[0].settings.lockedApiKey).toBeNull();
  });

  it('updates timestamp when messages are added', () => {
    const oldTime = 1000;
    const existing = makeSession({ id: 'sess-1', timestamp: oldTime });
    const result = performOptimisticSessionUpdate([existing], {
      activeSessionId: 'sess-1',
      newSessionId: 'sess-1',
      newMessages: [makeMessage('user', 'Hi')],
      settings: makeSettings(),
    });
    expect(result[0].timestamp).toBeGreaterThan(oldTime);
  });

  it('preserves timestamp when no messages added', () => {
    const oldTime = 1000;
    const existing = makeSession({ id: 'sess-1', timestamp: oldTime });
    const result = performOptimisticSessionUpdate([existing], {
      activeSessionId: 'sess-1',
      newSessionId: 'sess-1',
      newMessages: [],
      settings: makeSettings(),
    });
    expect(result[0].timestamp).toBe(oldTime);
  });
});

// ── sanitizeSessionForExport ──

describe('sanitizeSessionForExport', () => {
  it('removes rawFile from files', () => {
    const session = makeSession({
      messages: [makeMessage('user', 'Hi', {
        files: [{
          id: 'f1',
          name: 'test.png',
          type: 'image/png',
          size: 100,
          rawFile: new Blob(['data']),
        } as any],
      })],
    });
    const result = sanitizeSessionForExport(session);
    expect(result.messages[0].files![0].rawFile).toBeUndefined();
  });

  it('removes blob: dataUrl from files', () => {
    const session = makeSession({
      messages: [makeMessage('user', 'Hi', {
        files: [{
          id: 'f1',
          name: 'test.png',
          type: 'image/png',
          size: 100,
          dataUrl: 'blob:http://localhost/abc',
        } as any],
      })],
    });
    const result = sanitizeSessionForExport(session);
    expect(result.messages[0].files![0].dataUrl).toBeUndefined();
  });

  it('preserves non-blob dataUrl (e.g. base64)', () => {
    const session = makeSession({
      messages: [makeMessage('user', 'Hi', {
        files: [{
          id: 'f1',
          name: 'test.png',
          type: 'image/png',
          size: 100,
          dataUrl: 'data:image/png;base64,abc123',
        } as any],
      })],
    });
    const result = sanitizeSessionForExport(session);
    expect(result.messages[0].files![0].dataUrl).toBe('data:image/png;base64,abc123');
  });

  it('removes abortController from files', () => {
    const session = makeSession({
      messages: [makeMessage('user', 'Hi', {
        files: [{
          id: 'f1',
          name: 'test.png',
          type: 'image/png',
          size: 100,
          abortController: new AbortController(),
        } as any],
      })],
    });
    const result = sanitizeSessionForExport(session);
    expect(result.messages[0].files![0].abortController).toBeUndefined();
  });

  it('handles messages without files', () => {
    const session = makeSession({
      messages: [makeMessage('user', 'Hi')],
    });
    const result = sanitizeSessionForExport(session);
    expect(result.messages[0].files).toBeUndefined();
  });
});

// ── updateSessionWithNewMessages ──

describe('updateSessionWithNewMessages', () => {
  it('replaces messages entirely for the target session', () => {
    const existing = makeSession({
      id: 'sess-1',
      messages: [makeMessage('user', 'Old')],
    });
    const newMsgs = [makeMessage('model', 'New 1'), makeMessage('model', 'New 2')];
    const result = updateSessionWithNewMessages([existing], 'sess-1', newMsgs, makeSettings());
    expect(result[0].messages).toEqual(newMsgs);
    expect(result[0].messages).toHaveLength(2);
  });

  it('does not affect other sessions', () => {
    const s1 = makeSession({ id: 'sess-1', messages: [makeMessage('user', 'A')] });
    const s2 = makeSession({ id: 'sess-2', messages: [makeMessage('user', 'B')] });
    const result = updateSessionWithNewMessages([s1, s2], 'sess-1', [], makeSettings());
    expect(result[1].messages).toHaveLength(1);
    expect(result[1].messages[0].content).toBe('B');
  });
});
