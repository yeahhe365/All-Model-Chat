
import { useState, useRef, useEffect } from 'react';

export const useChatInputHeight = () => {
  const [chatInputHeight, setChatInputHeight] = useState(160); // Default reasonable height
  const chatInputContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const chatInputEl = chatInputContainerRef.current;
    if (!chatInputEl) return;

    const resizeObserver = new ResizeObserver(() => {
      setChatInputHeight(chatInputEl.offsetHeight);
    });

    resizeObserver.observe(chatInputEl);

    // Initial measurement
    setChatInputHeight(chatInputEl.offsetHeight);

    return () => resizeObserver.disconnect();
  }, []);

  return { chatInputHeight, chatInputContainerRef };
};
