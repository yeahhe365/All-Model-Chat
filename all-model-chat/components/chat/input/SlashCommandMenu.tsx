import React, { useRef, useEffect } from 'react';

export interface Command {
    name: string;
    description: string;
    icon: React.ReactNode;
    action: () => void;
}

interface SlashCommandMenuProps {
    isOpen: boolean;
    commands: Command[];
    onSelect: (command: Command) => void;
    selectedIndex: number;
}

export const SlashCommandMenu: React.FC<SlashCommandMenuProps> = ({ isOpen, commands, onSelect, selectedIndex }) => {
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

    return (
        <div 
          className="absolute bottom-full left-0 right-0 mb-2 w-full max-w-7xl mx-auto px-2 sm:px-3"
          style={{ animation: 'fadeInUp 0.2s ease-out both' }}
        >
            <div ref={scrollContainerRef} className="bg-[var(--theme-bg-primary)] border border-[var(--theme-border-secondary)] rounded-lg shadow-premium max-h-60 overflow-y-auto custom-scrollbar p-2">
                <p className="text-xs text-[var(--theme-text-tertiary)] px-2 pb-1 font-semibold tracking-wider">COMMANDS</p>
                <ul>
                    {commands.map((command, index) => (
                        <li key={command.name} ref={selectedIndex === index ? selectedItemRef : null}>
                            <button
                                onClick={() => onSelect(command)}
                                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-3 rounded-md transition-colors ${selectedIndex === index ? 'bg-[var(--theme-bg-tertiary)]' : 'hover:bg-[var(--theme-bg-tertiary)]'}`}
                                aria-selected={selectedIndex === index}
                                role="option"
                            >
                                <div className="p-1.5 bg-[var(--theme-bg-input)] text-[var(--theme-text-secondary)] rounded-md">
                                    {command.icon}
                                </div>
                                <div>
                                    <p className="font-medium text-[var(--theme-text-primary)]">{command.name}</p>
                                    <p className="text-xs text-[var(--theme-text-tertiary)]">{command.description}</p>
                                </div>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};
