
import React from 'react';
import { Reply, X } from 'lucide-react';

interface ChatQuoteDisplayProps {
    quoteText: string;
    onClearQuote: () => void;
}

export const ChatQuoteDisplay: React.FC<ChatQuoteDisplayProps> = ({ quoteText, onClearQuote }) => {
    if (!quoteText) return null;

    return (
        <div className="flex items-start gap-3 p-3 bg-[var(--theme-bg-tertiary)]/50 rounded-xl relative group/quote mb-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--theme-text-tertiary)] rounded-l-xl opacity-50"></div>
            <div className="flex-shrink-0 text-[var(--theme-text-tertiary)] mt-0.5 ml-2">
                <Reply size={16} className="transform -scale-x-100" />
            </div>
            <div className="flex-grow min-w-0 pr-6">
                <p className="text-sm text-[var(--theme-text-secondary)] line-clamp-3 leading-relaxed font-medium">
                    {quoteText}
                </p>
            </div>
            <button
                type="button"
                onClick={onClearQuote}
                className="absolute top-2 right-2 p-1 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded-full transition-colors"
                aria-label="Remove quote"
            >
                <X size={14} />
            </button>
        </div>
    );
};
