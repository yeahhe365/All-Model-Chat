import React, { useRef, useEffect } from 'react';
import { HelpCircle, UploadCloud, Trash2, FilePlus2, Settings, Wand2, Globe, Terminal, Link, Pin, RotateCw, Bot, ImageIcon, Ban } from 'lucide-react';

const CommandIcon: React.FC<{ icon: string }> = ({ icon }) => {
    const iconProps = { size: 16 };
    switch (icon) {
        case 'bot': return <Bot {...iconProps} />;
        case 'help': return <HelpCircle {...iconProps} />;
        case 'pin': return <Pin {...iconProps} />;
        case 'retry': return <RotateCw {...iconProps} />;
        case 'stop': return <Ban {...iconProps} />;
        case 'search': return <Globe {...iconProps} />;
        case 'code': return <Terminal {...iconProps} />;
        case 'url': return <Link {...iconProps} />;
        case 'file': return <UploadCloud {...iconProps} />;
        case 'clear': return <Trash2 {...iconProps} />;
        case 'new': return <FilePlus2 {...iconProps} />;
        case 'settings': return <Settings {...iconProps} />;
        case 'canvas': return <Wand2 {...iconProps} />;
        case 'image': return <ImageIcon {...iconProps} />;
        default: return <Bot {...iconProps} />;
    }
};

export interface Command {
    name: string;
    description: string;
    icon: string;
    action: (...args: any[]) => void;
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
                                    <CommandIcon icon={command.icon} />
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