
import React, { useState, useMemo } from 'react';
import { Modal } from '../../shared/Modal';
import { X, HelpCircle, Search, Check, Copy } from 'lucide-react';
import { translations } from '../../../utils/appUtils';
import { CommandIcon } from './SlashCommandMenu';
import { CommandInfo } from '../../../types';
import { useCopyToClipboard } from '../../../hooks/useCopyToClipboard';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
    commands: CommandInfo[];
    t: (key: keyof typeof translations) => string;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, commands, t }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
    const { copyToClipboard } = useCopyToClipboard();

    const filteredCommands = useMemo(() => {
        if (!searchQuery.trim()) return commands;
        const lowerQuery = searchQuery.toLowerCase();
        return commands.filter(cmd => 
            cmd.name.toLowerCase().includes(lowerQuery) || 
            cmd.description.toLowerCase().includes(lowerQuery)
        );
    }, [commands, searchQuery]);

    const handleCopy = (text: string) => {
        copyToClipboard(text);
        setCopiedCommand(text);
        setTimeout(() => setCopiedCommand(null), 1500);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div
                className="bg-[var(--theme-bg-primary)] rounded-xl shadow-premium w-full max-w-md sm:max-w-2xl flex flex-col max-h-[85vh] sm:max-h-[650px] overflow-hidden border border-[var(--theme-border-primary)]"
                role="document"
            >
                {/* Header */}
                <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-[var(--theme-border-primary)] bg-[var(--theme-bg-secondary)]/50 backdrop-blur-md">
                    <h2 id="help-modal-title" className="text-lg font-semibold text-[var(--theme-text-primary)] flex items-center gap-2">
                        <HelpCircle size={20} className="text-[var(--theme-text-link)]" />
                        {t('helpModal_title')}
                    </h2>
                    <button 
                        onClick={onClose} 
                        className="text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors p-1.5 rounded-full" 
                        aria-label={t('helpModal_close_aria')}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-4 pb-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-text-tertiary)] pointer-events-none" size={16} />
                        <input
                            type="text"
                            placeholder="Search commands..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-xl text-sm text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:border-transparent transition-all"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-grow min-h-0 overflow-y-auto custom-scrollbar p-4">
                    <div className="grid grid-cols-1 gap-2">
                        {filteredCommands.length > 0 ? (
                            filteredCommands.map((command) => (
                                <div 
                                    key={command.name} 
                                    className="group flex items-center gap-4 p-3 rounded-xl hover:bg-[var(--theme-bg-tertiary)]/50 border border-transparent hover:border-[var(--theme-border-secondary)] transition-all duration-200"
                                >
                                    {/* Icon */}
                                    <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-[var(--theme-bg-input)] text-[var(--theme-text-secondary)] border border-[var(--theme-border-secondary)] group-hover:border-[var(--theme-border-focus)] group-hover:text-[var(--theme-text-primary)] transition-colors shadow-sm">
                                        <CommandIcon icon={command.icon || 'bot'} />
                                    </div>

                                    {/* Text Info */}
                                    <div className="flex-grow min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                                        <button
                                            onClick={() => handleCopy(command.name)}
                                            className="flex items-center gap-2 text-left sm:w-40 flex-shrink-0 group/btn"
                                            title="Click to copy"
                                        >
                                            <code className="font-mono text-sm font-semibold text-[var(--theme-text-link)] bg-[var(--theme-bg-input)] px-2 py-1 rounded-md border border-[var(--theme-border-secondary)] group-hover/btn:border-[var(--theme-text-link)] transition-colors truncate w-full">
                                                {command.name}
                                            </code>
                                            {copiedCommand === command.name ? (
                                                <Check size={14} className="text-[var(--theme-text-success)] animate-in fade-in zoom-in duration-200" />
                                            ) : (
                                                <Copy size={14} className="text-[var(--theme-text-tertiary)] opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                                            )}
                                        </button>
                                        <p className="text-sm text-[var(--theme-text-secondary)] leading-relaxed truncate sm:whitespace-normal">
                                            {command.description}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center h-40 text-[var(--theme-text-tertiary)]">
                                <p className="text-sm">No commands found matching "{searchQuery}"</p>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="p-3 border-t border-[var(--theme-border-secondary)] bg-[var(--theme-bg-secondary)]/30 text-center">
                    <p className="text-xs text-[var(--theme-text-tertiary)]">
                        Tip: Type <code className="font-mono font-bold">/</code> in the chat input to open the command menu instantly.
                    </p>
                </div>
            </div>
        </Modal>
    );
};
