
import React from 'react';
import { Bot, Maximize2 } from 'lucide-react';
import { translations } from '../../../utils/appUtils';

interface ScenarioSystemPromptProps {
    value: string;
    onChange: (value: string) => void;
    onExpand: () => void;
    readOnly: boolean;
    t: (key: keyof typeof translations, fallback?: string) => string;
}

export const ScenarioSystemPrompt: React.FC<ScenarioSystemPromptProps> = ({
    value,
    onChange,
    onExpand,
    readOnly,
    t
}) => {
    return (
        <div className="hidden md:flex w-80 border-r border-[var(--theme-border-secondary)] flex-col bg-[var(--theme-bg-secondary)] flex-shrink-0">
            <div className="p-4 border-b border-[var(--theme-border-secondary)]/50">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--theme-text-tertiary)] flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2"><Bot size={14} /> {t('scenarios_system_prompt_label')}</span>
                    <button
                        onClick={onExpand}
                        className="p-1 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-link)] hover:bg-[var(--theme-bg-tertiary)] rounded transition-colors"
                        title="Expand"
                    >
                        <Maximize2 size={12} />
                    </button>
                </label>
                <p className="text-[10px] text-[var(--theme-text-tertiary)] mb-3">Define the persona, style, and rules for the AI.</p>
            </div>
            <textarea
                value={value}
                onChange={(e) => !readOnly && onChange(e.target.value)}
                placeholder={t('scenarios_system_prompt_placeholder')}
                className="flex-grow w-full bg-transparent border-none outline-none p-4 text-sm text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] resize-none font-mono leading-relaxed custom-scrollbar focus:bg-[var(--theme-bg-input)]/50 transition-colors"
                readOnly={readOnly}
            />
        </div>
    );
};
