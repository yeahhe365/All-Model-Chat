import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  createPersistedStateStorage,
  readPersistentStorageItem,
  registerPersistedStoreSync,
  removePersistentStorageItem,
} from './persistentStorage';

const CHAT_DRAFT_STORE_STORAGE_KEY = 'all_model_chat_drafts_v1';

export interface ChatDraft {
  inputText: string;
  quotes: string[];
  ttsContext: string;
}

type UpdaterOrValue<T> = T | ((prev: T) => T);

interface ChatDraftState {
  drafts: Record<string, ChatDraft>;
}

interface ChatDraftActions {
  hydrateLegacySessionDraft: (sessionId: string) => void;
  setDraftText: (sessionId: string, value: UpdaterOrValue<string>) => void;
  setDraftQuotes: (sessionId: string, value: UpdaterOrValue<string[]>) => void;
  setDraftTtsContext: (sessionId: string, value: UpdaterOrValue<string>) => void;
  clearCurrentDraft: (sessionId: string) => void;
  clearSessionDrafts: (sessionIds: Iterable<string>) => void;
}

const EMPTY_DRAFT: ChatDraft = {
  inputText: '',
  quotes: [],
  ttsContext: '',
};

const getLegacyDraftKeys = (sessionId: string) => ({
  draftKey: `chatDraft_${sessionId}`,
  quoteKey: `chatQuotes_${sessionId}`,
  ttsKey: `chatTtsContext_${sessionId}`,
});

const hasDraftContent = (draft: ChatDraft) =>
  draft.inputText.trim().length > 0 || draft.quotes.length > 0 || draft.ttsContext.trim().length > 0;

const readLegacyQuotes = (key: string): string[] => {
  const rawQuotes = readPersistentStorageItem(key);
  if (!rawQuotes) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawQuotes);
    return Array.isArray(parsed) ? parsed.filter((quote): quote is string => typeof quote === 'string') : [];
  } catch {
    return [];
  }
};

const resolveValue = <T>(value: UpdaterOrValue<T>, previous: T) =>
  typeof value === 'function' ? (value as (prev: T) => T)(previous) : value;

const normalizeDraft = (draft: Partial<ChatDraft> | undefined): ChatDraft => ({
  inputText: typeof draft?.inputText === 'string' ? draft.inputText : '',
  quotes: Array.isArray(draft?.quotes)
    ? draft.quotes.filter((quote): quote is string => typeof quote === 'string')
    : [],
  ttsContext: typeof draft?.ttsContext === 'string' ? draft.ttsContext : '',
});

const setSessionDraft = (
  drafts: Record<string, ChatDraft>,
  sessionId: string,
  updater: (draft: ChatDraft) => ChatDraft,
) => {
  if (!sessionId) {
    return drafts;
  }

  const nextDraft = updater(normalizeDraft(drafts[sessionId]));
  if (!hasDraftContent(nextDraft)) {
    const remainingDrafts = { ...drafts };
    delete remainingDrafts[sessionId];
    return remainingDrafts;
  }

  return {
    ...drafts,
    [sessionId]: nextDraft,
  };
};

const pruneEmptyDrafts = (drafts: Record<string, ChatDraft>) =>
  Object.fromEntries(Object.entries(drafts).filter(([, draft]) => hasDraftContent(normalizeDraft(draft))));

export const useChatDraftStore = create<ChatDraftState & ChatDraftActions>()(
  persist(
    (set, get) => ({
      drafts: {},

      hydrateLegacySessionDraft: (sessionId) => {
        if (!sessionId) {
          return;
        }

        const { draftKey, quoteKey, ttsKey } = getLegacyDraftKeys(sessionId);
        const existingDraft = get().drafts[sessionId];

        if (!existingDraft) {
          const legacyDraft = normalizeDraft({
            inputText: readPersistentStorageItem(draftKey) ?? '',
            quotes: readLegacyQuotes(quoteKey),
            ttsContext: readPersistentStorageItem(ttsKey) ?? '',
          });

          if (hasDraftContent(legacyDraft)) {
            set((state) => ({
              drafts: {
                ...state.drafts,
                [sessionId]: legacyDraft,
              },
            }));
          }
        }

        removePersistentStorageItem(draftKey);
        removePersistentStorageItem(quoteKey);
        removePersistentStorageItem(ttsKey);
      },

      setDraftText: (sessionId, value) =>
        set((state) => ({
          drafts: setSessionDraft(state.drafts, sessionId, (draft) => ({
            ...draft,
            inputText: resolveValue(value, draft.inputText),
          })),
        })),

      setDraftQuotes: (sessionId, value) =>
        set((state) => ({
          drafts: setSessionDraft(state.drafts, sessionId, (draft) => ({
            ...draft,
            quotes: resolveValue(value, draft.quotes).filter((quote): quote is string => typeof quote === 'string'),
          })),
        })),

      setDraftTtsContext: (sessionId, value) =>
        set((state) => ({
          drafts: setSessionDraft(state.drafts, sessionId, (draft) => ({
            ...draft,
            ttsContext: resolveValue(value, draft.ttsContext),
          })),
        })),

      clearCurrentDraft: (sessionId) =>
        set((state) => ({
          drafts: setSessionDraft(state.drafts, sessionId, (draft) => ({
            ...EMPTY_DRAFT,
            ttsContext: draft.ttsContext,
          })),
        })),

      clearSessionDrafts: (sessionIds) =>
        set((state) => {
          const idsToClear = new Set(sessionIds);
          return {
            drafts: Object.fromEntries(
              Object.entries(state.drafts).filter(([sessionId]) => !idsToClear.has(sessionId)),
            ),
          };
        }),
    }),
    {
      name: CHAT_DRAFT_STORE_STORAGE_KEY,
      storage: createJSONStorage(() => createPersistedStateStorage({ debounceMs: 300 })),
      partialize: (state) => ({
        drafts: pruneEmptyDrafts(state.drafts),
      }),
    },
  ),
);

registerPersistedStoreSync(useChatDraftStore, CHAT_DRAFT_STORE_STORAGE_KEY);
