import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useAppUI } from './useAppUI';
import { useUIStore } from '../../stores/uiStore';

const renderHook = <T,>(callback: () => T) => {
  const container = document.createElement('div');
  const root = createRoot(container);
  const result: { current: T | null } = { current: null };

  const TestComponent = () => {
    result.current = callback();
    return null;
  };

  act(() => {
    root.render(<TestComponent />);
  });

  return {
    result: result as { current: T },
    unmount: () => {
      act(() => {
        root.unmount();
      });
    },
  };
};

const createTouchEvent = (
  target: EventTarget,
  x: number,
  y: number,
): React.TouchEvent => ({
  target,
  touches: [{ clientX: x, clientY: y }],
  changedTouches: [{ clientX: x, clientY: y }],
} as unknown as React.TouchEvent);

describe('useAppUI', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 375,
      writable: true,
    });
    useUIStore.setState({
      isSettingsModalOpen: false,
      isPreloadedMessagesModalOpen: false,
      isHistorySidebarOpen: false,
      desktopHistorySidebarOpen: true,
      mobileHistorySidebarOpen: false,
      isLogViewerOpen: false,
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('does not close the sidebar when a left swipe starts outside the sidebar', () => {
    useUIStore.setState({ isHistorySidebarOpen: true });
    const { result, unmount } = renderHook(() => useAppUI());

    const mainContent = document.createElement('div');
    document.body.appendChild(mainContent);

    act(() => {
      result.current.handleTouchStart(createTouchEvent(mainContent, 240, 12));
      result.current.handleTouchEnd(createTouchEvent(mainContent, 120, 12));
    });

    expect(useUIStore.getState().isHistorySidebarOpen).toBe(true);

    unmount();
  });

  it('closes the sidebar when a left swipe starts inside the sidebar on mobile', () => {
    useUIStore.setState({ isHistorySidebarOpen: true });
    const { result, unmount } = renderHook(() => useAppUI());

    const sidebar = document.createElement('aside');
    sidebar.setAttribute('data-history-sidebar-root', 'true');
    document.body.appendChild(sidebar);

    act(() => {
      result.current.handleTouchStart(createTouchEvent(sidebar, 240, 12));
      result.current.handleTouchEnd(createTouchEvent(sidebar, 120, 12));
    });

    expect(useUIStore.getState().isHistorySidebarOpen).toBe(false);

    unmount();
  });

  it('ignores swipe gestures on desktop widths', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1024,
      writable: true,
    });
    useUIStore.setState({ isHistorySidebarOpen: false });
    const { result, unmount } = renderHook(() => useAppUI());

    const edge = document.createElement('div');
    document.body.appendChild(edge);

    act(() => {
      result.current.handleTouchStart(createTouchEvent(edge, 12, 10));
      result.current.handleTouchEnd(createTouchEvent(edge, 100, 10));
    });

    expect(useUIStore.getState().isHistorySidebarOpen).toBe(false);

    unmount();
  });

  it('restores the remembered sidebar visibility for each breakpoint', () => {
    useUIStore.setState({
      isHistorySidebarOpen: false,
      desktopHistorySidebarOpen: false,
      mobileHistorySidebarOpen: true,
    });
    const { unmount } = renderHook(() => useAppUI());

    act(() => {
      window.innerWidth = 1024;
      window.dispatchEvent(new Event('resize'));
    });
    expect(useUIStore.getState().isHistorySidebarOpen).toBe(false);

    act(() => {
      window.innerWidth = 375;
      window.dispatchEvent(new Event('resize'));
    });
    expect(useUIStore.getState().isHistorySidebarOpen).toBe(true);

    unmount();
  });
});
