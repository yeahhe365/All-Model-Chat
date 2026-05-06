import { createContext, useContext } from 'react';
import { useChatInput } from '../../../hooks/chat-input/useChatInput';

type ChatInputLogic = ReturnType<typeof useChatInput>;

export interface ChatInputContextValue extends ChatInputLogic {
  inputDisabled: boolean;
  initialTextareaHeight: number;
  handleStartLiveCamera: () => Promise<void>;
  handleStartLiveScreenShare: () => Promise<void>;
  queuedSubmissionView?: {
    title: string;
    previewText: string;
    fileCount: number;
    onEdit: () => void;
    onRemove: () => void;
  };
}

export const ChatInputContext = createContext<ChatInputContextValue | null>(null);

export const useChatInputContext = () => {
  const value = useContext(ChatInputContext);
  if (!value) {
    throw new Error('useChatInputContext must be used within ChatInputProvider');
  }
  return value;
};
