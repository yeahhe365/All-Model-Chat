import React, { useCallback, useEffect, useRef } from 'react';
import { useUIStore } from '../../stores/uiStore';

const DESKTOP_BREAKPOINT = 768;

const isSidebarElement = (target: EventTarget | null) =>
  target instanceof Element && target.closest('[data-history-sidebar-root="true"]') !== null;

export const useAppUI = () => {
  const isSettingsModalOpen = useUIStore((s) => s.isSettingsModalOpen);
  const isPreloadedMessagesModalOpen = useUIStore((s) => s.isPreloadedMessagesModalOpen);
  const isHistorySidebarOpen = useUIStore((s) => s.isHistorySidebarOpen);
  const isLogViewerOpen = useUIStore((s) => s.isLogViewerOpen);
  const setIsSettingsModalOpen = useUIStore((s) => s.setIsSettingsModalOpen);
  const setIsPreloadedMessagesModalOpen = useUIStore((s) => s.setIsPreloadedMessagesModalOpen);
  const setIsHistorySidebarOpen = useUIStore((s) => s.setIsHistorySidebarOpen);
  const setIsHistorySidebarOpenTransient = useUIStore((s) => s.setIsHistorySidebarOpenTransient);
  const syncHistorySidebarForViewport = useUIStore((s) => s.syncHistorySidebarForViewport);
  const setIsLogViewerOpen = useUIStore((s) => s.setIsLogViewerOpen);

  const touchStartRef = useRef({ x: 0, y: 0, startedInSidebar: false });
  const wasDesktopRef = useRef(window.innerWidth >= DESKTOP_BREAKPOINT);
  const resizeFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const syncSidebarForCurrentViewport = () => {
      resizeFrameRef.current = null;
      const isDesktop = window.innerWidth >= DESKTOP_BREAKPOINT;
      if (isDesktop !== wasDesktopRef.current) {
        wasDesktopRef.current = isDesktop;
        syncHistorySidebarForViewport();
      }
    };

    const handleResize = () => {
      if (resizeFrameRef.current !== null) {
        return;
      }

      resizeFrameRef.current = window.requestAnimationFrame(syncSidebarForCurrentViewport);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeFrameRef.current !== null) {
        window.cancelAnimationFrame(resizeFrameRef.current);
        resizeFrameRef.current = null;
      }
    };
  }, [syncHistorySidebarForViewport]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.innerWidth >= DESKTOP_BREAKPOINT) {
      return;
    }

    const firstTouch = e.touches[0];
    if (firstTouch) {
      touchStartRef.current = {
        x: firstTouch.clientX,
        y: firstTouch.clientY,
        startedInSidebar: isSidebarElement(e.target),
      };
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (window.innerWidth >= DESKTOP_BREAKPOINT) {
      return;
    }

    const lastTouch = e.changedTouches[0];
    if (!lastTouch) return;

    const deltaX = lastTouch.clientX - touchStartRef.current.x;
    const deltaY = lastTouch.clientY - touchStartRef.current.y;
    const swipeThreshold = 50;
    const edgeThreshold = 40;

    if (Math.abs(deltaX) < Math.abs(deltaY)) {
      return;
    }

    if (deltaX > swipeThreshold && !isHistorySidebarOpen && touchStartRef.current.x < edgeThreshold) {
      setIsHistorySidebarOpen(true);
    } else if (
      deltaX < -swipeThreshold &&
      isHistorySidebarOpen &&
      touchStartRef.current.startedInSidebar
    ) {
      setIsHistorySidebarOpen(false);
    }
  }, [isHistorySidebarOpen, setIsHistorySidebarOpen]);

  return {
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    isPreloadedMessagesModalOpen,
    setIsPreloadedMessagesModalOpen,
    isHistorySidebarOpen,
    setIsHistorySidebarOpen,
    setIsHistorySidebarOpenTransient,
    isLogViewerOpen,
    setIsLogViewerOpen,
    handleTouchStart,
    handleTouchEnd,
  };
};
