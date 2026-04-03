
import React from 'react';
import { Settings2, Scissors, X } from 'lucide-react';

interface FileConfigHeaderProps {
    onClose: () => void;
    t: (key: string) => string;
    showResolutionSettings: boolean;
    isVideo: boolean;
}

export const FileConfigHeader: React.FC<FileConfigHeaderProps> = ({ onClose, t, showResolutionSettings, isVideo }) => (
    <div className="p-4 border-b border-[var(--theme-border-secondary)] bg-[var(--theme-bg-secondary)] flex justify-between items-center rounded-t-xl">
        <h3 className="font-semibold text-[var(--theme-text-primary)] flex items-center gap-2">
            {showResolutionSettings ? <Settings2 size={18} /> : (isVideo ? <Scissors size={18} /> : <Settings2 size={18} />)}
            {t('fileSettings_title') || 'File Configuration'}
        </h3>
        <button onClick={onClose} className="text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)]">
            <X size={20} />
        </button>
    </div>
);
