import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  createPersistedStateStorage,
  readPersistentStorageItem,
  registerPersistedStoreSync,
} from './persistentStorage';

const DESKTOP_BREAKPOINT = 768;
const UI_PREFERENCES_STORAGE_KEY = 'all_model_chat_ui_preferences_v1';
const LEGACY_HISTORY_SIDEBAR_STORAGE_KEY = 'all_model_chat_history_sidebar_v1';

type HistorySidebarPreferences = {
  desktopOpen: boolean;
  mobileOpen: boolean;
};

const DEFAULT_HISTORY_SIDEBAR_PREFERENCES: HistorySidebarPreferences = {
  desktopOpen: true,
  mobileOpen: false,
};

const isDesktopViewport = () => (typeof window !== 'undefined' ? window.innerWidth >= DESKTOP_BREAKPOINT : true);

const readHistorySidebarPreferences = (): HistorySidebarPreferences => {
  try {
    const raw = readPersistentStorageItem(LEGACY_HISTORY_SIDEBAR_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_HISTORY_SIDEBAR_PREFERENCES;
    }

    const parsed = JSON.parse(raw) as Partial<HistorySidebarPreferences>;
    return {
      desktopOpen:
        typeof parsed.desktopOpen === 'boolean' ? parsed.desktopOpen : DEFAULT_HISTORY_SIDEBAR_PREFERENCES.desktopOpen,
      mobileOpen:
        typeof parsed.mobileOpen === 'boolean' ? parsed.mobileOpen : DEFAULT_HISTORY_SIDEBAR_PREFERENCES.mobileOpen,
    };
  } catch {
    return DEFAULT_HISTORY_SIDEBAR_PREFERENCES;
  }
};

const buildInitialHistorySidebarState = () => {
  const preferences = readHistorySidebarPreferences();
  return {
    desktopHistorySidebarOpen: preferences.desktopOpen,
    mobileHistorySidebarOpen: preferences.mobileOpen,
    isHistorySidebarOpen: isDesktopViewport() ? preferences.desktopOpen : preferences.mobileOpen,
  };
};

interface UIState {
  isSettingsModalOpen: boolean;
  isPreloadedMessagesModalOpen: boolean;
  isHistorySidebarOpen: boolean;
  desktopHistorySidebarOpen: boolean;
  mobileHistorySidebarOpen: boolean;
  isLogViewerOpen: boolean;
  chatInputHeight: number;
}

interface UIActions {
  setIsSettingsModalOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  setIsPreloadedMessagesModalOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  setIsHistorySidebarOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  setIsHistorySidebarOpenTransient: (v: boolean | ((p: boolean) => boolean)) => void;
  syncHistorySidebarForViewport: () => void;
  setIsLogViewerOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  toggleHistorySidebar: () => void;
  setChatInputHeight: (height: number) => void;
}

type PersistedUiPreferences = Pick<UIState, 'desktopHistorySidebarOpen' | 'mobileHistorySidebarOpen'>;

const mergePersistedUiPreferences = (
  persistedState: unknown,
  currentState: UIState & UIActions,
): UIState & UIActions => {
  const persistedPreferences = (persistedState ?? {}) as Partial<PersistedUiPreferences>;
  const desktopHistorySidebarOpen =
    typeof persistedPreferences.desktopHistorySidebarOpen === 'boolean'
      ? persistedPreferences.desktopHistorySidebarOpen
      : currentState.desktopHistorySidebarOpen;
  const mobileHistorySidebarOpen =
    typeof persistedPreferences.mobileHistorySidebarOpen === 'boolean'
      ? persistedPreferences.mobileHistorySidebarOpen
      : currentState.mobileHistorySidebarOpen;

  return {
    ...currentState,
    desktopHistorySidebarOpen,
    mobileHistorySidebarOpen,
    isHistorySidebarOpen: isDesktopViewport() ? desktopHistorySidebarOpen : mobileHistorySidebarOpen,
  };
};

export const useUIStore = create<UIState & UIActions>()(
  persist(
    (set, get) => ({
      isSettingsModalOpen: false,
      isPreloadedMessagesModalOpen: false,
      ...buildInitialHistorySidebarState(),
      isLogViewerOpen: false,
      chatInputHeight: 160,

      setIsSettingsModalOpen: (v) =>
        set((s) => ({
          isSettingsModalOpen: typeof v === 'function' ? v(s.isSettingsModalOpen) : v,
        })),
      setIsPreloadedMessagesModalOpen: (v) =>
        set((s) => ({
          isPreloadedMessagesModalOpen: typeof v === 'function' ? v(s.isPreloadedMessagesModalOpen) : v,
        })),
      setIsHistorySidebarOpen: (v) =>
        set((s) => {
          const nextIsOpen = typeof v === 'function' ? v(s.isHistorySidebarOpen) : v;
          const isDesktop = isDesktopViewport();

          return isDesktop
            ? {
                isHistorySidebarOpen: nextIsOpen,
                desktopHistorySidebarOpen: nextIsOpen,
              }
            : {
                isHistorySidebarOpen: nextIsOpen,
                mobileHistorySidebarOpen: nextIsOpen,
              };
        }),
      setIsHistorySidebarOpenTransient: (v) =>
        set((s) => ({
          isHistorySidebarOpen: typeof v === 'function' ? v(s.isHistorySidebarOpen) : v,
        })),
      syncHistorySidebarForViewport: () =>
        set((s) => ({
          isHistorySidebarOpen: isDesktopViewport() ? s.desktopHistorySidebarOpen : s.mobileHistorySidebarOpen,
        })),
      setIsLogViewerOpen: (v) =>
        set((s) => ({
          isLogViewerOpen: typeof v === 'function' ? v(s.isLogViewerOpen) : v,
        })),
      toggleHistorySidebar: () => get().setIsHistorySidebarOpen((s) => !s),
      setChatInputHeight: (height) => set({ chatInputHeight: height }),
    }),
    {
      name: UI_PREFERENCES_STORAGE_KEY,
      storage: createJSONStorage(() => createPersistedStateStorage()),
      partialize: (state) => ({
        desktopHistorySidebarOpen: state.desktopHistorySidebarOpen,
        mobileHistorySidebarOpen: state.mobileHistorySidebarOpen,
      }),
      merge: mergePersistedUiPreferences,
    },
  ),
);

registerPersistedStoreSync(useUIStore, UI_PREFERENCES_STORAGE_KEY);
