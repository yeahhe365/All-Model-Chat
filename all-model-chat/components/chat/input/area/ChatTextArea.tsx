
import React from 'react';

interface ChatTextAreaProps {
    textareaRef: React.RefObject<HTMLTextAreaElement>;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    onPaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
    onCompositionStart: () => void;
    onCompositionEnd: () => void;
    onFocus: () => void;
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
    return (
        <textarea
            ref={textareaRef}
            value={value}
            onChange={onChange}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            onCompositionStart={onCompositionStart}
            onCompositionEnd={onCompositionEnd}
            placeholder={placeholder}
            className="w-full bg-transparent border-0 resize-none px-1 py-1 text-base placeholder:text-[var(--theme-text-tertiary)] focus:ring-0 focus:outline-none custom-scrollbar flex-grow min-h-[24px]"
            style={{ height: isFullscreen ? '100%' : `${isMobile ? 24 : initialTextareaHeight}px` }}
            aria-label="Chat message input"
            onFocus={onFocus}
            disabled={disabled || isConverting}
            rows={1}
        />
    );
};
