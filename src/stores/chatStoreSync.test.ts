import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SavedChatSession } from '../types';
import type { SyncMessage } from '../types/sync';
import { createChatSettings } from '../test/factories';
import { setupChatStoreSync } from './chatStoreSync';

const makeSession = (overrides: Partial<SavedChatSession> = {}): SavedChatSession => ({
  id: 'session',
  title: 'Session',
  timestamp: 0,
  messages: [],
  settings: createChatSettings(),
  ...overrides,
});

function createChannel(originalOnMessage?: (event: MessageEvent<SyncMessage>) => void) {
  return {
    name: 'all_model_chat_sync_v1',
    onmessage: originalOnMessage ?? null,
    onmessageerror: null,
    postMessage: vi.fn(),
    close: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as BroadcastChannel;
}

function createDocumentState(hidden = false) {
  let visibilityHandler: (() => void) | undefined;
  const documentRef = {
    hidden,
    visibilityState: hidden ? 'hidden' : 'visible',
    addEventListener: vi.fn((eventName: string, handler: () => void) => {
      if (eventName === 'visibilitychange') {
        visibilityHandler = handler;
      }
    }),
  } as unknown as Document;

  return {
    documentRef,
    setVisible() {
      Object.assign(documentRef, {
        hidden: false,
        visibilityState: 'visible',
      });
      visibilityHandler?.();
    },
  };
}

describe('chatStoreSync', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('BroadcastChannel', vi.fn());
  });

  it('chains the existing channel handler and refreshes sessions while visible', () => {
    const originalOnMessage = vi.fn();
    const channel = createChannel(originalOnMessage);
    const refreshSessions = vi.fn();
    const documentState = createDocumentState(false);

    setupChatStoreSync({
      store: {
        getState: () => ({
          activeSessionId: null,
          refreshSessions,
          refreshGroups: vi.fn(),
          setActiveMessages: vi.fn(),
          setSavedSessions: vi.fn(),
          setLoadingSessionIds: vi.fn(),
        }),
      },
      localLoadingSessionIds: new Set(),
      getChannel: () => channel,
      getSession: vi.fn(),
      rehydrateSession: vi.fn((session: SavedChatSession) => session),
      logger: { info: vi.fn() },
      documentRef: documentState.documentRef,
    });

    channel.onmessage?.({ data: { type: 'SESSIONS_UPDATED' } } as MessageEvent<SyncMessage>);

    expect(originalOnMessage).toHaveBeenCalled();
    expect(refreshSessions).toHaveBeenCalledTimes(1);
  });

  it('defers session and group refreshes while hidden until the tab becomes visible', () => {
    const channel = createChannel();
    const refreshSessions = vi.fn();
    const refreshGroups = vi.fn();
    const documentState = createDocumentState(true);

    setupChatStoreSync({
      store: {
        getState: () => ({
          activeSessionId: null,
          refreshSessions,
          refreshGroups,
          setActiveMessages: vi.fn(),
          setSavedSessions: vi.fn(),
          setLoadingSessionIds: vi.fn(),
        }),
      },
      localLoadingSessionIds: new Set(),
      getChannel: () => channel,
      getSession: vi.fn(),
      rehydrateSession: vi.fn((session: SavedChatSession) => session),
      logger: { info: vi.fn() },
      documentRef: documentState.documentRef,
    });

    channel.onmessage?.({ data: { type: 'GROUPS_UPDATED' } } as MessageEvent<SyncMessage>);

    expect(refreshGroups).not.toHaveBeenCalled();
    documentState.setVisible();

    expect(refreshSessions).toHaveBeenCalledTimes(1);
    expect(refreshGroups).toHaveBeenCalledTimes(1);
  });

  it('hydrates active session content updates from the database', async () => {
    const channel = createChannel();
    const message = { id: 'message', role: 'model' as const, content: 'fresh', timestamp: new Date() };
    const persistedSession = makeSession({ id: 'active', messages: [message] });
    const rehydratedSession = makeSession({ id: 'active', messages: [message] });
    const setActiveMessages = vi.fn();
    const setSavedSessions = vi.fn();

    setupChatStoreSync({
      store: {
        getState: () => ({
          activeSessionId: 'active',
          refreshSessions: vi.fn(),
          refreshGroups: vi.fn(),
          setActiveMessages,
          setSavedSessions,
          setLoadingSessionIds: vi.fn(),
        }),
      },
      localLoadingSessionIds: new Set(),
      getChannel: () => channel,
      getSession: vi.fn(async () => persistedSession),
      rehydrateSession: vi.fn(() => rehydratedSession),
      logger: { info: vi.fn() },
      documentRef: createDocumentState(false).documentRef,
    });

    channel.onmessage?.({
      data: { type: 'SESSION_CONTENT_UPDATED', sessionId: 'active' },
    } as MessageEvent<SyncMessage>);
    await vi.waitFor(() => {
      expect(setActiveMessages).toHaveBeenCalledWith([message]);
    });

    const updateSavedSessions = setSavedSessions.mock.calls[0][0] as (prev: SavedChatSession[]) => SavedChatSession[];
    expect(updateSavedSessions([makeSession({ id: 'active', messages: [message] })])).toEqual([
      { ...rehydratedSession, messages: [] },
    ]);
  });

  it('ignores content updates for locally loading sessions', () => {
    const channel = createChannel();
    const getSession = vi.fn();

    setupChatStoreSync({
      store: {
        getState: () => ({
          activeSessionId: 'active',
          refreshSessions: vi.fn(),
          refreshGroups: vi.fn(),
          setActiveMessages: vi.fn(),
          setSavedSessions: vi.fn(),
          setLoadingSessionIds: vi.fn(),
        }),
      },
      localLoadingSessionIds: new Set(['active']),
      getChannel: () => channel,
      getSession,
      rehydrateSession: vi.fn((session: SavedChatSession) => session),
      logger: { info: vi.fn() },
      documentRef: createDocumentState(false).documentRef,
    });

    channel.onmessage?.({
      data: { type: 'SESSION_CONTENT_UPDATED', sessionId: 'active' },
    } as MessageEvent<SyncMessage>);

    expect(getSession).not.toHaveBeenCalled();
  });
});
