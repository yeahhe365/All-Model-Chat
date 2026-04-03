
import { useCallback } from 'react';
import { useChatInputHeight } from '../../../hooks/chat-input/useChatInputHeight';
import { useChatStore } from '../../../stores/chatStore';

interface UseChatAreaParams {
  currentChatSettings: { modelId?: string };
}

export const useChatArea = (params: UseChatAreaParams) => {
  const { currentChatSettings } = params;

  const setCommandedInput = useChatStore(s => s.setCommandedInput);

  // Extract logic to custom hook
  const { chatInputHeight, chatInputContainerRef } = useChatInputHeight();

  // Helper to determine model capabilities for UI logic
  const isImagenModel = currentChatSettings.modelId?.includes('imagen') || currentChatSettings.modelId?.includes('gemini-2.5-flash-image');

  const handleQuote = useCallback((text: string) => {
      setCommandedInput({ text: text, id: Date.now(), mode: 'quote' });
  }, [setCommandedInput]);

  const handleInsert = useCallback((text: string) => {
      setCommandedInput({ text: text, id: Date.now(), mode: 'insert' });
  }, [setCommandedInput]);

  return {
    chatInputHeight,
    chatInputContainerRef,
    isImagenModel,
    handleQuote,
    handleInsert
  };
};
