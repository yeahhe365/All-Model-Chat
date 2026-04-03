import { create } from 'zustand';
import { SavedChatSession, ChatGroup, ChatMessage, UploadedFile, InputCommand, ChatSettings } from '../types';
import { dbService } from '../utils/db';
import { logService, rehydrateSessionFiles } from '../utils/appUtils';
import { ACTIVE_CHAT_SESSION_ID_KEY } from '../constants/appConstants';
import { SyncMessage } from '../hooks/core/useMultiTabSync';

// ── Internal refs (not in Zustand state to avoid re-renders) ──
// Typed as MutableRefObject so downstream hooks see the correct shape
const _activeJobs: { current: Map<string, AbortController> } = { current: new Map() };
const _userScrolledUp: { current: boolean } = { current: false };
const _fileDrafts: { current: Record<string, UploadedFile[]> } = { current: {} };
const _localLoadingSessionIds = new Set<string>();
let _isDirty = false;

// ── BroadcastChannel for multi-tab sync ──
let syncChannel: BroadcastChannel | null = null;
function getSyncChannel(): BroadcastChannel {
  if (!syncChannel) {
    syncChannel = new BroadcastChannel('all_model_chat_sync_v1');
  }
  return syncChannel;
}

function broadcast(msg: SyncMessage) {
  try { getSyncChannel().postMessage(msg); } catch {}
}

// ── Sort helper ──
function sortSessions(sessions: SavedChatSession[]) {
  sessions.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.timestamp - a.timestamp;
  });
}

// ── URL & sessionStorage sync ──
function syncActiveSessionToUrl(activeSessionId: string | null) {
  if (activeSessionId) {
    try { sessionStorage.setItem(ACTIVE_CHAT_SESSION_ID_KEY, activeSessionId); } catch {}
    const targetPath = `/chat/${activeSessionId}`;
    try {
      if (window.location.pathname !== targetPath) {
        if (window.location.pathname.startsWith('/chat/')) {
          window.history.replaceState({ sessionId: activeSessionId }, '', targetPath);
        } else {
          window.history.pushState({ sessionId: activeSessionId }, '', targetPath);
        }
      }
    } catch {}
  } else {
    try { sessionStorage.removeItem(ACTIVE_CHAT_SESSION_ID_KEY); } catch {}
    try {
      if (window.location.pathname !== '/' && !window.location.pathname.startsWith('/chat/')) {
        window.history.pushState({}, '', '/');
      }
    } catch {}
  }
}

// ── Store types ──
interface ChatState {
  // Session Data
  savedSessions: SavedChatSession[];
  savedGroups: ChatGroup[];
  activeSessionId: string | null;
  activeMessages: ChatMessage[];

  // Auxiliary
  editingMessageId: string | null;
  editMode: 'update' | 'resend';
  commandedInput: InputCommand | null;
  loadingSessionIds: Set<string>;
  generatingTitleSessionIds: Set<string>;
  selectedFiles: UploadedFile[];
  appFileError: string | null;
  isAppProcessingFile: boolean;
  aspectRatio: string;
  imageSize: string;
  ttsMessageId: string | null;
  isSwitchingModel: boolean;
  scrollContainerRef: React.RefObject<HTMLDivElement> | null;

  // Read-only refs (accessed via helpers, not reactive)
  _activeJobs: { current: Map<string, AbortController> };
  _userScrolledUp: { current: boolean };
  _fileDrafts: { current: Record<string, UploadedFile[]> };
}

interface ChatActions {
  // Session setters
  setSavedSessions: (v: SavedChatSession[] | ((p: SavedChatSession[]) => SavedChatSession[])) => void;
  setSavedGroups: (v: ChatGroup[] | ((p: ChatGroup[]) => ChatGroup[])) => void;
  setActiveSessionId: (id: string | null) => void;
  setActiveMessages: (v: ChatMessage[] | ((p: ChatMessage[]) => ChatMessage[])) => void;

  // Auxiliary setters
  setEditingMessageId: (id: string | null) => void;
  setEditMode: (mode: 'update' | 'resend') => void;
  setCommandedInput: (cmd: InputCommand | null) => void;
  setLoadingSessionIds: (v: Set<string> | ((p: Set<string>) => Set<string>)) => void;
  setGeneratingTitleSessionIds: (v: Set<string> | ((p: Set<string>) => Set<string>)) => void;
  setSelectedFiles: (v: UploadedFile[] | ((p: UploadedFile[]) => UploadedFile[])) => void;
  setAppFileError: (v: string | null) => void;
  setIsAppProcessingFile: (v: boolean) => void;
  setAspectRatio: (v: string) => void;
  setImageSize: (v: string) => void;
  setTtsMessageId: (v: string | null) => void;
  setIsSwitchingModel: (v: boolean) => void;
  setScrollContainerRef: (ref: React.RefObject<HTMLDivElement> | null) => void;

  // Persistence
  updateAndPersistSessions: (updater: (prev: SavedChatSession[]) => SavedChatSession[], options?: { persist?: boolean }) => void;
  updateAndPersistGroups: (updater: (prev: ChatGroup[]) => ChatGroup[]) => void;
  refreshSessions: () => Promise<void>;
  refreshGroups: () => Promise<void>;
  setSessionLoading: (sessionId: string, isLoading: boolean) => void;

  // Computed helpers (call getState inside)
  setCurrentChatSettings: (updater: (prev: ChatSettings) => ChatSettings) => void;
}

export const useChatStore = create<ChatState & ChatActions>((set, get) => ({
  // ── Initial State ──
  savedSessions: [],
  savedGroups: [],
  activeSessionId: null,
  activeMessages: [],

  editingMessageId: null,
  editMode: 'resend',
  commandedInput: null,
  loadingSessionIds: new Set<string>(),
  generatingTitleSessionIds: new Set<string>(),
  selectedFiles: [],
  appFileError: null,
  isAppProcessingFile: false,
  aspectRatio: '1:1',
  imageSize: '1K',
  ttsMessageId: null,
  isSwitchingModel: false,
  scrollContainerRef: null,

  _activeJobs,
  _userScrolledUp,
  _fileDrafts,

  // ── Session Setters ──
  setSavedSessions: (v) => set((s) => ({
    savedSessions: typeof v === 'function' ? v(s.savedSessions) : v,
  })),

  setSavedGroups: (v) => set((s) => ({
    savedGroups: typeof v === 'function' ? v(s.savedGroups) : v,
  })),

  setActiveSessionId: (id) => {
    set({ activeSessionId: id });
    syncActiveSessionToUrl(id);
  },

  setActiveMessages: (v) => set((s) => ({
    activeMessages: typeof v === 'function' ? v(s.activeMessages) : v,
  })),

  // ── Auxiliary Setters ──
  setEditingMessageId: (id) => set({ editingMessageId: id }),
  setEditMode: (mode) => set({ editMode: mode }),
  setCommandedInput: (cmd) => set({ commandedInput: cmd }),
  setLoadingSessionIds: (v) => set((s) => ({
    loadingSessionIds: typeof v === 'function' ? v(s.loadingSessionIds) : v,
  })),
  setGeneratingTitleSessionIds: (v) => set((s) => ({
    generatingTitleSessionIds: typeof v === 'function' ? v(s.generatingTitleSessionIds) : v,
  })),
  setSelectedFiles: (v) => set((s) => ({
    selectedFiles: typeof v === 'function' ? v(s.selectedFiles) : v,
  })),
  setAppFileError: (v) => set({ appFileError: v }),
  setIsAppProcessingFile: (v) => set({ isAppProcessingFile: v }),
  setAspectRatio: (v) => set({ aspectRatio: v }),
  setImageSize: (v) => set({ imageSize: v }),
  setTtsMessageId: (v) => set({ ttsMessageId: v }),
  setIsSwitchingModel: (v) => set({ isSwitchingModel: v }),
  setScrollContainerRef: (ref) => set({ scrollContainerRef: ref }),

  // ── Persistence Actions ──
  refreshSessions: async () => {
    try {
      const metadataList = await dbService.getAllSessionMetadata();
      const { activeSessionId, setActiveMessages, setSavedSessions } = get();

      if (activeSessionId) {
        const fullActiveSession = await dbService.getSession(activeSessionId);
        if (fullActiveSession) {
          const rehydrated = rehydrateSessionFiles(fullActiveSession);
          setActiveMessages(rehydrated.messages);
        }
      }

      sortSessions(metadataList);
      setSavedSessions(metadataList);
    } catch (e) {
      logService.error('Failed to refresh sessions from DB', { error: e });
    }
  },

  refreshGroups: async () => {
    try {
      const groups = await dbService.getAllGroups();
      set({ savedGroups: groups });
    } catch (e) {
      logService.error('Failed to refresh groups from DB', { error: e });
    }
  },

  setSessionLoading: (sessionId, isLoading) => {
    if (isLoading) {
      _localLoadingSessionIds.add(sessionId);
    } else {
      _localLoadingSessionIds.delete(sessionId);
    }

    set((s) => {
      const next = new Set(s.loadingSessionIds);
      if (isLoading) next.add(sessionId);
      else next.delete(sessionId);
      return { loadingSessionIds: next };
    });

    broadcast({ type: 'SESSION_LOADING', sessionId, isLoading });
  },

  updateAndPersistSessions: (updater, options = {}) => {
    const { persist = true } = options;
    const { savedSessions, activeSessionId, activeMessages } = get();

    // 1. Reconstruct "Virtual" Full State
    const virtualFullSessions = savedSessions.map(s => {
      if (s.id === activeSessionId) {
        return { ...s, messages: activeMessages };
      }
      return s;
    });

    // 2. Run Updater
    const newFullSessions = updater(virtualFullSessions);

    // 3. Sort
    sortSessions(newFullSessions);

    // 4. Update Active Messages if changed
    if (activeSessionId) {
      const newActiveSession = newFullSessions.find(s => s.id === activeSessionId);
      if (newActiveSession && newActiveSession.messages !== activeMessages) {
        set({ activeMessages: newActiveSession.messages });
      }
    }

    // 5. Persist
    if (persist) {
      const updates: Promise<void>[] = [];
      const newSessionsMap = new Map(newFullSessions.map(s => [s.id, s]));
      const modifiedSessionIds: string[] = [];

      newFullSessions.forEach(session => {
        const prevSession = virtualFullSessions.find(ps => ps.id === session.id);
        if (prevSession !== session) {
          updates.push(dbService.saveSession(session));
          modifiedSessionIds.push(session.id);
        }
      });

      savedSessions.forEach(session => {
        if (!newSessionsMap.has(session.id)) {
          updates.push(dbService.deleteSession(session.id));
        }
      });

      if (updates.length > 0) {
        Promise.all(updates).then(() => {
          if (modifiedSessionIds.length === 1) {
            broadcast({ type: 'SESSION_CONTENT_UPDATED', sessionId: modifiedSessionIds[0] });
          } else {
            broadcast({ type: 'SESSIONS_UPDATED' });
          }
        }).catch(e => logService.error('Failed to persist session updates', { error: e }));
      }
    }

    // 6. Return Metadata Only (strip messages)
    const metadataOnly = newFullSessions.map(s => {
      if (s.messages && s.messages.length === 0) return s;
      const { messages, ...rest } = s;
      return { ...rest, messages: [] };
    });

    set({ savedSessions: metadataOnly });
  },

  updateAndPersistGroups: (updater) => {
    const { savedGroups } = get();
    const newGroups = updater(savedGroups);
    dbService.setAllGroups(newGroups)
      .then(() => broadcast({ type: 'GROUPS_UPDATED' }))
      .catch(e => logService.error('Failed to persist group updates', { error: e }));
    set({ savedGroups: newGroups });
  },

  setCurrentChatSettings: (updater) => {
    const { activeSessionId } = get();
    if (!activeSessionId) return;
    get().updateAndPersistSessions(prevSessions =>
      prevSessions.map(s =>
        s.id === activeSessionId
          ? { ...s, settings: updater(s.settings) }
          : s
      )
    );
  },
}));

// ── Setup BroadcastChannel listener (once) ──
if (typeof BroadcastChannel !== 'undefined') {
  const channel = getSyncChannel();
  const originalOnMessage = channel.onmessage;

  channel.onmessage = (event: MessageEvent<SyncMessage>) => {
    // Call original handler if it exists (from settings store or other)
    if (originalOnMessage) {
      originalOnMessage.call(channel, event);
    }

    const msg = event.data;
    const store = useChatStore;

    switch (msg.type) {
      case 'SETTINGS_UPDATED':
      case 'SESSIONS_UPDATED':
        if (document.hidden) {
          _isDirty = true;
        } else {
          store.getState().refreshSessions();
        }
        break;
      case 'GROUPS_UPDATED':
        if (document.hidden) {
          _isDirty = true;
        } else {
          store.getState().refreshGroups();
        }
        break;
      case 'SESSION_CONTENT_UPDATED': {
        if (_localLoadingSessionIds.has(msg.sessionId)) return;
        if (document.hidden) {
          _isDirty = true;
          return;
        }
        const { activeSessionId } = store.getState();
        if (msg.sessionId === activeSessionId) {
          dbService.getSession(msg.sessionId).then(s => {
            if (s) {
              const rehydrated = rehydrateSessionFiles(s);
              store.getState().setActiveMessages(rehydrated.messages);
              store.getState().setSavedSessions(prev =>
                prev.map(old => old.id === msg.sessionId ? { ...rehydrated, messages: [] } : old)
              );
            }
          });
        } else {
          store.getState().refreshSessions();
        }
        break;
      }
      case 'SESSION_LOADING': {
        store.getState().setLoadingSessionIds(prev => {
          const next = new Set(prev);
          if (msg.isLoading) next.add(msg.sessionId);
          else next.delete(msg.sessionId);
          return next;
        });
        break;
      }
    }
  };

  // Visibility change handler
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && _isDirty) {
      logService.info('[Sync] Tab visible, syncing pending updates from DB.');
      useChatStore.getState().refreshSessions();
      useChatStore.getState().refreshGroups();
      _isDirty = false;
    }
  });
}
