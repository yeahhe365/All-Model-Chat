import React, { useState, useMemo, useRef } from 'react';
import { ClipboardCopy, Check, Trash2 } from 'lucide-react';
import { ChatMessage, UploadedFile, ThemeColors } from '../../types';
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
}

export const Message: React.FC<MessageProps> = React.memo((props) => {
    const { message, prevMessage, messageIndex, onDeleteMessage, t } = props;
    
    const isGrouped = prevMessage &&
        prevMessage.role === message.role &&
        !prevMessage.isLoading &&
        !message.isLoading &&
        (new Date(message.timestamp).getTime() - new Date(prevMessage.timestamp).getTime() < 5 * 60 * 1000);

    const isModelThinkingOrHasThoughts = message.role === 'model' && (message.isLoading || (message.thoughts && props.showThoughts));
    
    const messageContainerClasses = `flex items-start gap-1.5 sm:gap-2 group ${isGrouped ? 'mt-1' : 'mt-3 sm:mt-4'} ${message.role === 'user' ? 'justify-end' : 'justify-start'}`;
    const bubbleClasses = `w-fit max-w-[calc(100%-2.75rem)] sm:max-w-3xl lg:max-w-4xl xl:max-w-6xl p-2.5 sm:p-3 rounded-2xl shadow-md flex flex-col min-w-0 ${isModelThinkingOrHasThoughts ? 'sm:min-w-[320px]' : ''}`;

    const roleSpecificBubbleClasses = {
        user: 'bg-[var(--theme-bg-user-message)] text-[var(--theme-bg-user-message-text)] rounded-lg',
        model: 'bg-[var(--theme-bg-model-message)] text-[var(--theme-bg-model-message-text)] rounded-lg',
        error: 'bg-[var(--theme-bg-error-message)] text-[var(--theme-bg-error-message-text)] rounded-lg',
    };

    const [deltaX, setDeltaX] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);
    const [copied, setCopied] = useState(false);
    const touchStartRef = useRef({ x: 0, y: 0 });
    const isSwipeGesture = useRef<boolean | null>(null);
    const isMobile = useMemo(() => typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0), []);

    const SWIPE_THRESHOLD = 80;

    const handleTouchStart = (e: React.TouchEvent) => {
        if (!isMobile || message.isLoading) return;
        touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        isSwipeGesture.current = null;
        setIsSwiping(true);
        setCopied(false);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isMobile || !isSwiping || message.isLoading) return;
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const dx = currentX - touchStartRef.current.x;
        const dy = currentY - touchStartRef.current.y;

        if (isSwipeGesture.current === null) {
            if (Math.abs(dx) > Math.abs(dy) + 5) {
                isSwipeGesture.current = true; // Horizontal
            } else {
                isSwipeGesture.current = false; // Vertical
            }
        }
        
        if (isSwipeGesture.current) {
            e.preventDefault();
            const limitedDx = Math.max(-150, Math.min(150, dx));
            setDeltaX(limitedDx);
        } else {
            setIsSwiping(false);
        }
    };

    const handleTouchEnd = () => {
        if (!isMobile || message.isLoading) return;
        
        if (isSwipeGesture.current) {
            if (deltaX > SWIPE_THRESHOLD) {
                onDeleteMessage(message.id);
            } else if (deltaX < -SWIPE_THRESHOLD) {
                if (message.content) {
                    navigator.clipboard.writeText(message.content);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                }
            }
        }
        
        setIsSwiping(false);
        setDeltaX(0);
        isSwipeGesture.current = null;
    };

    return (
        <div 
            className="relative message-container-animate"
            style={{ animationDelay: `${Math.min(messageIndex * 80, 800)}ms` }}
            data-message-id={message.id} 
            data-message-role={message.role}
        >
             {isMobile && (
                <div 
                    className={`absolute inset-0 rounded-2xl ${isGrouped ? 'mt-1' : 'mt-3 sm:mt-4'}`}
                    aria-hidden="true"
                >
                    <div className="absolute inset-y-0 left-0 w-full flex items-center justify-start pl-6 bg-red-500 text-white rounded-2xl"
                        style={{ 
                            clipPath: `inset(0 ${-deltaX > 0 ? '100%' : `calc(100% - ${deltaX}px)`} 0 0)`,
                            opacity: Math.min(1, Math.abs(deltaX) / SWIPE_THRESHOLD),
                        }}>
                        <Trash2 size={20} />
                    </div>
                    <div className="absolute inset-y-0 right-0 w-full flex items-center justify-end pr-6 bg-blue-500 text-white rounded-2xl"
                        style={{ 
                            clipPath: `inset(0 0 0 ${deltaX < 0 ? `calc(100% - ${-deltaX}px)` : '100%'})`,
                            opacity: Math.min(1, Math.abs(deltaX) / SWIPE_THRESHOLD),
                        }}>
                        {copied ? <Check size={20} /> : <ClipboardCopy size={20} />}
                    </div>
                </div>
            )}
            <div
                className={`${messageContainerClasses}`} 
                style={{ 
                    transform: `translateX(${deltaX}px)`,
                    transition: isSwiping ? 'none' : 'transform 0.3s ease',
                }}
            >
                {message.role !== 'user' && <MessageActions {...props} isGrouped={isGrouped} />}
                <div 
                    className={`${bubbleClasses} ${roleSpecificBubbleClasses[message.role]}`}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    <MessageContent {...props} />
                </div>
                {message.role === 'user' && <MessageActions {...props} isGrouped={isGrouped} />}
            </div>
        </div>
    );
});