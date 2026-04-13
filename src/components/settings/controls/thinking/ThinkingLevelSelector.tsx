
import React from 'react';
import { Gauge, Feather, Zap, Sparkles, Cpu } from 'lucide-react';
import { LevelButton } from './LevelButton';

type ThinkingLevelOption = 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH';

interface ThinkingLevelSelectorProps {
    thinkingLevel: ThinkingLevelOption | undefined;
    setThinkingLevel: (level: ThinkingLevelOption) => void;
    supportedLevels: ThinkingLevelOption[];
}

export const ThinkingLevelSelector: React.FC<ThinkingLevelSelectorProps> = ({
    thinkingLevel,
    setThinkingLevel,
    supportedLevels,
}) => {
    const levelButtons = [
        {
            level: 'MINIMAL' as const,
            label: 'Minimal',
            icon: <Feather size={14} />,
        },
        {
            level: 'LOW' as const,
            label: 'Low',
            icon: <Zap size={14} />,
        },
        {
            level: 'MEDIUM' as const,
            label: 'Medium',
            icon: <Sparkles size={14} />,
        },
        {
            level: 'HIGH' as const,
            label: 'High',
            icon: <Cpu size={14} />,
        },
    ].filter(({ level }) => supportedLevels.includes(level));

    const gridClass = levelButtons.length === 4
        ? 'grid-cols-2 sm:grid-cols-4'
        : (levelButtons.length === 3 ? 'grid-cols-3' : 'grid-cols-2');

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)] flex items-center gap-1.5">
                    <Gauge size={12} /> Intensity Level
                </span>
            </div>
            <div className={`grid ${gridClass} gap-2`}>
                {levelButtons.map(({ level, label, icon }) => (
                    <LevelButton 
                        key={level}
                        active={thinkingLevel === level}
                        onClick={() => setThinkingLevel(level)}
                        label={label}
                        icon={icon}
                    />
                ))}
            </div>
        </div>
    );
};
