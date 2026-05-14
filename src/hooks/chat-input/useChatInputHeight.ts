import { useState, useRef, useEffect } from 'react';

const measureChatInputHeight = (chatInputEl: HTMLDivElement) => {
  const preciseHeight = chatInputEl.getBoundingClientRect().height;
  return preciseHeight || chatInputEl.offsetHeight;
};

export const useChatInputHeight = () => {
  const [chatInputHeight, setChatInputHeight] = useState(160); // Default reasonable height
  const chatInputContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const chatInputEl = chatInputContainerRef.current;
    if (!chatInputEl) return;

    const resizeObserver = new ResizeObserver(() => {
      setChatInputHeight(measureChatInputHeight(chatInputEl));
    });

    resizeObserver.observe(chatInputEl);

    // Initial measurement
    setChatInputHeight(measureChatInputHeight(chatInputEl));

    return () => resizeObserver.disconnect();
  }, []);

  return { chatInputHeight, chatInputContainerRef };
};
