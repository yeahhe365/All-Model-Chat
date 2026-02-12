
import React from 'react';
import { Languages, Loader2, ClipboardCopy, Check } from 'lucide-react';

interface ThinkingActionsProps {
    isExpanded: boolean;
    isShowingTranslation: boolean;
    isTranslatingThoughts: boolean;
    isCopied: boolean;
    onTranslate: (e: React.MouseEvent) => void;
    onCopy: (e: React.MouseEvent) => void;
    t: (key: any, fallback?: string) => string;
}

export const ThinkingActions: React.FC<ThinkingActionsProps> = ({
    isExpanded,
    isShowingTranslation,
    isTranslatingThoughts,
    isCopied,
    onTranslate,
    onCopy,
    t
}) => {
    if (!isExpanded) return null;

    return (
        <div className="flex items-center gap-1 mr-1 animate-in fade-in zoom-in-95 duration-200">
            {/* Translate Button */}
            <button
                onClick={onTranslate}
                className={`
                    p-1.5 rounded-lg
                    text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)]
                    transition-all duration-200
                    ${isShowingTranslation ? 'text-[var(--theme-text-link)]' : ''}
                `}
                title={isShowingTranslation ? "Show Original" : "Translate to Chinese"}
            >
                {isTranslatingThoughts ? (
                    <Loader2 size={15} className="animate-spin" />
                ) : (
                    <Languages size={15} strokeWidth={isShowingTranslation ? 2.5 : 2} />
                )}
            </button>

            {/* Copy Button */}
            <button
                onClick={onCopy}
                className={`
                    p-1.5 rounded-lg
                    text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)]
                    transition-all duration-200
                    ${isCopied ? 'text-[var(--theme-text-success)]' : ''}
                `}
                title={isCopied ? t('copied_button_title') : t('copy_button_title')}
            >
                {isCopied ? <Check size={15} strokeWidth={2.5} /> : <ClipboardCopy size={15} strokeWidth={2} />}
            </button>
        </div>
    );
};
