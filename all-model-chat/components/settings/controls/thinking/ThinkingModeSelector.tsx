
import React from 'react';
import { Settings2, Ban } from 'lucide-react';
import { SparklesIcon } from './SparklesIcon';

interface ThinkingModeSelectorProps {
    mode: 'auto' | 'off' | 'custom';
    onModeChange: (mode: 'auto' | 'off' | 'custom') => void;
    isGemini3: boolean;
    isMandatoryThinking: boolean;
    t: (key: string) => string;
}

export const ThinkingModeSelector: React.FC<ThinkingModeSelectorProps> = ({
    mode,
    onModeChange,
    isGemini3,
    isMandatoryThinking,
    t
}) => {
    return (
        <div className={`grid ${isMandatoryThinking ? 'grid-cols-2' : 'grid-cols-3'} gap-1 bg-[var(--theme-bg-tertiary)] p-1 rounded-lg mt-3 select-none`}>
            <button
                onClick={() => onModeChange('auto')}
                className={`flex items-center justify-center gap-2 py-2 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 focus:outline-none ${
                    mode === 'auto'
                    ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-sm ring-1 ring-[var(--theme-border-secondary)]'
                    : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-primary)]/50'
                }`}
            >
                <SparklesIcon active={mode === 'auto'} />
                {isGemini3 ? t('settingsThinkingMode_preset') : t('settingsThinkingMode_auto')}
            </button>

            <button
                onClick={() => onModeChange('custom')}
                className={`flex items-center justify-center gap-2 py-2 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 focus:outline-none ${
                    mode === 'custom'
                    ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-sm ring-1 ring-[var(--theme-border-secondary)]'
                    : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-primary)]/50'
                }`}
            >
                <Settings2 size={14} strokeWidth={2} className={mode === 'custom' ? 'text-amber-500' : 'opacity-70'} />
                {t('settingsThinkingMode_custom')}
            </button>

            {!isMandatoryThinking && (
                <button
                    onClick={() => onModeChange('off')}
                    className={`flex items-center justify-center gap-2 py-2 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 focus:outline-none ${
                        mode === 'off'
                        ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-sm ring-1 ring-[var(--theme-border-secondary)]'
                        : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-primary)]/50'
                    }`}
                >
                    <Ban size={14} strokeWidth={2} className={mode === 'off' ? 'text-red-500' : 'opacity-70'} />
                    {t('settingsThinkingMode_off')}
                </button>
            )}
        </div>
    );
};
