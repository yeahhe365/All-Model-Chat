import { beforeEach, describe, expect, it, vi } from 'vitest';

const HISTORY_SIDEBAR_STORAGE_KEY = 'all_model_chat_history_sidebar_v1';

const setViewportWidth = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: width,
    writable: true,
  });
};

const importFreshUIStore = async () => {
  vi.resetModules();
  return import('../uiStore');
};

describe('uiStore history sidebar preferences', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('hydrates the current sidebar state from the desktop preference', async () => {
    localStorage.setItem(
      HISTORY_SIDEBAR_STORAGE_KEY,
      JSON.stringify({ desktopOpen: false, mobileOpen: true }),
    );
    setViewportWidth(1024);

    const { useUIStore } = await importFreshUIStore();

    expect(useUIStore.getState().isHistorySidebarOpen).toBe(false);
    expect(useUIStore.getState().desktopHistorySidebarOpen).toBe(false);
    expect(useUIStore.getState().mobileHistorySidebarOpen).toBe(true);
  });

  it('hydrates the current sidebar state from the mobile preference', async () => {
    localStorage.setItem(
      HISTORY_SIDEBAR_STORAGE_KEY,
      JSON.stringify({ desktopOpen: true, mobileOpen: true }),
    );
    setViewportWidth(375);

    const { useUIStore } = await importFreshUIStore();

    expect(useUIStore.getState().isHistorySidebarOpen).toBe(true);
    expect(useUIStore.getState().desktopHistorySidebarOpen).toBe(true);
    expect(useUIStore.getState().mobileHistorySidebarOpen).toBe(true);
  });

  it('persists only the current viewport preference when the user toggles the sidebar', async () => {
    setViewportWidth(1024);
    const { useUIStore } = await importFreshUIStore();

    useUIStore.setState({
      isHistorySidebarOpen: true,
      desktopHistorySidebarOpen: true,
      mobileHistorySidebarOpen: false,
    });

    useUIStore.getState().setIsHistorySidebarOpen(false);

    expect(useUIStore.getState().isHistorySidebarOpen).toBe(false);
    expect(useUIStore.getState().desktopHistorySidebarOpen).toBe(false);
    expect(useUIStore.getState().mobileHistorySidebarOpen).toBe(false);
    expect(JSON.parse(localStorage.getItem(HISTORY_SIDEBAR_STORAGE_KEY) || '{}')).toEqual({
      desktopOpen: false,
      mobileOpen: false,
    });
  });

  it('does not overwrite remembered preferences when the sidebar is changed transiently', async () => {
    setViewportWidth(1024);
    const { useUIStore } = await importFreshUIStore();

    useUIStore.setState({
      isHistorySidebarOpen: true,
      desktopHistorySidebarOpen: true,
      mobileHistorySidebarOpen: false,
    });

    useUIStore.getState().setIsHistorySidebarOpenTransient(false);

    expect(useUIStore.getState().isHistorySidebarOpen).toBe(false);
    expect(useUIStore.getState().desktopHistorySidebarOpen).toBe(true);
    expect(useUIStore.getState().mobileHistorySidebarOpen).toBe(false);
    expect(localStorage.getItem(HISTORY_SIDEBAR_STORAGE_KEY)).toBeNull();

    useUIStore.getState().syncHistorySidebarForViewport();

    expect(useUIStore.getState().isHistorySidebarOpen).toBe(true);
  });
});
