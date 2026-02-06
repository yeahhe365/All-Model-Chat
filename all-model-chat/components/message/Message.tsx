
import React, { useMemo } from 'react';
import { ChatMessage, UploadedFile, AppSettings, SideViewContent } from '../../types';
import { MessageContent } from './MessageContent';
import { translations } from '../../utils/appUtils';
import { MessageActions } from './MessageActions';

interface MessageProps {
    message: ChatMessage;
    sessionTitle?: string;
    prevMessage?: ChatMessage;
    messageIndex: number;
    onEditMessage: (messageId: string, mode: 'update' | 'resend') => void;
    onDeleteMessage: (messageId: string) => void;
    onRetryMessage: (messageId: string) => void; 
    onImageClick: (file: UploadedFile) => void; // Renamed to onFileClick in logic, kept name for props compat
    onOpenHtmlPreview: (html: string, options?: { initialTrueFullscreen?: boolean }) => void;
    showThoughts: boolean;
    themeId: string;
    baseFontSize: number;
    expandCodeBlocksByDefault: boolean;
    isMermaidRenderingEnabled: boolean;
    isGraphvizRenderingEnabled: boolean;
    onTextToSpeech: (messageId: string, text: string) => void;
    onGenerateCanvas: (messageId: string, text: string) => void;
    onContinueGeneration: (messageId: string) => void;
    ttsMessageId: string | null;
    onSuggestionClick?: (suggestion: string) => void;
    t: (key: keyof typeof translations) => string;
    appSettings: AppSettings;
    onOpenSidePanel: (content: SideViewContent) => void;
    onConfigureFile?: (file: UploadedFile, messageId: string) => void;
    isGemini3?: boolean;
}

export const Message: React.FC<MessageProps> = React.memo((props) => {
    const { message, prevMessage, messageIndex, t } = props;
    
    const isGrouped = prevMessage &&
        prevMessage.role === message.role &&
        !prevMessage.isLoading &&
        !message.isLoading &&
        (new Date(message.timestamp).getTime() - new Date(prevMessage.timestamp).getTime() < 5 * 60 * 1000);

    const isModelThinkingOrHasThoughts = message.role === 'model' && (message.isLoading || (message.thoughts && props.showThoughts));
    
    // User messages align right, model messages align left (default)
    const messageContainerClasses = `flex items-start gap-2 sm:gap-4 group ${isGrouped ? 'mt-1.5' : 'mt-6'} ${message.role === 'user' ? 'justify-end' : 'justify-start'}`;
    
    // Width constraints
    // Mobile: User messages capped at 80% for better visual separation. Model messages use available space (minus actions gap).
    const widthConstraints = message.role === 'user' 
        ? "max-w-[80%] sm:max-w-3xl lg:max-w-4xl xl:max-w-5xl"
        : "max-w-[calc(100%-2.5rem)] sm:max-w-3xl lg:max-w-4xl xl:max-w-5xl";

    let bubbleClasses = `flex flex-col min-w-0 transition-all duration-200 ${widthConstraints} message-content-container `;

    if (message.role === 'user') {
        // User Message: Bubble style
        bubbleClasses += "w-fit px-4 py-3 sm:px-5 sm:py-4 shadow-sm ";
        bubbleClasses += "bg-[var(--theme-bg-user-message)] text-[var(--theme-bg-user-message-text)] rounded-2xl rounded-tr-sm border border-transparent";
    } else if (message.role === 'model') {
        // Model Message: No bubble style
        // Removed padding (px-4 py-3), background, shadow, border, rounded corners
        // Changed to py-0 to further align text top with avatar icon center/top
        bubbleClasses += `w-full py-0 text-[var(--theme-text-primary)] ${isModelThinkingOrHasThoughts ? 'sm:min-w-[320px]' : ''}`;
    } else {
        // Error Message: Bubble style (Red)
        bubbleClasses += "w-fit px-4 py-3 shadow-sm ";
        bubbleClasses += "bg-[var(--theme-bg-error-message)] text-[var(--theme-bg-error-message-text)] rounded-2xl border border-transparent";
    }

    return (
        <div 
            className="relative message-smooth-entry"
            style={{ animationDelay: `${Math.min(messageIndex * 50, 500)}ms` }}
            data-message-id={message.id} 
            data-message-role={message.role}
        >
            <div className={`${messageContainerClasses}`}>
                {message.role !== 'user' && <MessageActions {...props} isGrouped={isGrouped} />}
                <div className={`${bubbleClasses}`}>
                    <MessageContent {...props} />
                </div>
                {message.role === 'user' && <MessageActions {...props} isGrouped={isGrouped} />}
            </div>
        </div>
    );
});
