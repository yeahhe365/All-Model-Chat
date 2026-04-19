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
  const setIsLogViewerOpen = useUIStore((s) => s.setIsLogViewerOpen);

  const touchStartRef = useRef({ x: 0, y: 0, startedInSidebar: false });
  const wasDesktopRef = useRef(window.innerWidth >= DESKTOP_BREAKPOINT);

  useEffect(() => {
    const handleResize = () => {
      const isDesktop = window.innerWidth >= DESKTOP_BREAKPOINT;
      if (isDesktop !== wasDesktopRef.current) {
        wasDesktopRef.current = isDesktop;
        setIsHistorySidebarOpen(isDesktop);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setIsHistorySidebarOpen]);

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
    isLogViewerOpen,
    setIsLogViewerOpen,
    handleTouchStart,
    handleTouchEnd,
  };
};
