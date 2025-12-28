
import { useCallback } from 'react';
import { useChatInputHeight } from '../../../hooks/chat-input/useChatInputHeight';
import { ChatAreaProps } from './ChatAreaProps';

export const useChatArea = (props: ChatAreaProps) => {
  const { currentChatSettings, setCommandedInput } = props;

  // Extract logic to custom hook
  const { chatInputHeight, chatInputContainerRef } = useChatInputHeight();

  // Helper to determine model capabilities for UI logic
  const isImagenModel = currentChatSettings.modelId?.includes('imagen') || currentChatSettings.modelId?.includes('gemini-2.5-flash-image');

  const handleQuote = useCallback((text: string) => {
      setCommandedInput({ text: text, id: Date.now(), mode: 'quote' });
  }, [setCommandedInput]);

  return {
    chatInputHeight,
    chatInputContainerRef,
    isImagenModel,
    handleQuote
  };
};
