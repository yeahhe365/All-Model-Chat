
import React from 'react';
import { LayoutGrid } from 'lucide-react';

interface QuadImageToggleProps {
    enabled: boolean;
    onToggle: () => void;
    t: (key: string) => string;
}

export const QuadImageToggle: React.FC<QuadImageToggleProps> = ({ enabled, onToggle, t }) => {
    return (
        <button
            onClick={onToggle}
            className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200 mb-2
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-primary)] focus:ring-[var(--theme-border-focus)]
                ${enabled 
                    ? 'bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)] border border-[var(--theme-border-secondary)]' 
                    : 'text-[var(--theme-text-tertiary)] hover:bg-[var(--theme-bg-secondary)]/50'
                }
            `}
            title={t('settings_generateQuadImages_tooltip')}
        >
            <LayoutGrid size={14} strokeWidth={2} />
            <span>4 Images</span>
        </button>
    );
};
