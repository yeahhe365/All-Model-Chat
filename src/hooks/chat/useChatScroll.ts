import { useRef, useCallback } from 'react';

export const useChatScroll = () => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const setScrollContainerRef = useCallback((node: HTMLDivElement | null) => {
    scrollContainerRef.current = node;
  }, []);

  return {
    scrollContainerRef,
    setScrollContainerRef,
  };
};
