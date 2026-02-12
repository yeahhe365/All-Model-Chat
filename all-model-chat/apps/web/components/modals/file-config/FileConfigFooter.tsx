
import React from 'react';
import { Save } from 'lucide-react';

interface FileConfigFooterProps {
    onClose: () => void;
    onSave: () => void;
    t: (key: string) => string;
}

export const FileConfigFooter: React.FC<FileConfigFooterProps> = ({ onClose, onSave, t }) => (
    <div className="flex justify-end gap-3 pt-2">
        <button onClick={onClose} className="px-4 py-2 text-sm text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors">
            {t('cancel')}
        </button>
        <button onClick={onSave} className="px-4 py-2 text-sm bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)] hover:bg-[var(--theme-bg-accent-hover)] rounded-lg transition-colors flex items-center gap-2 shadow-sm">
            <Save size={16} />
            {t('videoSettings_save')}
        </button>
    </div>
);
