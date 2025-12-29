
import React from 'react';
import { ChatInputProps } from '../../../types/chat';
import { useChatInputController } from '../../../hooks/chat-input/useChatInputController';
import { ChatInputView } from './ChatInputView';

// Re-export type for consumers if needed
export type { ChatInputProps };

export const ChatInput: React.FC<ChatInputProps> = (props) => {
  const controller = useChatInputController(props);
  return <ChatInputView {...controller} />;
};
