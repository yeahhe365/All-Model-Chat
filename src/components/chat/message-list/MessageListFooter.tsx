import React from 'react';
import { type ChatMessage } from '@/types';

interface MessageListFooterProps {
  messages: ChatMessage[];
  chatInputHeight: number;
}

const getStableSpacerHeight = (chatInputHeight: number) => Math.ceil(chatInputHeight) + 20;

export const MessageListFooter: React.FC<MessageListFooterProps> = React.memo(({ messages, chatInputHeight }) => {
  // Determine if the last message is loading to increase footer space
  const lastMsg = messages[messages.length - 1];
  const isLastMessageLoading = lastMsg?.role === 'model' && lastMsg?.isLoading;

  const heightStyle: React.CSSProperties = {
    height: isLastMessageLoading ? '85vh' : chatInputHeight ? `${getStableSpacerHeight(chatInputHeight)}px` : '160px',
    overflowAnchor: 'none',
  };

  return <div style={heightStyle} />;
});
