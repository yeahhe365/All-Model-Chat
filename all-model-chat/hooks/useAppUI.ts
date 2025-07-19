import { useState, useCallback, useRef } from 'react';

export const useAppUI = () => {
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isPreloadedMessagesModalOpen, setIsPreloadedMessagesModalOpen] = useState<boolean>(false);
  const [isHistorySidebarOpen, setIsHistorySidebarOpen] = useState<boolean>(window.innerWidth >= 768);
  const [isLogViewerOpen, setIsLogViewerOpen] = useState<boolean>(false);

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
      const swipeThreshold = 50; // Minimum horizontal distance in pixels
      const edgeThreshold = 40;  // Width of the left edge area for swipe-to-open gesture

      // Ignore if the swipe is more vertical than horizontal
      if (Math.abs(deltaX) < Math.abs(deltaY)) {
          return;
      }

      // Swipe Right to Open
      if (deltaX > swipeThreshold && !isHistorySidebarOpen && touchStartRef.current.x < edgeThreshold) {
          setIsHistorySidebarOpen(true);
      } 
      // Swipe Left to Close
      else if (deltaX < -swipeThreshold && isHistorySidebarOpen) {
          setIsHistorySidebarOpen(false);
      }
  }, [isHistorySidebarOpen]);

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
