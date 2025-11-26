
import React from 'react';
import { Plus, X, Link, Youtube, Loader2, LayoutGrid } from 'lucide-react';

// --- AddFileByIdInput Component ---

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

// --- AddUrlInput Component ---

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

// --- ImagenAspectRatioSelector Component ---

const AspectRatioIcon = ({ ratio }: { ratio: string }) => {
    let styles: React.CSSProperties = {};
    switch (ratio) {
        case '1:1': styles = { width: '20px', height: '20px' }; break;
        case '9:16': styles = { width: '12px', height: '21px' }; break;
        case '16:9': styles = { width: '24px', height: '13.5px' }; break;
        case '4:3': styles = { width: '20px', height: '15px' }; break;
        case '3:4': styles = { width: '15px', height: '20px' }; break;
    }
    return <div style={styles} className="border-2 border-current rounded-sm mb-1"></div>;
};

const aspectRatios = ['1:1', '9:16', '16:9', '4:3', '3:4'];

interface ImagenAspectRatioSelectorProps {
    aspectRatio: string;
    setAspectRatio: (ratio: string) => void;
    t: (key: string) => string;
}

export const ImagenAspectRatioSelector: React.FC<ImagenAspectRatioSelectorProps> = ({ aspectRatio, setAspectRatio, t }) => {
    return (
        <div className="mb-2">
            <div className="flex items-center gap-x-2 sm:gap-x-3 gap-y-2 flex-wrap">
                {aspectRatios.map(ratioValue => {
                    const isSelected = aspectRatio === ratioValue;
                    return (
                        <button
                            key={ratioValue}
                            onClick={() => setAspectRatio(ratioValue)}
                            className={`p-2 rounded-lg flex flex-col items-center justify-center min-w-[50px] text-xs font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme-bg-primary)] focus-visible:ring-[var(--theme-border-focus)] ${isSelected ? 'bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)]' : 'text-[var(--theme-text-tertiary)] hover:bg-[var(--theme-bg-secondary)]/50'}`}
                            title={`${t('aspectRatio_title')} ${ratioValue}`}
                        >
                            <AspectRatioIcon ratio={ratioValue} />
                            <span>{ratioValue}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

// --- ImageSizeSelector Component ---

const sizes = ['1K', '2K', '4K'];

interface ImageSizeSelectorProps {
    imageSize: string;
    setImageSize: (size: string) => void;
    t: (key: string) => string;
}

export const ImageSizeSelector: React.FC<ImageSizeSelectorProps> = ({ imageSize, setImageSize, t }) => {
    return (
        <div className="mb-2">
            <label className="block text-xs font-semibold uppercase text-[var(--theme-text-tertiary)] mb-1">
                Resolution
            </label>
            <div className="flex items-center gap-x-2">
                {sizes.map(sizeValue => {
                    const isSelected = imageSize === sizeValue;
                    return (
                        <button
                            key={sizeValue}
                            onClick={() => setImageSize(sizeValue)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme-bg-primary)] focus-visible:ring-[var(--theme-border-focus)] ${isSelected ? 'bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)] border border-[var(--theme-border-secondary)]' : 'text-[var(--theme-text-tertiary)] hover:bg-[var(--theme-bg-secondary)]/50'}`}
                            title={`Set resolution to ${sizeValue}`}
                        >
                            {sizeValue}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

// --- QuadImageToggle Component ---

interface QuadImageToggleProps {
    enabled: boolean;
    onToggle: () => void;
    t: (key: string) => string;
}

export const QuadImageToggle: React.FC<QuadImageToggleProps> = ({ enabled, onToggle, t }) => {
    return (
        <button
            onClick={onToggle}
            className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200 mb-2
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-primary)] focus:ring-[var(--theme-border-focus)]
                ${enabled 
                    ? 'bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)] border border-[var(--theme-border-secondary)]' 
                    : 'text-[var(--theme-text-tertiary)] hover:bg-[var(--theme-bg-secondary)]/50'
                }
            `}
            title={t('settings_generateQuadImages_tooltip')}
        >
            <LayoutGrid size={14} strokeWidth={2} />
            <span>4 Images</span>
        </button>
    );
};
