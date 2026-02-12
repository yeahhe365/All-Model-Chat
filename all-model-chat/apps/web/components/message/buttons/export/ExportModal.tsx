
import React from 'react';
import { Download, X, Loader2 } from 'lucide-react';
import { Modal } from '../../../shared/Modal';
import { ExportOptions } from './ExportOptions';
import { ExportType } from '../../../../hooks/useMessageExport';
import { translations } from '../../../../utils/appUtils';
import { useResponsiveValue } from '../../../../hooks/useDevice';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExport: (type: ExportType) => void;
    exportingType: ExportType | null;
    t: (key: keyof typeof translations, fallback?: string) => string;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onExport, exportingType, t }) => {
    const headingIconSize = useResponsiveValue(20, 24);

    return (
        <Modal isOpen={isOpen} onClose={() => !exportingType && onClose()}>
            <div 
                className="bg-[var(--theme-bg-primary)] rounded-xl shadow-premium w-full max-w-md sm:max-w-2xl flex flex-col"
                role="document"
            >
                <div className="flex-shrink-0 flex justify-between items-center p-3 sm:p-4 border-b border-[var(--theme-border-primary)]">
                    <h2 className="text-lg sm:text-xl font-semibold text-[var(--theme-text-link)] flex items-center">
                        <Download size={headingIconSize} className="mr-2.5 opacity-80" />
                        {t('export_as_title', 'Export Message').replace('{type}', '')}
                    </h2>
                    <button 
                        onClick={onClose} 
                        disabled={!!exportingType}
                        className="text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-secondary)] transition-colors p-1 rounded-full disabled:opacity-50"
                        aria-label="Close export dialog"
                    >
                        <X size={22} />
                    </button>
                </div>
                
                <div className="p-4 sm:p-6">
                    {exportingType ? (
                        <div className="flex flex-col items-center justify-center h-40 text-[var(--theme-text-secondary)]">
                            <Loader2 size={36} className="animate-spin text-[var(--theme-text-link)] mb-4" />
                            <p className="text-base font-medium">{t('exporting_title', 'Exporting {type}...').replace('{type}', exportingType.toUpperCase())}</p>
                            <p className="text-sm mt-1">Processing message content...</p>
                        </div>
                    ) : (
                        <ExportOptions onExport={onExport} />
                    )}
                </div>
            </div>
        </Modal>
    );
};
