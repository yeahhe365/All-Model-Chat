
import React from 'react';

interface TokenCountInputProps {
    text: string;
    onChange: (text: string) => void;
    t: (key: string) => string;
}

export const TokenCountInput: React.FC<TokenCountInputProps> = ({ text, onChange, t }) => {
    return (
        <div className="space-y-2 flex-grow flex flex-col">
            <label className="text-xs font-bold uppercase text-[var(--theme-text-tertiary)] tracking-wider">
                {t('tokenModal_input')}
            </label>
            <textarea
                value={text}
                onChange={(e) => onChange(e.target.value)}
                placeholder={t('tokenModal_placeholder')}
                className="w-full flex-grow min-h-[120px] p-3 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-lg text-sm text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:border-transparent outline-none resize-none custom-scrollbar font-mono leading-relaxed"
            />
        </div>
    );
};
