
import React, { useRef, useEffect } from 'react';
import { CornerDownLeft } from 'lucide-react';
import { CommandIcon } from '../../icons/CommandIcon';

export interface Command {
    name: string;
    description: string;
    icon: string;
    action: () => void;
}

interface SlashCommandMenuProps {
    isOpen: boolean;
    commands: Command[];
    onSelect: (command: Command) => void;
    selectedIndex: number;
    className?: string;
}

export const SlashCommandMenu: React.FC<SlashCommandMenuProps> = ({ isOpen, commands, onSelect, selectedIndex, className }) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const selectedItemRef = useRef<HTMLLIElement>(null);

    useEffect(() => {
        if (isOpen && selectedItemRef.current && scrollContainerRef.current) {
            selectedItemRef.current.scrollIntoView({
                block: 'nearest',
                inline: 'start'
            });
        }
    }, [selectedIndex, isOpen]);

    if (!isOpen || commands.length === 0) {
        return null;
    }

    const defaultClasses = "absolute bottom-full left-0 right-0 mb-2 w-full max-w-3xl mx-auto px-2 sm:px-4 z-30";
    const finalClassName = className || defaultClasses;

    return (
        <div 
          className={finalClassName}
          style={{ animation: 'fadeInUp 0.15s cubic-bezier(0.16, 1, 0.3, 1) both' }}
        >
            <div 
                ref={scrollContainerRef} 
                className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-secondary)] rounded-xl shadow-2xl max-h-80 overflow-y-auto custom-scrollbar flex flex-col overflow-hidden scroll-pt-10"
            >
                {/* Header Strip */}
                <div className="sticky top-0 z-10 bg-[var(--theme-bg-secondary)] border-b border-[var(--theme-border-secondary)] px-3 py-2 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-[var(--theme-text-tertiary)] uppercase tracking-widest">
                        Commands
                    </span>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[var(--theme-text-tertiary)] bg-[var(--theme-bg-primary)] px-1.5 py-0.5 rounded border border-[var(--theme-border-secondary)]">
                            ↑↓ to navigate
                        </span>
                        <span className="text-[10px] text-[var(--theme-text-tertiary)] bg-[var(--theme-bg-primary)] px-1.5 py-0.5 rounded border border-[var(--theme-border-secondary)]">
                            Tab to select
                        </span>
                    </div>
                </div>
                
                {/* Command List */}
                <ul className="p-1.5 space-y-0.5">
                    {commands.map((command, index) => {
                        const isSelected = selectedIndex === index;
                        return (
                            <li 
                                key={command.name} 
                                ref={isSelected ? selectedItemRef : null}
                                className="relative"
                            >
                                <button
                                    type="button"
                                    onClick={() => onSelect(command)}
                                    className={`
                                        group relative w-full text-left px-3 py-2.5 flex items-center gap-3 rounded-lg transition-all duration-150
                                        ${isSelected 
                                            ? 'bg-[var(--theme-bg-tertiary)]' 
                                            : 'hover:bg-[var(--theme-bg-tertiary)]/50'
                                        }
                                    `}
                                    aria-selected={isSelected}
                                    role="option"
                                >
                                    {/* Selection Indicator Bar (Left) */}
                                    {isSelected && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[var(--theme-bg-accent)] rounded-r-full" />
                                    )}

                                    {/* Icon Container */}
                                    <div className={`
                                        flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-md transition-colors duration-200
                                        ${isSelected 
                                            ? 'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] shadow-sm ring-1 ring-[var(--theme-border-secondary)]' 
                                            : 'bg-[var(--theme-bg-input)] text-[var(--theme-text-secondary)] border border-[var(--theme-border-secondary)]'
                                        }
                                    `}>
                                        <CommandIcon icon={command.icon} />
                                    </div>

                                    {/* Text Content */}
                                    <div className="flex-grow min-w-0 flex flex-col justify-center gap-0.5">
                                        <div className="flex items-center gap-2">
                                            <span className={`font-mono text-sm font-bold tracking-tight ${isSelected ? 'text-[var(--theme-text-primary)]' : 'text-[var(--theme-text-primary)]'}`}>
                                                /{command.name}
                                            </span>
                                        </div>
                                        <p className={`text-xs truncate ${isSelected ? 'text-[var(--theme-text-secondary)]' : 'text-[var(--theme-text-tertiary)]'}`}>
                                            {command.description}
                                        </p>
                                    </div>

                                    {/* Enter Key Hint */}
                                    {isSelected && (
                                        <div className="flex-shrink-0 hidden sm:flex items-center gap-1 text-[10px] font-medium text-[var(--theme-text-secondary)] animate-in fade-in slide-in-from-left-1 duration-200">
                                            <CornerDownLeft size={12} />
                                        </div>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
};
