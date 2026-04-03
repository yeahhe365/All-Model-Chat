
import React, { useMemo } from 'react';
import { ChatMessage } from '../../../types';

interface MessageListFooterProps {
    messages: ChatMessage[];
    chatInputHeight: number;
}

export const MessageListFooter: React.FC<MessageListFooterProps> = React.memo(({ messages, chatInputHeight }) => {
    // Determine if the last message is loading to increase footer space
    const lastMsg = messages[messages.length - 1];
    const isLastMessageLoading = lastMsg?.role === 'model' && lastMsg?.isLoading;

    const heightStyle = {
        height: isLastMessageLoading 
            ? '85vh' 
            : (chatInputHeight ? `${chatInputHeight + 20}px` : '160px'),
        transition: 'height 0.3s ease-out'
    };

    return <div style={heightStyle} />;
});
