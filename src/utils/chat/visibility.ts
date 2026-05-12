import type { ChatMessage } from '@/types';

const isVisibleChatMessage = (message: ChatMessage): boolean => !message.isInternalToolMessage;

export const getVisibleChatMessages = (messages: ChatMessage[]): ChatMessage[] => messages.filter(isVisibleChatMessage);
