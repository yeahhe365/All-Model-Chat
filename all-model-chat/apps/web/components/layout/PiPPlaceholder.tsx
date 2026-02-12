
import React from 'react';
import { PictureInPicture2 } from 'lucide-react';

interface PiPPlaceholderProps {
    onClosePip: () => void;
}

export const PiPPlaceholder: React.FC<PiPPlaceholderProps> = ({ onClosePip }) => {
    return (
        <div className="flex-grow flex flex-col items-center justify-center text-center p-4 bg-[var(--theme-bg-secondary)]">
            <PictureInPicture2 size={48} className="text-[var(--theme-text-link)] mb-4" />
            <h2 className="text-xl font-semibold text-[var(--theme-text-primary)]">Chat in Picture-in-Picture</h2>
            <p className="text-sm text-[var(--theme-text-secondary)] mt-2 max-w-xs">The chat is running in a separate window. Close it to bring the conversation back here.</p>
            <button 
                onClick={onClosePip} 
                className="mt-6 px-4 py-2 bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)] rounded-lg font-medium hover:bg-[var(--theme-bg-accent-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-secondary)] focus:ring-[var(--theme-border-focus)]"
            >
                Close PiP Window
            </button>
        </div>
    );
};
