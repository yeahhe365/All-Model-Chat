import { useEffect } from 'react';
import { useChatInputHeight } from '../../../hooks/chat-input/useChatInputHeight';
import { useChatRuntimeStore } from '../../../stores/chatRuntimeStore';

export const useChatArea = () => {
  const { chatInputHeight, chatInputContainerRef } = useChatInputHeight();
  const setChatInputHeight = useChatRuntimeStore((s) => s.setChatInputHeight);

  useEffect(() => {
    setChatInputHeight(chatInputHeight);
  }, [chatInputHeight, setChatInputHeight]);

  return {
    chatInputContainerRef,
  };
};
