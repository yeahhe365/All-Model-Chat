import { create } from 'zustand';

interface UIState {
  isSettingsModalOpen: boolean;
  isPreloadedMessagesModalOpen: boolean;
  isHistorySidebarOpen: boolean;
  isLogViewerOpen: boolean;
}

interface UIActions {
  setIsSettingsModalOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  setIsPreloadedMessagesModalOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  setIsHistorySidebarOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  setIsLogViewerOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  toggleHistorySidebar: () => void;
}

export const useUIStore = create<UIState & UIActions>((set) => ({
  isSettingsModalOpen: false,
  isPreloadedMessagesModalOpen: false,
  isHistorySidebarOpen: typeof window !== 'undefined' ? window.innerWidth >= 768 : false,
  isLogViewerOpen: false,

  setIsSettingsModalOpen: (v) =>
    set((s) => ({
      isSettingsModalOpen: typeof v === 'function' ? v(s.isSettingsModalOpen) : v,
    })),
  setIsPreloadedMessagesModalOpen: (v) =>
    set((s) => ({
      isPreloadedMessagesModalOpen:
        typeof v === 'function' ? v(s.isPreloadedMessagesModalOpen) : v,
    })),
  setIsHistorySidebarOpen: (v) =>
    set((s) => ({
      isHistorySidebarOpen:
        typeof v === 'function' ? v(s.isHistorySidebarOpen) : v,
    })),
  setIsLogViewerOpen: (v) =>
    set((s) => ({
      isLogViewerOpen: typeof v === 'function' ? v(s.isLogViewerOpen) : v,
    })),
  toggleHistorySidebar: () =>
    set((s) => ({ isHistorySidebarOpen: !s.isHistorySidebarOpen })),
}));
