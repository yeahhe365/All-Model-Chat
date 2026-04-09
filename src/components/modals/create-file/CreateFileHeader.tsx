
import React from 'react';
import { FileText, Download, Loader2, Edit3, Eye, X } from 'lucide-react';
import { translations } from '../../../utils/appUtils';

interface CreateFileHeaderProps {
    isEditing: boolean;
    isPdf: boolean;
    isExportingPdf: boolean;
    isPdfPreviewReady: boolean;
    supportsRichPreview: boolean;
    isPreviewMode: boolean;
    setIsPreviewMode: (mode: boolean) => void;
    handleDownloadPdf: () => void;
    onClose: () => void;
    t: (key: keyof typeof translations | string) => string;
}

export const CreateFileHeader: React.FC<CreateFileHeaderProps> = ({
    isEditing,
    isPdf,
    isExportingPdf,
    isPdfPreviewReady,
    supportsRichPreview,
    isPreviewMode,
    setIsPreviewMode,
    handleDownloadPdf,
    onClose,
    t
}) => {
    return (
        <div className="flex items-center justify-between px-4 py-3 bg-[var(--theme-bg-secondary)]/50 flex-shrink-0 z-10">
            <h2 className="text-lg font-semibold text-[var(--theme-text-primary)] flex items-center gap-2">
                <FileText size={20} className="text-[var(--theme-text-link)]" />
                {isEditing ? t('createText_edit_title') : t('createText_title')}
            </h2>
            <div className="flex items-center gap-2">
                {isPdf && (
                     <button
                        onClick={handleDownloadPdf}
                        disabled={isExportingPdf || !isPdfPreviewReady}
                        className="flex items-center justify-center h-9 w-9 sm:w-auto sm:px-3 rounded-lg text-xs font-medium transition-colors bg-[var(--theme-bg-input)] text-[var(--theme-text-primary)] border border-[var(--theme-border-secondary)] hover:bg-[var(--theme-bg-tertiary)] disabled:opacity-50"
                        title={t('createText_download_pdf')}
                        aria-label={t('createText_download_pdf')}
                     >
                        {isExportingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                        <span className="hidden sm:inline ml-2">PDF</span>
                     </button>
                )}
    
                {supportsRichPreview && (
                    <button
                        onClick={() => setIsPreviewMode(!isPreviewMode)}
                        className={`lg:hidden flex items-center justify-center h-9 w-9 sm:w-auto sm:px-3 rounded-lg text-xs font-medium transition-colors border ${
                            isPreviewMode 
                            ? 'bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)] border-[var(--theme-bg-accent)]' 
                            : 'bg-[var(--theme-bg-input)] text-[var(--theme-text-primary)] border-[var(--theme-border-secondary)] hover:bg-[var(--theme-bg-tertiary)]'
                        }`}
                        title={isPreviewMode ? t('createText_switch_to_edit') : t('createText_switch_to_preview')}
                     >
                        {isPreviewMode ? <Edit3 size={16} /> : <Eye size={16} />}
                        <span className="hidden sm:inline ml-2">{isPreviewMode ? t('edit') : t('preview')}</span>
                     </button>
                )}
    
                <button
                    onClick={onClose}
                    className="h-9 w-9 flex items-center justify-center text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors"
                    aria-label={t('close')}
                >
                    <X size={20} />
                </button>
            </div>
        </div>
    );
};
