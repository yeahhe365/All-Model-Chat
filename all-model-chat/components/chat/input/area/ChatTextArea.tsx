
import React, { useRef, useLayoutEffect } from 'react';
import { MAX_TEXTAREA_HEIGHT_PX } from '../../../../hooks/chat-input/useChatInputState';

interface ChatTextAreaProps {
    textareaRef: React.RefObject<HTMLTextAreaElement>;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    onPaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
    onCompositionStart: () => void;
    onCompositionEnd: () => void;
    onFocus?: () => void;
    placeholder: string;
    disabled: boolean;
    isFullscreen: boolean;
    isMobile: boolean;
    initialTextareaHeight: number;
    isConverting: boolean;
}

export const ChatTextArea: React.FC<ChatTextAreaProps> = ({
    textareaRef,
    value,
    onChange,
    onKeyDown,
    onPaste,
    onCompositionStart,
    onCompositionEnd,
    onFocus,
    placeholder,
    disabled,
    isFullscreen,
    isMobile,
    initialTextareaHeight,
    isConverting,
}) => {
    const shadowRef = useRef<HTMLTextAreaElement>(null);

    useLayoutEffect(() => {
        const target = textareaRef.current;
        const shadow = shadowRef.current;
        if (!target || !shadow) return;

        // Reset shadow height to allow accurate shrinking measurement
        shadow.style.height = '0px';
        shadow.value = value;
        
        if (isFullscreen) {
             target.style.height = '100%';
             target.style.overflowY = 'auto';
        } else {
             const scrollHeight = shadow.scrollHeight;
             const baseHeight = isMobile ? 24 : initialTextareaHeight;
             const newHeight = Math.max(baseHeight, Math.min(scrollHeight, MAX_TEXTAREA_HEIGHT_PX));
             target.style.height = `${newHeight}px`;

             // Only show scrollbar if content exceeds MAX_TEXTAREA_HEIGHT_PX
             if (scrollHeight > MAX_TEXTAREA_HEIGHT_PX) {
                 target.style.overflowY = 'auto';
             } else {
                 target.style.overflowY = 'hidden';
             }
        }
    }, [value, isFullscreen, isMobile, initialTextareaHeight, textareaRef]);

    return (
        <div className="relative w-full flex-grow flex flex-col min-h-0">
            {/* Shadow Textarea for Height Calculation */}
            <textarea
                ref={shadowRef}
                className="absolute top-0 left-0 w-full -z-50 opacity-0 pointer-events-none resize-none px-1 py-1 text-base custom-scrollbar"
                style={{ 
                    height: '0', 
                    overflow: 'hidden',
                    fontFamily: 'inherit',
                    lineHeight: 'inherit',
                    padding: '0.25rem', // Matches px-1 py-1
                }}
                aria-hidden="true"
                tabIndex={-1}
                readOnly
            />

            <textarea
                ref={textareaRef}
                value={value}
                onChange={onChange}
                onKeyDown={onKeyDown}
                onPaste={onPaste}
                onCompositionStart={onCompositionStart}
                onCompositionEnd={onCompositionEnd}
                placeholder={placeholder}
                className="w-full bg-transparent border-0 resize-none px-1 py-1 text-base placeholder:text-[var(--theme-text-tertiary)] focus:ring-0 focus:outline-none custom-scrollbar flex-grow min-h-[24px] transition-[height] duration-150 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]"
                style={{ 
                    height: isFullscreen ? '100%' : `${isMobile ? 24 : initialTextareaHeight}px`,
                    overflowY: isFullscreen ? 'auto' : 'hidden'
                }}
                aria-label="Chat message input"
                onFocus={onFocus}
                disabled={disabled || isConverting}
                rows={1}
            />
        </div>
    );
};
