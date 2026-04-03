import React, { useCallback, useRef } from 'react';
import { useUIStore } from '../../stores/uiStore';

export const useAppUI = () => {
  const isSettingsModalOpen = useUIStore((s) => s.isSettingsModalOpen);
  const isPreloadedMessagesModalOpen = useUIStore((s) => s.isPreloadedMessagesModalOpen);
  const isHistorySidebarOpen = useUIStore((s) => s.isHistorySidebarOpen);
  const isLogViewerOpen = useUIStore((s) => s.isLogViewerOpen);
  const setIsSettingsModalOpen = useUIStore((s) => s.setIsSettingsModalOpen);
  const setIsPreloadedMessagesModalOpen = useUIStore((s) => s.setIsPreloadedMessagesModalOpen);
  const setIsHistorySidebarOpen = useUIStore((s) => s.setIsHistorySidebarOpen);
  const setIsLogViewerOpen = useUIStore((s) => s.setIsLogViewerOpen);

  const touchStartRef = useRef({ x: 0, y: 0 });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const firstTouch = e.touches[0];
    if (firstTouch) {
        touchStartRef.current = { x: firstTouch.clientX, y: firstTouch.clientY };
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
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
      }
      else if (deltaX < -swipeThreshold && isHistorySidebarOpen) {
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
