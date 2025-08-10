import React from 'react';
import { Plus, XCircle } from 'lucide-react';

interface AddUrlInputProps {
    urlInput: string;
    setUrlInput: (value: string) => void;
    onAddUrlSubmit: () => void;
    onCancel: () => void;
    isAddingByUrl: boolean;
    isLoading: boolean;
    t: (key: string) => string;
}

export const AddUrlInput: React.FC<AddUrlInputProps> = ({
    urlInput,
    setUrlInput,
    onAddUrlSubmit,
    onCancel,
    isAddingByUrl,
    isLoading,
    t,
}) => {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAddUrlSubmit();
    };

    return (
        <form onSubmit={handleSubmit} className="mb-2 flex items-center gap-2 p-2 bg-[var(--theme-bg-secondary)] rounded-lg border border-[var(--theme-border-secondary)]">
            <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder={t('addByUrl_placeholder')}
                className="flex-grow p-2 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-md focus:ring-1 focus:ring-[var(--theme-border-focus)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] text-sm"
                aria-label={t('addByUrl_aria')}
                disabled={isAddingByUrl}
                autoFocus
            />
            <button
                type="submit"
                disabled={!urlInput.trim() || isAddingByUrl || isLoading}
                className="p-2 bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-icon-send)] rounded-md disabled:bg-[var(--theme-bg-tertiary)] disabled:text-[var(--theme-text-tertiary)] flex items-center gap-1.5 text-sm"
                aria-label={t('addByUrl_button_aria')}
            >
                <Plus size={16} /> {t('add')}
            </button>
            <button
                type="button"
                onClick={onCancel}
                disabled={isAddingByUrl}
                className="p-2 bg-[var(--theme-bg-input)] hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-tertiary)] rounded-md flex items-center gap-1.5 text-sm"
                aria-label={t('cancelAddByUrl_button_aria')}
            >
                <XCircle size={16} /> {t('cancel')}
            </button>
        </form>
    );
};