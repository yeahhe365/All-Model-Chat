
import React, { useMemo } from 'react';
import { ChatMessage, UploadedFile, ThemeColors, AppSettings } from '../../types';
import { MessageContent } from './MessageContent';
import { translations } from '../../utils/appUtils';
import { MessageActions } from './MessageActions';

interface MessageProps {
    message: ChatMessage;
    prevMessage?: ChatMessage;
    messageIndex: number;
    onEditMessage: (messageId: string) => void;
    onDeleteMessage: (messageId: string) => void;
    onRetryMessage: (messageId: string) => void; 
    onEditMessageContent: (message: ChatMessage) => void;
    onImageClick: (file: UploadedFile) => void;
    onOpenHtmlPreview: (html: string, options?: { initialTrueFullscreen?: boolean }) => void;
    showThoughts: boolean;
    themeColors: ThemeColors; 
    themeId: string;
    baseFontSize: number;
    expandCodeBlocksByDefault: boolean;
    isMermaidRenderingEnabled: boolean;
    isGraphvizRenderingEnabled: boolean;
    onTextToSpeech: (messageId: string, text: string) => void;
    ttsMessageId: string | null;
    onSuggestionClick?: (suggestion: string) => void;
    t: (key: keyof typeof translations) => string;
    appSettings: AppSettings;
}

export const Message: React.FC<MessageProps> = React.memo((props) => {
    const { message, prevMessage, messageIndex, t } = props;
    
    const isGrouped = prevMessage &&
        prevMessage.role === message.role &&
        !prevMessage.isLoading &&
        !message.isLoading &&
        (new Date(message.timestamp).getTime() - new Date(prevMessage.timestamp).getTime() < 5 * 60 * 1000);

    const isModelThinkingOrHasThoughts = message.role === 'model' && (message.isLoading || (message.thoughts && props.showThoughts));
    
    const messageContainerClasses = `flex items-start gap-2 sm:gap-3 group ${isGrouped ? 'mt-1.5' : 'mt-6'} ${message.role === 'user' ? 'justify-end' : 'justify-start'}`;
    
    // refined bubble classes: slightly more padding, distinct border radius logic
    const bubbleClasses = `w-fit max-w-[calc(100%-2.5rem)] sm:max-w-3xl lg:max-w-4xl xl:max-w-5xl px-4 py-3 sm:px-5 sm:py-4 shadow-sm flex flex-col min-w-0 transition-all duration-200 ${isModelThinkingOrHasThoughts ? 'sm:min-w-[320px]' : ''}`;

    const roleSpecificBubbleClasses = {
        user: 'bg-[var(--theme-bg-user-message)] text-[var(--theme-bg-user-message-text)] rounded-2xl rounded-tr-sm border border-transparent',
        model: 'bg-[var(--theme-bg-model-message)] text-[var(--theme-bg-model-message-text)] rounded-2xl rounded-tl-sm border border-[var(--theme-border-secondary)]/30',
        error: 'bg-[var(--theme-bg-error-message)] text-[var(--theme-bg-error-message-text)] rounded-2xl border border-transparent',
    };

    return (
        <div 
            className="relative message-container-animate"
            style={{ animationDelay: `${Math.min(messageIndex * 50, 500)}ms` }}
            data-message-id={message.id} 
            data-message-role={message.role}
        >
            <div className={`${messageContainerClasses}`}>
                {message.role !== 'user' && <MessageActions {...props} isGrouped={isGrouped} />}
                <div className={`${bubbleClasses} ${roleSpecificBubbleClasses[message.role]}`}>
                    <MessageContent {...props} />
                </div>
                {message.role === 'user' && <MessageActions {...props} isGrouped={isGrouped} />}
            </div>
        </div>
    );
});
