
import React from 'react';
import { Youtube, Loader2, Plus, X } from 'lucide-react';

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
    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        onAddUrlSubmit();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onCancel();
        }
    };

    return (
        <div className="mb-3 animate-in fade-in slide-in-from-bottom-1 duration-200">
            <form onSubmit={handleSubmit} className="flex items-center gap-2 p-1.5 bg-[var(--theme-bg-secondary)] rounded-xl border border-[var(--theme-border-secondary)] shadow-sm ring-1 ring-black/5 dark:ring-white/5">
                <div className="relative flex-grow flex items-center group">
                    <div className="absolute left-3 text-[var(--theme-text-tertiary)] group-focus-within:text-red-500 transition-colors pointer-events-none">
                        <Youtube size={18} strokeWidth={2} />
                    </div>
                    <input
                        type="url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={t('addByUrl_placeholder')}
                        className="w-full py-2 pl-9 pr-3 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-lg text-sm text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:border-transparent transition-all shadow-inner"
                        aria-label={t('addByUrl_aria')}
                        disabled={isAddingByUrl}
                        autoFocus
                    />
                </div>
                <button
                    type="submit"
                    disabled={!urlInput.trim() || isAddingByUrl || isLoading}
                    className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-text-accent)] rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95 whitespace-nowrap"
                    aria-label={t('addByUrl_button_aria')}
                >
                    {isLoading || isAddingByUrl ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} strokeWidth={2.5} />}
                    <span className="hidden sm:inline">{t('add')}</span>
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isAddingByUrl}
                    className="p-2 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors focus:outline-none"
                    aria-label={t('cancelAddByUrl_button_aria')}
                >
                    <X size={18} strokeWidth={2} />
                </button>
            </form>
        </div>
    );
};
