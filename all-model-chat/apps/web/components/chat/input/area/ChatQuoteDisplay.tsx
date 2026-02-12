
import React from 'react';
import { Quote, Trash2 } from 'lucide-react';
import { MarkdownRenderer } from '../../../message/MarkdownRenderer';
import { translations } from '../../../../utils/appUtils';

interface ChatQuoteDisplayProps {
    quotes: string[];
    onRemoveQuote: (index: number) => void;
    themeId: string;
    t: (key: keyof typeof translations) => string;
}

export const ChatQuoteDisplay: React.FC<ChatQuoteDisplayProps> = ({ quotes, onRemoveQuote, themeId, t }) => {
    if (!quotes || quotes.length === 0) return null;

    return (
        <div className="flex flex-col gap-2 mb-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {quotes.map((quote, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-[var(--theme-bg-tertiary)]/50 rounded-xl relative group/quote">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--theme-text-tertiary)] rounded-l-xl opacity-50"></div>
                    <div className="flex-shrink-0 text-[var(--theme-text-tertiary)] mt-0.5 ml-2">
                        <Quote size={16} className="opacity-80" />
                    </div>
                    <div className="flex-grow min-w-0 pr-6">
                        {quotes.length > 1 && (
                            <div className="text-[10px] font-bold text-[var(--theme-text-tertiary)] uppercase tracking-wider mb-1">
                                Quote {index + 1}
                            </div>
                        )}
                        <div className="max-h-[160px] overflow-y-auto custom-scrollbar">
                            <div className="markdown-body text-sm text-[var(--theme-text-secondary)]" style={{ fontSize: '13px' }}>
                                <MarkdownRenderer
                                    content={quote}
                                    isLoading={false}
                                    onImageClick={() => {}}
                                    onOpenHtmlPreview={() => {}}
                                    expandCodeBlocksByDefault={false}
                                    isMermaidRenderingEnabled={true}
                                    isGraphvizRenderingEnabled={false}
                                    t={t}
                                    themeId={themeId}
                                    onOpenSidePanel={() => {}}
                                />
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => onRemoveQuote(index)}
                        className="absolute top-2 right-2 p-1 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-danger)] hover:bg-[var(--theme-bg-danger)]/10 rounded-full transition-colors"
                        aria-label="Remove quote"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            ))}
        </div>
    );
};
