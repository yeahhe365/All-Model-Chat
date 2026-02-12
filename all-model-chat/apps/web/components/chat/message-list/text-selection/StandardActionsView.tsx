
import React, { useState } from 'react';
import { Quote, Copy, Check, CornerRightDown, Volume2 } from 'lucide-react';
import { IconGoogle } from '../../../icons/CustomIcons';
import { translations } from '../../../../utils/appUtils';

interface StandardActionsViewProps {
    onQuote: (e: React.MouseEvent) => void;
    onInsert?: (e: React.MouseEvent) => void;
    onCopy: (e: React.MouseEvent) => void;
    onSearch: (e: React.MouseEvent) => void;
    onTTS?: (e: React.MouseEvent) => void;
    isCopied: boolean;
    t?: (key: keyof typeof translations) => string;
}

export const StandardActionsView: React.FC<StandardActionsViewProps> = ({
    onQuote,
    onInsert,
    onCopy,
    onSearch,
    onTTS,
    isCopied,
    t
}) => {
    return (
        <>
            <button
                onMouseDown={onQuote}
                className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-[var(--theme-bg-tertiary)] rounded-full transition-all active:scale-95 text-xs font-medium text-[var(--theme-text-primary)]"
                title="Quote Selection"
            >
                <Quote size={14} className="text-[var(--theme-text-link)]" />
                <span>Quote</span>
            </button>
            
            {onInsert && (
                <>
                    <div className="w-px h-4 bg-[var(--theme-border-secondary)] mx-0.5" />
                    <button
                        onMouseDown={onInsert}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-[var(--theme-bg-tertiary)] rounded-full transition-all active:scale-95 text-xs font-medium text-[var(--theme-text-primary)]"
                        title={t ? t('fill_input') : "Fill Input"}
                    >
                        <CornerRightDown size={14} className="text-[var(--theme-text-secondary)]" />
                        <span>{t ? t('fill_input') : "Fill Input"}</span>
                    </button>
                </>
            )}

            <div className="w-px h-4 bg-[var(--theme-border-secondary)] mx-0.5" />
            
            <button
                onMouseDown={onCopy}
                className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-[var(--theme-bg-tertiary)] rounded-full transition-all active:scale-95 text-xs font-medium text-[var(--theme-text-primary)]"
                title="Copy Raw Text"
            >
                {isCopied ? (
                    <Check size={14} className="text-[var(--theme-text-success)]" />
                ) : (
                    <Copy size={14} className="text-[var(--theme-text-tertiary)]" />
                )}
                <span>{isCopied ? 'Copied' : 'Copy'}</span>
            </button>

            <div className="w-px h-4 bg-[var(--theme-border-secondary)] mx-0.5" />

            <button
                onMouseDown={onSearch}
                className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-[var(--theme-bg-tertiary)] rounded-full transition-all active:scale-95 text-xs font-medium text-[var(--theme-text-primary)]"
                title="Search"
            >
                <IconGoogle size={14} />
                <span>Search</span>
            </button>

            {onTTS && (
                <>
                    <div className="w-px h-4 bg-[var(--theme-border-secondary)] mx-0.5" />
                    <button
                        onMouseDown={onTTS}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-[var(--theme-bg-tertiary)] rounded-full transition-all active:scale-95 text-xs font-medium text-[var(--theme-text-primary)]"
                        title="Read Aloud (TTS)"
                    >
                        <Volume2 size={14} className="text-purple-500" />
                        <span>TTS</span>
                    </button>
                </>
            )}
        </>
    );
};
