import { create } from 'zustand';

const DESKTOP_BREAKPOINT = 768;
const HISTORY_SIDEBAR_STORAGE_KEY = 'all_model_chat_history_sidebar_v1';

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
  if (typeof localStorage === 'undefined') {
    return DEFAULT_HISTORY_SIDEBAR_PREFERENCES;
  }

  try {
    const raw = localStorage.getItem(HISTORY_SIDEBAR_STORAGE_KEY);
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

const writeHistorySidebarPreferences = (preferences: HistorySidebarPreferences) => {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(HISTORY_SIDEBAR_STORAGE_KEY, JSON.stringify(preferences));
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
}

interface UIActions {
  setIsSettingsModalOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  setIsPreloadedMessagesModalOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  setIsHistorySidebarOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  setIsHistorySidebarOpenTransient: (v: boolean | ((p: boolean) => boolean)) => void;
  syncHistorySidebarForViewport: () => void;
  setIsLogViewerOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  toggleHistorySidebar: () => void;
}

export const useUIStore = create<UIState & UIActions>((set, get) => ({
  isSettingsModalOpen: false,
  isPreloadedMessagesModalOpen: false,
  ...buildInitialHistorySidebarState(),
  isLogViewerOpen: false,

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
      const nextDesktopOpen = isDesktop ? nextIsOpen : s.desktopHistorySidebarOpen;
      const nextMobileOpen = isDesktop ? s.mobileHistorySidebarOpen : nextIsOpen;
      const nextState = isDesktop
        ? {
            isHistorySidebarOpen: nextIsOpen,
            desktopHistorySidebarOpen: nextDesktopOpen,
          }
        : {
            isHistorySidebarOpen: nextIsOpen,
            mobileHistorySidebarOpen: nextMobileOpen,
          };

      writeHistorySidebarPreferences({
        desktopOpen: nextDesktopOpen,
        mobileOpen: nextMobileOpen,
      });

      return nextState;
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
}));
