import React from 'react';
import { Modal } from '../../shared/Modal';
import { X, HelpCircle } from 'lucide-react';

interface CommandInfo {
    name: string;
    description: string;
}

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
    commands: CommandInfo[];
    t: (key: string) => string;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, commands }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div
                className="bg-[var(--theme-bg-primary)] rounded-xl shadow-premium w-full max-w-md sm:max-w-xl flex flex-col max-h-[90vh] sm:max-h-[600px]"
                role="document"
            >
                {/* Header */}
                <div className="flex-shrink-0 flex justify-between items-center p-3 sm:p-4 border-b border-[var(--theme-border-primary)]">
                    <h2 id="help-modal-title" className="text-lg sm:text-xl font-semibold text-[var(--theme-text-link)] flex items-center">
                        <HelpCircle size={22} className="mr-2.5 opacity-80" /> Command Help
                    </h2>
                    <button onClick={onClose} className="text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-secondary)] transition-colors p-1 rounded-full" aria-label="Close help modal">
                        <X size={22} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-grow min-h-0 overflow-y-auto custom-scrollbar p-4 sm:p-6">
                    <div className="space-y-4">
                        {commands.map((command) => (
                            <div key={command.name} className="flex items-start">
                                <code className="font-mono text-sm text-[var(--theme-text-link)] bg-[var(--theme-bg-input)] px-2 py-1 rounded-md border border-[var(--theme-border-secondary)] w-48 text-left flex-shrink-0">
                                    {command.name}
                                </code>
                                <p className="ml-4 text-sm text-[var(--theme-text-secondary)] flex-1 pt-1">
                                    {command.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Modal>
    );
};
