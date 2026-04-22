import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock BroadcastChannel
globalThis.BroadcastChannel = vi.fn(() => ({
  postMessage: vi.fn(),
  onmessage: null as any,
  close: vi.fn(),
})) as any;

// Mock sessionStorage
const sessionStore: Record<string, string> = {};
const mockSessionStorage = {
  getItem: vi.fn((key: string) => sessionStore[key] ?? null),
  setItem: vi.fn((key: string, val: string) => { sessionStore[key] = val; }),
  removeItem: vi.fn((key: string) => { delete sessionStore[key]; }),
};
Object.defineProperty(window, 'sessionStorage', { value: mockSessionStorage });

// Mock history
window.history.replaceState = vi.fn();
window.history.pushState = vi.fn();
delete (window as any).location;
window.location = { pathname: '/' } as any;

// Mock dbService
vi.mock('../../utils/db', () => ({
  dbService: {
    getAllSessionMetadata: vi.fn().mockResolvedValue([]),
    getSession: vi.fn().mockResolvedValue(null),
    getAllGroups: vi.fn().mockResolvedValue([]),
    saveSession: vi.fn().mockResolvedValue(undefined),
    deleteSession: vi.fn().mockResolvedValue(undefined),
    setAllGroups: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock appUtils
vi.mock('../../utils/appUtils', () => ({
  logService: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(), recordTokenUsage: vi.fn() },
  rehydrateSessionFiles: vi.fn((session: any) => session),
  getTranslator: vi.fn(),
  applyThemeToDocument: vi.fn(),
  resolveSupportedModelId: vi.fn((modelId: string | null | undefined, fallback: string) =>
    modelId || fallback
  ),
}));

import { useChatStore } from '../chatStore';
import { dbService } from '../../utils/db';
import { SavedChatSession, ChatGroup } from '../../types';

const makeSession = (overrides: Partial<SavedChatSession> = {}): SavedChatSession => ({
  id: `sess-${Math.random().toString(36).slice(2, 8)}`,
  title: 'Test Session',
  messages: [],
  settings: {} as any,
  timestamp: Date.now(),
  ...overrides,
});

const makeGroup = (overrides: Partial<ChatGroup> = {}): ChatGroup => ({
  id: `grp-${Math.random().toString(36).slice(2, 8)}`,
  title: 'Test Group',
  timestamp: Date.now(),
  ...overrides,
});

describe('chatStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to clean state
    useChatStore.setState({
      savedSessions: [],
      savedGroups: [],
      activeSessionId: null,
      activeMessages: [],
      editingMessageId: null,
      editMode: 'resend',
      commandedInput: null,
      loadingSessionIds: new Set(),
      generatingTitleSessionIds: new Set(),
      selectedFiles: [],
      appFileError: null,
      isAppProcessingFile: false,
      aspectRatio: '1:1',
      imageSize: '1K',
      imageOutputMode: 'IMAGE_TEXT',
      personGeneration: 'ALLOW_ADULT',
      isSwitchingModel: false,
    });
  });

  // ── setActiveSessionId ──

  describe('setActiveSessionId', () => {
    it('sets the active session ID', () => {
      useChatStore.getState().setActiveSessionId('sess-1');
      expect(useChatStore.getState().activeSessionId).toBe('sess-1');
    });

    it('clears active session when set to null', () => {
      useChatStore.getState().setActiveSessionId('sess-1');
      useChatStore.getState().setActiveSessionId(null);
      expect(useChatStore.getState().activeSessionId).toBeNull();
    });

    it('navigates back to root when clearing an active /chat route', () => {
      window.location.pathname = '/chat/sess-1';

      useChatStore.getState().setActiveSessionId('sess-1');
      useChatStore.getState().setActiveSessionId(null);

      expect(window.history.pushState).toHaveBeenCalledWith({}, '', '/');
    });
  });

  // ── setSavedSessions ──

  describe('setSavedSessions', () => {
    it('sets sessions from array', () => {
      const sessions = [makeSession({ id: 's1' }), makeSession({ id: 's2' })];
      useChatStore.getState().setSavedSessions(sessions);
      expect(useChatStore.getState().savedSessions).toEqual(sessions);
    });

    it('updates sessions with updater function', () => {
      useChatStore.getState().setSavedSessions([makeSession({ id: 's1' })]);
      useChatStore.getState().setSavedSessions(prev => [...prev, makeSession({ id: 's2' })]);
      expect(useChatStore.getState().savedSessions).toHaveLength(2);
    });
  });

  // ── setActiveMessages ──

  describe('setActiveMessages', () => {
    it('sets messages array', () => {
      const msgs = [{ id: 'm1', role: 'user' as const, content: 'Hi', timestamp: new Date() }];
      useChatStore.getState().setActiveMessages(msgs);
      expect(useChatStore.getState().activeMessages).toEqual(msgs);
    });
  });

  // ── Auxiliary setters ──

  describe('auxiliary setters', () => {
    it('setEditingMessageId', () => {
      useChatStore.getState().setEditingMessageId('msg-1');
      expect(useChatStore.getState().editingMessageId).toBe('msg-1');
    });

    it('setEditMode', () => {
      useChatStore.getState().setEditMode('update');
      expect(useChatStore.getState().editMode).toBe('update');
    });

    it('setSelectedFiles', () => {
      useChatStore.getState().setSelectedFiles([{ id: 'f1' }] as any);
      expect(useChatStore.getState().selectedFiles).toHaveLength(1);
    });

    it('setAppFileError', () => {
      useChatStore.getState().setAppFileError('Upload failed');
      expect(useChatStore.getState().appFileError).toBe('Upload failed');
    });

    it('setAspectRatio', () => {
      useChatStore.getState().setAspectRatio('16:9');
      expect(useChatStore.getState().aspectRatio).toBe('16:9');
    });

    it('setImageSize', () => {
      useChatStore.getState().setImageSize('2K');
      expect(useChatStore.getState().imageSize).toBe('2K');
    });

    it('setImageOutputMode', () => {
      useChatStore.getState().setImageOutputMode('IMAGE_ONLY');
      expect(useChatStore.getState().imageOutputMode).toBe('IMAGE_ONLY');
    });

    it('setPersonGeneration', () => {
      useChatStore.getState().setPersonGeneration('DONT_ALLOW');
      expect(useChatStore.getState().personGeneration).toBe('DONT_ALLOW');
    });

    it('setIsSwitchingModel', () => {
      useChatStore.getState().setIsSwitchingModel(true);
      expect(useChatStore.getState().isSwitchingModel).toBe(true);
    });

    it('setLoadingSessionIds', () => {
      useChatStore.getState().setLoadingSessionIds(new Set(['s1']));
      expect(useChatStore.getState().loadingSessionIds.has('s1')).toBe(true);
    });
  });

  // ── refreshSessions ──

  describe('refreshSessions', () => {
    it('loads session metadata from DB', async () => {
      const sessions = [makeSession({ id: 's1', title: 'Loaded' })];
      vi.mocked(dbService.getAllSessionMetadata).mockResolvedValue(sessions);
      await useChatStore.getState().refreshSessions();
      expect(useChatStore.getState().savedSessions).toHaveLength(1);
      expect(useChatStore.getState().savedSessions[0].title).toBe('Loaded');
    });

    it('loads active session messages when activeSessionId is set', async () => {
      const fullSession = makeSession({
        id: 's1',
        messages: [{ id: 'm1', role: 'user', content: 'Hello', timestamp: new Date() }],
      });
      vi.mocked(dbService.getAllSessionMetadata).mockResolvedValue([fullSession]);
      vi.mocked(dbService.getSession).mockResolvedValue(fullSession);

      useChatStore.getState().setActiveSessionId('s1');
      await useChatStore.getState().refreshSessions();
      expect(useChatStore.getState().activeMessages).toHaveLength(1);
    });

    it('does not overwrite active session runtime messages while that session is still loading', async () => {
      const persistedSession = makeSession({
        id: 's1',
        title: 'Persisted',
        messages: [{ id: 'm-db', role: 'model', content: 'stale', timestamp: new Date() }],
      });
      const localStreamingMessage = {
        id: 'm-local',
        role: 'model' as const,
        content: 'local partial',
        isLoading: true,
        timestamp: new Date(),
      };

      vi.mocked(dbService.getAllSessionMetadata).mockResolvedValue([{ ...persistedSession, messages: [] }]);
      vi.mocked(dbService.getSession).mockResolvedValue(persistedSession);

      useChatStore.getState().setActiveSessionId('s1');
      useChatStore.getState().setActiveMessages([localStreamingMessage]);
      useChatStore.getState().setSavedSessions([{ ...persistedSession, messages: [localStreamingMessage] }]);
      useChatStore.getState().setSessionLoading('s1', true);

      await useChatStore.getState().refreshSessions();

      expect(useChatStore.getState().activeMessages).toEqual([localStreamingMessage]);
      expect(useChatStore.getState().savedSessions[0].messages).toEqual([localStreamingMessage]);
    });

    it('handles DB errors gracefully', async () => {
      vi.mocked(dbService.getAllSessionMetadata).mockRejectedValue(new Error('DB fail'));
      await useChatStore.getState().refreshSessions();
      // Should not throw, sessions remain empty
      expect(useChatStore.getState().savedSessions).toEqual([]);
    });
  });

  // ── refreshGroups ──

  describe('refreshGroups', () => {
    it('loads groups from DB', async () => {
      const groups = [makeGroup({ id: 'g1', title: 'Work' })];
      vi.mocked(dbService.getAllGroups).mockResolvedValue(groups);
      await useChatStore.getState().refreshGroups();
      expect(useChatStore.getState().savedGroups).toHaveLength(1);
    });

    it('handles DB errors gracefully', async () => {
      vi.mocked(dbService.getAllGroups).mockRejectedValue(new Error('DB fail'));
      await useChatStore.getState().refreshGroups();
      expect(useChatStore.getState().savedGroups).toEqual([]);
    });
  });

  // ── setSessionLoading ──

  describe('setSessionLoading', () => {
    it('adds session to loading set', () => {
      useChatStore.getState().setSessionLoading('s1', true);
      expect(useChatStore.getState().loadingSessionIds.has('s1')).toBe(true);
    });

    it('removes session from loading set', () => {
      useChatStore.getState().setSessionLoading('s1', true);
      useChatStore.getState().setSessionLoading('s1', false);
      expect(useChatStore.getState().loadingSessionIds.has('s1')).toBe(false);
    });

    it('strips completed background session messages when loading ends', () => {
      useChatStore.getState().setSavedSessions([
        makeSession({
          id: 's1',
          messages: [{ id: 'm1', role: 'model', content: 'Done', timestamp: new Date() }],
        }),
      ]);

      useChatStore.getState().setSessionLoading('s1', true);
      useChatStore.getState().setSessionLoading('s1', false);

      expect(useChatStore.getState().savedSessions[0].messages).toEqual([]);
    });
  });

  // ── updateAndPersistSessions ──

  describe('updateAndPersistSessions', () => {
    it('updates activeMessages when active session is modified', () => {
      useChatStore.getState().setActiveSessionId('s1');
      useChatStore.getState().setSavedSessions([makeSession({ id: 's1', messages: [] })]);

      useChatStore.getState().updateAndPersistSessions(prev =>
        prev.map(s => s.id === 's1' ? { ...s, messages: [{ id: 'm1', role: 'user', content: 'Hi', timestamp: new Date() }] } : s),
        { persist: false },
      );

      expect(useChatStore.getState().activeMessages).toHaveLength(1);
    });

    it('retains background loading session messages in memory while it is still generating', () => {
      const backgroundMessage = {
        id: 'm-background',
        role: 'model' as const,
        content: '',
        isLoading: true,
        timestamp: new Date(),
      };
      const activeMessage = {
        id: 'm-active',
        role: 'user' as const,
        content: 'Current',
        timestamp: new Date(),
      };

      useChatStore.getState().setSavedSessions([
        makeSession({ id: 's1', messages: [backgroundMessage], title: 'Background' }),
        makeSession({ id: 's2', messages: [], title: 'Active' }),
      ]);
      useChatStore.getState().setActiveSessionId('s2');
      useChatStore.getState().setActiveMessages([activeMessage]);
      useChatStore.getState().setSessionLoading('s1', true);

      useChatStore.getState().updateAndPersistSessions(
        (prev) =>
          prev.map((session) =>
            session.id === 's1'
              ? {
                  ...session,
                  messages: session.messages.map((message) =>
                    message.id === 'm-background'
                      ? { ...message, content: 'partial response' }
                      : message,
                  ),
                }
              : session,
          ),
        { persist: false },
      );

      const backgroundSession = useChatStore
        .getState()
        .savedSessions.find((session) => session.id === 's1');

      expect(backgroundSession?.messages).toHaveLength(1);
      expect(backgroundSession?.messages[0].content).toBe('partial response');
    });

    it('persists modified sessions to DB', async () => {
      const session = makeSession({ id: 's1' });
      useChatStore.getState().setSavedSessions([session]);

      useChatStore.getState().updateAndPersistSessions(prev =>
        prev.map(s => s.id === 's1' ? { ...s, title: 'Updated' } : s),
      );

      await vi.waitFor(() => {
        expect(dbService.saveSession).toHaveBeenCalled();
      });
      const savedArg = vi.mocked(dbService.saveSession).mock.calls[0][0];
      expect(savedArg.title).toBe('Updated');
    });

    it('preserves non-active session messages when updating metadata-only entries', async () => {
      const activeSession = makeSession({
        id: 's1',
        messages: [{ id: 'm-active', role: 'user', content: 'Active', timestamp: new Date() }],
      });
      const inactiveFullSession = makeSession({
        id: 's2',
        title: 'Archive',
        messages: [{ id: 'm-archive', role: 'user', content: 'Keep me', timestamp: new Date() }],
      });

      useChatStore.getState().setActiveSessionId('s1');
      useChatStore.getState().setActiveMessages(activeSession.messages);
      useChatStore.getState().setSavedSessions([
        { ...activeSession, messages: [] },
        { ...inactiveFullSession, messages: [] },
      ]);

      vi.mocked(dbService.getSession).mockImplementation(async (id: string) => {
        if (id === 's1') return activeSession;
        if (id === 's2') return inactiveFullSession;
        return undefined;
      });

      useChatStore.getState().updateAndPersistSessions((prev) =>
        prev.map((session) =>
          session.id === 's2' ? { ...session, title: 'Archive Updated' } : session,
        ),
      );

      await vi.waitFor(() => {
        const archivedSave = vi
          .mocked(dbService.saveSession)
          .mock.calls.find(([session]) => session.id === 's2');
        expect(archivedSave).toBeDefined();
      });

      const archivedSave = vi
        .mocked(dbService.saveSession)
        .mock.calls.find(([session]) => session.id === 's2');
      const savedArg = archivedSave?.[0];

      expect(savedArg?.title).toBe('Archive Updated');
      expect(savedArg?.messages).toEqual(inactiveFullSession.messages);
    });

    it('deletes removed sessions from DB', async () => {
      useChatStore.getState().setSavedSessions([makeSession({ id: 's1' })]);

      useChatStore.getState().updateAndPersistSessions(() => []);

      await vi.waitFor(() => {
        expect(dbService.deleteSession).toHaveBeenCalledWith('s1');
      });
    });

    it('skips persist when persist option is false', () => {
      useChatStore.getState().setSavedSessions([makeSession({ id: 's1' })]);

      useChatStore.getState().updateAndPersistSessions(
        prev => prev.map(s => s.id === 's1' ? { ...s, title: 'No Persist' } : s),
        { persist: false },
      );

      expect(dbService.saveSession).not.toHaveBeenCalled();
      expect(useChatStore.getState().savedSessions[0].title).toBe('No Persist');
    });
  });

  // ── updateAndPersistGroups ──

  describe('updateAndPersistGroups', () => {
    it('updates groups and persists to DB', async () => {
      useChatStore.getState().setSavedGroups([makeGroup({ id: 'g1' })]);

      useChatStore.getState().updateAndPersistGroups(prev =>
        prev.map(g => g.id === 'g1' ? { ...g, title: 'Renamed' } : g),
      );

      expect(useChatStore.getState().savedGroups[0].title).toBe('Renamed');
      await vi.waitFor(() => {
        expect(dbService.setAllGroups).toHaveBeenCalled();
      });
    });
  });

  // ── setCurrentChatSettings ──

  describe('setCurrentChatSettings', () => {
    it('updates settings for active session', () => {
      useChatStore.getState().setActiveSessionId('s1');
      useChatStore.getState().setSavedSessions([makeSession({
        id: 's1',
        settings: { modelId: 'old-model' } as any,
      })]);

      useChatStore.getState().setCurrentChatSettings(prev => ({
        ...prev,
        modelId: 'new-model',
      }));

      // Should update the session's settings
      const sessions = useChatStore.getState().savedSessions;
      // Note: sessions strip messages, so check the metadata
      expect(sessions[0].settings.modelId).toBe('new-model');
    });

    it('does nothing when no active session', () => {
      useChatStore.getState().setSavedSessions([makeSession({ id: 's1' })]);
      useChatStore.getState().setCurrentChatSettings(prev => ({
        ...prev,
        modelId: 'new-model',
      }));
      expect(dbService.saveSession).not.toHaveBeenCalled();
    });
  });
});
