
import React from 'react';
import { Link, Loader2, Plus, X } from 'lucide-react';

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
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isLoading && fileIdInput.trim()) {
            e.preventDefault();
            onAddFileByIdSubmit();
        } else if (e.key === 'Escape') {
            onCancel();
        }
    };

    return (
        <div className="mb-3 animate-in fade-in slide-in-from-bottom-1 duration-200">
            <div className="flex items-center gap-2 p-1.5 bg-[var(--theme-bg-secondary)] rounded-xl border border-[var(--theme-border-secondary)] shadow-sm ring-1 ring-black/5 dark:ring-white/5">
                <div className="relative flex-grow flex items-center group">
                    <div className="absolute left-3 text-[var(--theme-text-tertiary)] group-focus-within:text-[var(--theme-text-primary)] transition-colors pointer-events-none">
                        <Link size={16} strokeWidth={2} />
                    </div>
                    <input
                        type="text"
                        value={fileIdInput}
                        onChange={(e) => setFileIdInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={t('addById_placeholder')}
                        className="w-full py-2 pl-9 pr-3 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-lg text-sm text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:border-transparent transition-all font-mono shadow-inner"
                        aria-label={t('addById_aria')}
                        disabled={isAddingById}
                        autoFocus
                        spellCheck={false}
                    />
                </div>
                
                <button
                    type="button"
                    onClick={onAddFileByIdSubmit}
                    disabled={!fileIdInput.trim() || isAddingById || isLoading}
                    className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-text-accent)] rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95 whitespace-nowrap"
                    aria-label={t('addById_button_aria')}
                >
                    {isLoading || isAddingById ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} strokeWidth={2.5} />}
                    <span className="hidden sm:inline">{t('add')}</span>
                </button>
                
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isAddingById}
                    className="p-2 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors focus:outline-none"
                    aria-label={t('cancelAddById_button_aria')}
                >
                    <X size={18} strokeWidth={2} />
                </button>
            </div>
            <div className="px-2 mt-1.5">
                <p className="text-[10px] text-[var(--theme-text-tertiary)] flex items-center gap-1.5 ml-1">
                    <span className="inline-block w-1 h-1 rounded-full bg-[var(--theme-text-tertiary)]" />
                    Enter a valid Gemini API File URI (e.g., <code className="bg-[var(--theme-bg-tertiary)] px-1 rounded text-[var(--theme-text-secondary)]">files/888...</code>)
                </p>
            </div>
        </div>
    );
};
