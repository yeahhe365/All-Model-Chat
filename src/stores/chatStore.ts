import { create } from 'zustand';
import { SavedChatSession, ChatGroup, ChatMessage, UploadedFile, ChatSettingsUpdater } from '../types';
import { dbService } from '@/services/db/dbService';
import { logService } from '../services/logService';
import { rehydrateSessionFiles } from '../utils/chat/session';
import { syncActiveSessionRoute, type SessionHistoryMode } from './sessionRouteSync';
import { broadcastSyncMessage } from './chatSyncChannel';
import { sanitizeSessionModel, sortSessionsInPlace } from './sessionModels';
import {
  updateMessageInSession as updateMessageInSessions,
  updateSessionById as updateSessionByIdInSessions,
} from '../utils/chat/sessionMutations';
import { mergeSessionMetadata } from './sessionRefresh';
import {
  createVirtualFullSessions,
  getSessionPersistenceChanges,
  stripStoredSessionMessages,
} from './sessionPersistence';
import { persistSessionChanges } from './sessionPersistenceEffects';
import { setupChatStoreSync } from './chatStoreSync';
import { createChatUiSlice, type ChatUiSliceActions, type ChatUiSliceState } from './chatStoreSlices';

type UpdaterOrValue<T> = T | ((prev: T) => T);
type SessionUpdateOptions = { persist?: boolean };
type MessagePatchOrUpdater = Partial<ChatMessage> | ((message: ChatMessage) => ChatMessage);
export type { SessionHistoryMode };
export interface SetActiveSessionOptions {
  history?: SessionHistoryMode;
}

// ── Internal refs (not in Zustand state to avoid re-renders) ──
// Typed as MutableRefObject so downstream hooks see the correct shape
const _activeJobs: { current: Map<string, AbortController> } = { current: new Map() };
const _userScrolledUp: { current: boolean } = { current: false };
const _fileDrafts: { current: Record<string, UploadedFile[]> } = { current: {} };
const _localLoadingSessionIds = new Set<string>();
const _sessionPersistVersion = new Map<string, number>();
let _fileOperationGeneration = 0;

// ── Store types ──
interface ChatState extends ChatUiSliceState {
  // Session Data
  savedSessions: SavedChatSession[];
  savedGroups: ChatGroup[];
  activeSessionId: string | null;
  activeMessages: ChatMessage[];

  // Read-only refs (accessed via helpers, not reactive)
  _activeJobs: { current: Map<string, AbortController> };
  _userScrolledUp: { current: boolean };
  _fileDrafts: { current: Record<string, UploadedFile[]> };
}

interface ChatActions extends ChatUiSliceActions {
  // Session setters
  setSavedSessions: (v: UpdaterOrValue<SavedChatSession[]>) => void;
  setSavedGroups: (v: UpdaterOrValue<ChatGroup[]>) => void;
  setActiveSessionId: (id: UpdaterOrValue<string | null>, options?: SetActiveSessionOptions) => void;
  setActiveMessages: (v: UpdaterOrValue<ChatMessage[]>) => void;

  // Persistence
  updateAndPersistSessions: (
    updater: (prev: SavedChatSession[]) => SavedChatSession[],
    options?: SessionUpdateOptions,
  ) => void;
  updateSessionById: (
    sessionId: string,
    updater: (session: SavedChatSession) => SavedChatSession,
    options?: SessionUpdateOptions,
  ) => void;
  updateActiveSession: (
    updater: (session: SavedChatSession) => SavedChatSession,
    options?: SessionUpdateOptions,
  ) => void;
  updateMessageInSession: (
    sessionId: string,
    messageId: string,
    updater: MessagePatchOrUpdater,
    options?: SessionUpdateOptions,
  ) => void;
  updateMessageInActiveSession: (
    messageId: string,
    updater: MessagePatchOrUpdater,
    options?: SessionUpdateOptions,
  ) => void;
  appendMessageToSession: (sessionId: string, message: ChatMessage, options?: SessionUpdateOptions) => void;
  appendMessageToActiveSession: (message: ChatMessage, options?: SessionUpdateOptions) => void;
  updateAndPersistGroups: (updater: (prev: ChatGroup[]) => ChatGroup[]) => void;
  refreshSessions: () => Promise<void>;
  refreshGroups: () => Promise<void>;
  setSessionLoading: (sessionId: string, isLoading: boolean) => void;
  getFileOperationGeneration: () => number;
  invalidateFileOperations: () => void;

  // Computed helpers (call getState inside)
  setCurrentChatSettings: ChatSettingsUpdater;
}

export const useChatStore = create<ChatState & ChatActions>((set, get) => ({
  // ── Initial State ──
  savedSessions: [],
  savedGroups: [],
  activeSessionId: null,
  activeMessages: [],

  ...createChatUiSlice<ChatState & ChatActions>(set),

  _activeJobs,
  _userScrolledUp,
  _fileDrafts,

  // ── Session Setters ──
  setSavedSessions: (v) =>
    set((s) => ({
      savedSessions: typeof v === 'function' ? v(s.savedSessions) : v,
    })),

  setSavedGroups: (v) =>
    set((s) => ({
      savedGroups: typeof v === 'function' ? v(s.savedGroups) : v,
    })),

  setActiveSessionId: (value, options) => {
    const nextValue = typeof value === 'function' ? value(get().activeSessionId) : value;
    set({ activeSessionId: nextValue });
    syncActiveSessionRoute(nextValue, options?.history ?? 'auto');
  },

  setActiveMessages: (v) =>
    set((s) => ({
      activeMessages: typeof v === 'function' ? v(s.activeMessages) : v,
    })),

  // ── Persistence Actions ──
  refreshSessions: async () => {
    try {
      const metadataList = await dbService.getAllSessionMetadata();
      const { activeSessionId, loadingSessionIds, setActiveMessages, setSavedSessions } = get();

      if (activeSessionId && !loadingSessionIds.has(activeSessionId)) {
        const fullActiveSession = await dbService.getSession(activeSessionId);
        if (fullActiveSession) {
          const rehydrated = rehydrateSessionFiles(sanitizeSessionModel(fullActiveSession));
          setActiveMessages(rehydrated.messages);
        }
      }

      setSavedSessions((prev) =>
        mergeSessionMetadata(prev, metadataList, {
          activeSessionId,
          loadingSessionIds,
        }),
      );
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

      const nextSavedSessions =
        !isLoading && sessionId !== s.activeSessionId
          ? s.savedSessions.map((session) =>
              session.id === sessionId && session.messages.length > 0 ? { ...session, messages: [] } : session,
            )
          : s.savedSessions;

      return {
        loadingSessionIds: next,
        savedSessions: nextSavedSessions,
      };
    });

    broadcastSyncMessage({ type: 'SESSION_LOADING', sessionId, isLoading });
  },

  getFileOperationGeneration: () => _fileOperationGeneration,

  invalidateFileOperations: () => {
    _fileOperationGeneration += 1;
  },

  updateAndPersistSessions: (updater, options = {}) => {
    const { persist = true } = options;
    const { savedSessions, activeSessionId, activeMessages, loadingSessionIds } = get();

    const virtualFullSessions = createVirtualFullSessions(savedSessions, activeSessionId, activeMessages);

    // 2. Run Updater
    const newFullSessions = updater(virtualFullSessions);

    // 3. Sort
    sortSessionsInPlace(newFullSessions);

    // 4. Update Active Messages if changed
    if (activeSessionId) {
      const newActiveSession = newFullSessions.find((s) => s.id === activeSessionId);
      if (newActiveSession && newActiveSession.messages !== activeMessages) {
        set({ activeMessages: newActiveSession.messages });
      }
    }

    // 5. Persist
    if (persist) {
      const { modifiedSessions, deletedSessionIds } = getSessionPersistenceChanges(
        virtualFullSessions,
        newFullSessions,
      );

      if (modifiedSessions.length > 0 || deletedSessionIds.length > 0) {
        void persistSessionChanges({
          modifiedSessions,
          deletedSessionIds,
          activeSessionId,
          sessionPersistVersions: _sessionPersistVersion,
          getSession: dbService.getSession.bind(dbService),
          saveSession: dbService.saveSession.bind(dbService),
          deleteSession: dbService.deleteSession.bind(dbService),
          broadcastSyncMessage,
        }).catch((e) => logService.error('Failed to persist session updates', { error: e }));
      }
    }

    // 6. Return Metadata Only (strip messages)
    const metadataOnly = stripStoredSessionMessages(newFullSessions, activeSessionId, loadingSessionIds);

    set({ savedSessions: metadataOnly });
  },

  updateSessionById: (sessionId, updater, options) => {
    get().updateAndPersistSessions(
      (prevSessions) => updateSessionByIdInSessions(prevSessions, sessionId, updater),
      options,
    );
  },

  updateActiveSession: (updater, options) => {
    const { activeSessionId } = get();
    if (!activeSessionId) return;
    get().updateSessionById(activeSessionId, updater, options);
  },

  updateMessageInSession: (sessionId, messageId, updater, options) => {
    get().updateSessionById(
      sessionId,
      (session) => updateMessageInSessions([session], sessionId, messageId, updater)[0],
      options,
    );
  },

  updateMessageInActiveSession: (messageId, updater, options) => {
    const { activeSessionId } = get();
    if (!activeSessionId) return;
    get().updateMessageInSession(activeSessionId, messageId, updater, options);
  },

  appendMessageToSession: (sessionId, message, options) => {
    get().updateSessionById(
      sessionId,
      (session) => ({
        ...session,
        messages: [...session.messages, message],
        timestamp: Date.now(),
      }),
      options,
    );
  },

  appendMessageToActiveSession: (message, options) => {
    const { activeSessionId } = get();
    if (!activeSessionId) return;
    get().appendMessageToSession(activeSessionId, message, options);
  },

  updateAndPersistGroups: (updater) => {
    const { savedGroups } = get();
    const newGroups = updater(savedGroups);
    dbService
      .setAllGroups(newGroups)
      .then(() => broadcastSyncMessage({ type: 'GROUPS_UPDATED' }))
      .catch((e) => logService.error('Failed to persist group updates', { error: e }));
    set({ savedGroups: newGroups });
  },

  setCurrentChatSettings: (updater) => {
    const { activeSessionId } = get();
    if (!activeSessionId) return;
    get().updateAndPersistSessions((prevSessions) =>
      updateSessionByIdInSessions(prevSessions, activeSessionId, (s) => ({ ...s, settings: updater(s.settings) })),
    );
  },
}));

setupChatStoreSync({
  store: useChatStore,
  localLoadingSessionIds: _localLoadingSessionIds,
});
