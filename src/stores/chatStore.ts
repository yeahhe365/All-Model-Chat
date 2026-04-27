import { create } from 'zustand';
import { SavedChatSession, ChatGroup, ChatMessage, UploadedFile, InputCommand, ChatSettings } from '../types';
import type { ImageOutputMode, ImagePersonGeneration } from '../types/settings';
import { dbService } from '../utils/db';
import { logService } from '../services/logService';
import { rehydrateSessionFiles } from '../utils/chat/session';
import { syncActiveSessionRoute, type SessionHistoryMode } from './sessionRouteSync';
import { broadcastSyncMessage } from './chatSyncChannel';
import {
  sanitizeSessionModel,
  sortSessionsInPlace,
} from './sessionModels';
import { mergeSessionMetadata } from './sessionRefresh';
import {
  createVirtualFullSessions,
  getSessionPersistenceChanges,
  stripStoredSessionMessages,
} from './sessionPersistence';
import { persistSessionChanges } from './sessionPersistenceEffects';
import { setupChatStoreSync } from './chatStoreSync';

type UpdaterOrValue<T> = T | ((prev: T) => T);
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
  imageOutputMode: ImageOutputMode;
  personGeneration: ImagePersonGeneration;
  isSwitchingModel: boolean;

  // Read-only refs (accessed via helpers, not reactive)
  _activeJobs: { current: Map<string, AbortController> };
  _userScrolledUp: { current: boolean };
  _fileDrafts: { current: Record<string, UploadedFile[]> };
}

interface ChatActions {
  // Session setters
  setSavedSessions: (v: UpdaterOrValue<SavedChatSession[]>) => void;
  setSavedGroups: (v: UpdaterOrValue<ChatGroup[]>) => void;
  setActiveSessionId: (id: UpdaterOrValue<string | null>, options?: SetActiveSessionOptions) => void;
  setActiveMessages: (v: UpdaterOrValue<ChatMessage[]>) => void;

  // Auxiliary setters
  setEditingMessageId: (id: UpdaterOrValue<string | null>) => void;
  setEditMode: (mode: UpdaterOrValue<'update' | 'resend'>) => void;
  setCommandedInput: (cmd: UpdaterOrValue<InputCommand | null>) => void;
  setLoadingSessionIds: (v: UpdaterOrValue<Set<string>>) => void;
  setGeneratingTitleSessionIds: (v: UpdaterOrValue<Set<string>>) => void;
  setSelectedFiles: (v: UpdaterOrValue<UploadedFile[]>) => void;
  setAppFileError: (v: UpdaterOrValue<string | null>) => void;
  setIsAppProcessingFile: (v: UpdaterOrValue<boolean>) => void;
  setAspectRatio: (v: UpdaterOrValue<string>) => void;
  setImageSize: (v: UpdaterOrValue<string>) => void;
  setImageOutputMode: (v: UpdaterOrValue<ImageOutputMode>) => void;
  setPersonGeneration: (v: UpdaterOrValue<ImagePersonGeneration>) => void;
  setIsSwitchingModel: (v: UpdaterOrValue<boolean>) => void;

  // Persistence
  updateAndPersistSessions: (
    updater: (prev: SavedChatSession[]) => SavedChatSession[],
    options?: { persist?: boolean },
  ) => void;
  updateAndPersistGroups: (updater: (prev: ChatGroup[]) => ChatGroup[]) => void;
  refreshSessions: () => Promise<void>;
  refreshGroups: () => Promise<void>;
  setSessionLoading: (sessionId: string, isLoading: boolean) => void;
  getFileOperationGeneration: () => number;
  invalidateFileOperations: () => void;

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
  imageOutputMode: 'IMAGE_TEXT',
  personGeneration: 'ALLOW_ADULT',
  isSwitchingModel: false,

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

  // ── Auxiliary Setters ──
  setEditingMessageId: (value) =>
    set((state) => ({
      editingMessageId: typeof value === 'function' ? value(state.editingMessageId) : value,
    })),
  setEditMode: (value) =>
    set((state) => ({
      editMode: typeof value === 'function' ? value(state.editMode) : value,
    })),
  setCommandedInput: (value) =>
    set((state) => ({
      commandedInput: typeof value === 'function' ? value(state.commandedInput) : value,
    })),
  setLoadingSessionIds: (v) =>
    set((s) => ({
      loadingSessionIds: typeof v === 'function' ? v(s.loadingSessionIds) : v,
    })),
  setGeneratingTitleSessionIds: (v) =>
    set((s) => ({
      generatingTitleSessionIds: typeof v === 'function' ? v(s.generatingTitleSessionIds) : v,
    })),
  setSelectedFiles: (v) =>
    set((s) => ({
      selectedFiles: typeof v === 'function' ? v(s.selectedFiles) : v,
    })),
  setAppFileError: (value) =>
    set((state) => ({
      appFileError: typeof value === 'function' ? value(state.appFileError) : value,
    })),
  setIsAppProcessingFile: (value) =>
    set((state) => ({
      isAppProcessingFile: typeof value === 'function' ? value(state.isAppProcessingFile) : value,
    })),
  setAspectRatio: (value) =>
    set((state) => ({
      aspectRatio: typeof value === 'function' ? value(state.aspectRatio) : value,
    })),
  setImageSize: (value) =>
    set((state) => ({
      imageSize: typeof value === 'function' ? value(state.imageSize) : value,
    })),
  setImageOutputMode: (value) =>
    set((state) => ({
      imageOutputMode: typeof value === 'function' ? value(state.imageOutputMode) : value,
    })),
  setPersonGeneration: (value) =>
    set((state) => ({
      personGeneration: typeof value === 'function' ? value(state.personGeneration) : value,
    })),
  setIsSwitchingModel: (value) =>
    set((state) => ({
      isSwitchingModel: typeof value === 'function' ? value(state.isSwitchingModel) : value,
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
      prevSessions.map((s) => (s.id === activeSessionId ? { ...s, settings: updater(s.settings) } : s)),
    );
  },
}));

setupChatStoreSync({
  store: useChatStore,
  localLoadingSessionIds: _localLoadingSessionIds,
});
