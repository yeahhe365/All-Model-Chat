
import React from 'react';
import { ChevronDown, Save, FilePlus, Loader2 } from 'lucide-react';
import { translations } from '../../../utils/appUtils';
import { SUPPORTED_EXTENSIONS } from '../../../hooks/useCreateFileEditor';

interface CreateFileFooterProps {
    filenameBase: string;
    setFilenameBase: (name: string) => void;
    extension: string;
    setExtension: (ext: string) => void;
    onSave: () => void;
    isEditing: boolean;
    isPdf: boolean;
    isProcessing: boolean;
    isLoading: boolean;
    isExportingPdf: boolean;
    hasContent: boolean;
    t: (key: keyof typeof translations | string) => string;
}

export const CreateFileFooter: React.FC<CreateFileFooterProps> = ({
    filenameBase,
    setFilenameBase,
    extension,
    setExtension,
    onSave,
    isEditing,
    isPdf,
    isProcessing,
    isLoading,
    isExportingPdf,
    hasContent,
    t
}) => {
    return (
        <div className="flex items-center justify-between px-4 py-3 gap-3 bg-[var(--theme-bg-secondary)]/50 flex-shrink-0">
            <div className="flex items-center gap-2 flex-1 min-w-0 w-full">
                <div className="flex-grow min-w-0">
                    <input
                        type="text"
                        value={filenameBase}
                        onChange={(e) => setFilenameBase(e.target.value)}
                        placeholder={t('createText_filename_placeholder')}
                        className="w-full h-9 px-3 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-lg focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:border-transparent text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)] outline-none transition-all text-sm font-medium"
                        aria-label="Filename"
                        autoComplete="off"
                    />
                </div>
                
                <div className="relative flex-shrink-0">
                    <select
                        value={extension}
                        onChange={(e) => setExtension(e.target.value)}
                        className="h-9 pl-3 pr-8 bg-[var(--theme-bg-input)] border border-[var(--theme-border-secondary)] rounded-lg focus:ring-2 focus:ring-[var(--theme-border-focus)] focus:border-transparent text-[var(--theme-text-primary)] outline-none transition-all text-sm font-mono cursor-pointer appearance-none max-w-[80px]"
                        aria-label="File Extension"
                    >
                        {SUPPORTED_EXTENSIONS.map(ext => (
                            <option key={ext} value={ext}>{ext}</option>
                        ))}
                        {!SUPPORTED_EXTENSIONS.includes(extension) && (
                            <option value={extension}>{extension}</option>
                        )}
                    </select>
                    <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--theme-text-tertiary)] pointer-events-none" />
                </div>
    
                <button
                  type="button"
                  onClick={onSave}
                  disabled={(!hasContent && !filenameBase.trim()) || isProcessing || isLoading || isExportingPdf}
                  className="h-9 px-3 sm:px-4 text-sm font-medium bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-text-accent)] rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transform active:scale-95 whitespace-nowrap flex-shrink-0"
                  title={isEditing ? t('save') : t('createText_create_button')}
                >
                  {(isExportingPdf && isPdf) ? <Loader2 size={16} className="animate-spin" /> : (isEditing ? <Save size={16} strokeWidth={2} /> : <FilePlus size={16} strokeWidth={2} />)}
                  <span className="hidden sm:inline">{isEditing ? t('save') : t('createText_create_button')}</span>
                  <span className="sm:hidden">{isEditing ? t('save') : t('add')}</span>
                </button>
            </div>
        </div>
    );
};
