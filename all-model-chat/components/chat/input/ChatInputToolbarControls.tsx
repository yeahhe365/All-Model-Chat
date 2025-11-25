
import React from 'react';
import { Plus, XCircle, LayoutGrid } from 'lucide-react';

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
