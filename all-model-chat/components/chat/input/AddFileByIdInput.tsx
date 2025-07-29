import React from 'react';
import { Plus, XCircle } from 'lucide-react';

interface AddFileByIdInputProps {
    fileIdInput: string;
    setFileIdInput: (value: string) => void;
    onAddFileByIdSubmit: () => void;
    onCancel: () => void;
    isAddingById: boolean;
    isLoading: boolean;
    t: (key: string) => string;
}

export const AddFileByIdInput: React.FC<AddFileByIdInputProps> = ({
    fileIdInput,
    setFileIdInput,
    onAddFileByIdSubmit,
    onCancel,
    isAddingById,
    isLoading,
    t,
}) => {
    return (
        <div className="mb-2 flex items-center gap-2 p-2 bg-[var(--theme-bg-secondary)] rounded-lg border border-[var(--theme-border-secondary)]">
            <input
                type="text"
                value={fileIdInput}
                onChange={(e) => setFileIdInput(e.target.value)}
                placeholder={t('addById_placeholder')}
                className="flex-grow p-2 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-md focus:ring-1 focus:ring-[var(--theme-border-focus)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] text-sm"
                aria-label={t('addById_aria')}
                disabled={isAddingById}
            />
            <button
                type="button"
                onClick={onAddFileByIdSubmit}
                disabled={!fileIdInput.trim() || isAddingById || isLoading}
                className="p-2 bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-icon-send)] rounded-md disabled:bg-[var(--theme-bg-tertiary)] disabled:text-[var(--theme-text-tertiary)] flex items-center gap-1.5 text-sm"
                aria-label={t('addById_button_aria')}
            >
                <Plus size={16} /> {t('add')}
            </button>
            <button
                type="button"
                onClick={onCancel}
                disabled={isAddingById}
                className="p-2 bg-[var(--theme-bg-input)] hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-tertiary)] rounded-md flex items-center gap-1.5 text-sm"
                aria-label={t('cancelAddById_button_aria')}
            >
                <XCircle size={16} /> {t('cancel')}
            </button>
        </div>
    );
};