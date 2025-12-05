
import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Link, Youtube, Loader2, LayoutGrid, ChevronDown, Check, Sparkles } from 'lucide-react';
import { useClickOutside } from '../../../hooks/useClickOutside';
import { useWindowContext } from '../../../contexts/WindowContext';

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

const AspectRatioIcon = ({ ratio, className }: { ratio: string; className?: string }) => {
    if (ratio === 'Auto') {
        return <Sparkles size={16} className={className} strokeWidth={2} />;
    }
    let styles: React.CSSProperties = {};
    switch (ratio) {
        case '1:1': styles = { width: '20px', height: '20px' }; break;
        case '9:16': styles = { width: '12px', height: '21px' }; break;
        case '16:9': styles = { width: '24px', height: '13.5px' }; break;
        case '4:3': styles = { width: '20px', height: '15px' }; break;
        case '3:4': styles = { width: '15px', height: '20px' }; break;
        case '2:3': styles = { width: '14px', height: '21px' }; break;
        case '3:2': styles = { width: '21px', height: '14px' }; break;
        case '4:5': styles = { width: '16px', height: '20px' }; break;
        case '5:4': styles = { width: '20px', height: '16px' }; break;
        case '21:9': styles = { width: '24px', height: '10px' }; break;
        default: styles = { width: '20px', height: '20px' }; break;
    }
    return <div style={styles} className={`border-2 border-current rounded-sm ${className || ''}`}></div>;
};

const defaultAspectRatios = ['1:1', '16:9', '9:16', '4:3', '3:4', '2:3', '3:2', '4:5', '5:4', '21:9'];

interface ImagenAspectRatioSelectorProps {
    aspectRatio: string;
    setAspectRatio: (ratio: string) => void;
    t: (key: string) => string;
    supportedRatios?: string[];
}

export const ImagenAspectRatioSelector: React.FC<ImagenAspectRatioSelectorProps> = ({ aspectRatio, setAspectRatio, t, supportedRatios }) => {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { document: targetDocument, window: targetWindow } = useWindowContext();

    useClickOutside(dropdownRef, (e) => {
        if (buttonRef.current && buttonRef.current.contains(e.target as Node)) return;
        setIsOpen(false);
    }, isOpen);

    const toggleOpen = () => setIsOpen(!isOpen);

    const ratios = supportedRatios || defaultAspectRatios;

    return (
        <div className="mb-2 relative">
            <button
                ref={buttonRef}
                onClick={toggleOpen}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-secondary)] text-xs font-medium text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)]"
                title={t('aspectRatio_title')}
            >
                <AspectRatioIcon ratio={aspectRatio} />
                <span>{aspectRatio}</span>
                <ChevronDown size={14} className={`text-[var(--theme-text-tertiary)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && createPortal(
                <div
                    ref={dropdownRef}
                    className="fixed z-[2200] bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] rounded-xl shadow-premium overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col w-40"
                    style={{
                        ...(buttonRef.current ? (() => {
                            const rect = buttonRef.current.getBoundingClientRect();
                            // Default to dropup since toolbar is at bottom
                            const spaceAbove = rect.top;
                            const dropdownHeight = 320; // Approx max height
                            
                            if (spaceAbove > dropdownHeight) {
                                return {
                                    left: rect.left,
                                    bottom: targetWindow.innerHeight - rect.top + 8,
                                    maxHeight: '300px'
                                };
                            }
                            return {
                                left: rect.left,
                                top: rect.bottom + 8,
                                maxHeight: '300px'
                            };
                        })() : {})
                    }}
                >
                    <div className="overflow-y-auto custom-scrollbar p-1">
                        {ratios.map(r => (
                            <button
                                key={r}
                                onClick={() => { setAspectRatio(r); setIsOpen(false); }}
                                className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center justify-between transition-colors ${
                                    aspectRatio === r
                                    ? 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)] font-medium'
                                    : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)]/50 hover:text-[var(--theme-text-primary)]'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <AspectRatioIcon ratio={r} />
                                    <span>{r}</span>
                                </div>
                                {aspectRatio === r && <Check size={14} className="text-[var(--theme-text-link)]" />}
                            </button>
                        ))}
                    </div>
                </div>,
                targetDocument.body
            )}
        </div>
    );
};

// --- ImageSizeSelector Component ---

const defaultSizes = ['1K', '2K', '4K'];

interface ImageSizeSelectorProps {
    imageSize: string;
    setImageSize: (size: string) => void;
    t: (key: string) => string;
    supportedSizes?: string[];
}

export const ImageSizeSelector: React.FC<ImageSizeSelectorProps> = ({ imageSize, setImageSize, t, supportedSizes }) => {
    const sizes = supportedSizes || defaultSizes;
    return (
        <div className="mb-2">
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

export const ChatInputToolbar: React.FC<import('../../../types').ChatInputToolbarProps> = ({
  isImagenModel,
  isGemini3ImageModel,
  aspectRatio,
  setAspectRatio,
  imageSize,
  setImageSize,
  fileError,
  showAddByIdInput,
  fileIdInput,
  setFileIdInput,
  onAddFileByIdSubmit,
  onCancelAddById,
  isAddingById,
  showAddByUrlInput,
  urlInput,
  setUrlInput,
  onAddUrlSubmit,
  onCancelAddUrl,
  isAddingByUrl,
  isLoading,
  t,
  generateQuadImages,
  onToggleQuadImages,
  supportedAspectRatios,
  supportedImageSizes,
}) => {
  const showAspectRatio = (isImagenModel || isGemini3ImageModel) && setAspectRatio && aspectRatio;
  const showImageSize = supportedImageSizes && supportedImageSizes.length > 0 && setImageSize && imageSize;
  const showQuadToggle = (isImagenModel || isGemini3ImageModel) && onToggleQuadImages && generateQuadImages !== undefined;

  return (
    <div className="flex flex-col gap-2">
      {(showAspectRatio || showImageSize || showQuadToggle) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {showAspectRatio && <ImagenAspectRatioSelector aspectRatio={aspectRatio} setAspectRatio={setAspectRatio} t={t as (key: string) => string} supportedRatios={supportedAspectRatios} />}
            {showImageSize && <ImageSizeSelector imageSize={imageSize} setImageSize={setImageSize} t={t as (key: string) => string} supportedSizes={supportedImageSizes} />}
            {showQuadToggle && <QuadImageToggle enabled={generateQuadImages} onToggle={onToggleQuadImages} t={t as (key: string) => string} />}
        </div>
      )}
      {fileError && <div className="p-2 text-sm text-[var(--theme-text-danger)] bg-[var(--theme-bg-error-message)] border border-[var(--theme-bg-danger)] rounded-md">{fileError}</div>}
      {showAddByIdInput && (
        <AddFileByIdInput
          fileIdInput={fileIdInput}
          setFileIdInput={setFileIdInput}
          onAddFileByIdSubmit={onAddFileByIdSubmit}
          onCancel={onCancelAddById}
          isAddingById={isAddingById}
          isLoading={isLoading}
          t={t as (key: string) => string}
        />
      )}
      {showAddByUrlInput && (
        <AddUrlInput
          urlInput={urlInput}
          setUrlInput={setUrlInput}
          onAddUrlSubmit={onAddUrlSubmit}
          onCancel={onCancelAddUrl}
          isAddingByUrl={isAddingByUrl}
          isLoading={isLoading}
          t={t as (key: string) => string}
        />
      )}
    </div>
  );
};
