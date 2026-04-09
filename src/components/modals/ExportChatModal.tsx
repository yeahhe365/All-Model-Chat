
import React from 'react';
import { X, Loader2, Download } from 'lucide-react';
import { Modal } from '../shared/Modal';
import { translations } from '../../utils/appUtils';
import { useResponsiveValue } from '../../hooks/useDevice';
import { ExportOptions } from '../message/buttons/export/ExportOptions';

interface ExportChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'png' | 'html' | 'txt' | 'json') => void;
  exportStatus: 'idle' | 'exporting';
  t: (key: keyof typeof translations, fallback?: string) => string;
}

export const ExportChatModal: React.FC<ExportChatModalProps> = ({ isOpen, onClose, onExport, exportStatus, t: _t }) => {
    const headingIconSize = useResponsiveValue(20, 24);
    const isLoading = exportStatus === 'exporting';
    const t = _t as (key: string, fallback?: string) => string;

    return (
        <Modal isOpen={isOpen} onClose={isLoading ? () => {} : onClose}>
            <div 
                className="bg-[var(--theme-bg-primary)] rounded-xl shadow-premium w-full max-w-md sm:max-w-2xl flex flex-col"
                role="document"
            >
                <div className="flex-shrink-0 flex justify-between items-center p-3 sm:p-4 border-b border-[var(--theme-border-primary)]">
                    <h2 id="export-chat-title" className="text-lg sm:text-xl font-semibold text-[var(--theme-text-link)] flex items-center">
                        <Download size={headingIconSize} className="mr-2.5 opacity-80" />
                        {t('export_chat', 'Export Chat')}
                    </h2>
                    <button 
                        onClick={onClose} 
                        disabled={isLoading}
                        className="text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-secondary)] transition-colors p-1 rounded-full disabled:opacity-50" 
                        aria-label={t('export_close_aria', 'Close export dialog')}
                    >
                        <X size={22} />
                    </button>
                </div>

                <div className="p-4 sm:p-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-40 text-[var(--theme-text-secondary)]">
                            <Loader2 size={36} className="animate-spin text-[var(--theme-text-link)] mb-4" />
                            <p className="text-base font-medium">{t('export_chat_loading', 'Exporting conversation...')}</p>
                            <p className="text-sm mt-1">{t('export_chat_loading_hint', 'This may take a moment for long chats or images.')}</p>
                        </div>
                    ) : (
                        <ExportOptions onExport={onExport} variant="chat" t={_t} />
                    )}
                </div>
            </div>
        </Modal>
    );
};
