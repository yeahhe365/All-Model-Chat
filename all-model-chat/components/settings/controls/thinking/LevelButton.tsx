
import React from 'react';

interface LevelButtonProps {
    active: boolean;
    onClick: () => void;
    label: string;
    icon: React.ReactNode;
}

export const LevelButton: React.FC<LevelButtonProps> = ({ active, onClick, label, icon }) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all duration-200 text-center gap-1 ${
            active
            ? 'bg-[var(--theme-bg-accent)]/5 border-[var(--theme-border-focus)] ring-1 ring-[var(--theme-border-focus)]'
            : 'bg-[var(--theme-bg-tertiary)]/30 border-transparent hover:bg-[var(--theme-bg-tertiary)]/60'
        }`}
    >
        <div className={active ? 'text-[var(--theme-text-link)]' : 'text-[var(--theme-text-secondary)]'}>
            {React.cloneElement(icon as React.ReactElement, { size: 14, strokeWidth: 2 } as any)}
        </div>
        <span className={`text-[10px] font-bold ${active ? 'text-[var(--theme-text-primary)]' : 'text-[var(--theme-text-secondary)]'}`}>{label}</span>
    </button>
);
