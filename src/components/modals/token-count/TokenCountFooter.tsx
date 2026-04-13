
import React from 'react';
import { Loader2, Trash2, RefreshCw } from 'lucide-react';

interface TokenCountFooterProps {
    tokenCount: number | null;
    isLoading: boolean;
    hasContent: boolean;
    onClear: () => void;
    onCalculate: () => void;
    t: (key: string) => string;
}

export const TokenCountFooter: React.FC<TokenCountFooterProps> = ({
    tokenCount,
    isLoading,
    hasContent,
    onClear,
    onCalculate,
    t
}) => {
    return (
        <div className="p-4 border-t border-[var(--theme-border-secondary)] bg-[var(--theme-bg-secondary)]/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
                {tokenCount !== null ? (
                    <div className="flex flex-col animate-in fade-in slide-in-from-bottom-2">
                        <span className="text-xs text-[var(--theme-text-tertiary)] font-medium uppercase tracking-wide">Estimated Cost</span>
                        <span className="text-2xl font-bold text-[var(--theme-text-link)] font-mono tabular-nums">
                            {tokenCount.toLocaleString()} <span className="text-sm font-sans font-normal text-[var(--theme-text-secondary)]">tokens</span>
                        </span>
                    </div>
                ) : (
                    <span className="text-sm text-[var(--theme-text-tertiary)] italic">Ready to calculate</span>
                )}
            </div>

            <div className="flex gap-3">
                <button 
                    onClick={onClear}
                    className="px-4 py-2 text-sm font-medium text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors flex items-center gap-2"
                    title="Clear All"
                >
                    <Trash2 size={16} /> <span className="hidden sm:inline">{t('tokenModal_clear')}</span>
                </button>
                <button 
                    onClick={onCalculate}
                    disabled={isLoading || !hasContent}
                    className="px-5 py-2 text-sm font-bold bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-text-accent)] rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
                >
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                    {t('tokenModal_count')}
                </button>
            </div>
        </div>
    );
};
