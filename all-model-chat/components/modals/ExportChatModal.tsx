
import React from 'react';
import { X, ImageIcon, FileCode2, Loader2, Download, FileText } from 'lucide-react';
import { Modal } from '../shared/Modal';
import { translations } from '../../utils/appUtils';
import { useResponsiveValue } from '../../hooks/useDevice';

interface ExportChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'png' | 'html' | 'txt' | 'json') => void;
  exportStatus: 'idle' | 'exporting';
  t: (key: keyof typeof translations, fallback?: string) => string;
}

export const ExportChatModal: React.FC<ExportChatModalProps> = ({ isOpen, onClose, onExport, exportStatus, t }) => {
    const headingIconSize = useResponsiveValue(20, 24);
    const buttonIconSize = useResponsiveValue(24, 28);
    const isLoading = exportStatus === 'exporting';

    return (
        <Modal isOpen={isOpen} onClose={isLoading ? () => {} : onClose}>
            <div 
                className="bg-[var(--theme-bg-primary)] rounded-xl shadow-premium w-full max-w-md sm:max-w-2xl flex flex-col"
                role="document"
            >
                <div className="flex-shrink-0 flex justify-between items-center p-3 sm:p-4 border-b border-[var(--theme-border-primary)]">
                    <h2 id="export-chat-title" className="text-lg sm:text-xl font-semibold text-[var(--theme-text-link)] flex items-center">
                        <Download size={headingIconSize} className="mr-2.5 opacity-80" />
                        Export Chat
                    </h2>
                    <button 
                        onClick={onClose} 
                        disabled={isLoading}
                        className="text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-secondary)] transition-colors p-1 rounded-full disabled:opacity-50" 
                        aria-label="Close export dialog"
                    >
                        <X size={22} />
                    </button>
                </div>

                <div className="p-4 sm:p-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-40 text-[var(--theme-text-secondary)]">
                            <Loader2 size={36} className="animate-spin text-[var(--theme-text-link)] mb-4" />
                            <p className="text-base font-medium">Exporting conversation...</p>
                            <p className="text-sm mt-1">This may take a moment for long chats or images.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                            <button 
                                onClick={() => onExport('png')} 
                                className="flex flex-col items-center justify-center gap-3 p-6 bg-[var(--theme-bg-secondary)] hover:bg-[var(--theme-bg-tertiary)] rounded-lg border border-[var(--theme-border-secondary)] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-primary)] focus:ring-[var(--theme-border-focus)] transform hover:-translate-y-1 hover:shadow-lg"
                            >
                                <ImageIcon size={buttonIconSize} className="text-[var(--theme-text-link)]" />
                                <span className="font-semibold text-base text-[var(--theme-text-primary)]">PNG Image</span>
                                <span className="text-xs text-center text-[var(--theme-text-tertiary)]">A single, high-resolution image of the entire chat.</span>
                            </button>
                            <button 
                                onClick={() => onExport('html')}
                                className="flex flex-col items-center justify-center gap-3 p-6 bg-[var(--theme-bg-secondary)] hover:bg-[var(--theme-bg-tertiary)] rounded-lg border border-[var(--theme-border-secondary)] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-primary)] focus:ring-[var(--theme-border-focus)] transform hover:-translate-y-1 hover:shadow-lg"
                            >
                                <FileCode2 size={buttonIconSize} className="text-green-500" />
                                <span className="font-semibold text-base text-[var(--theme-text-primary)]">HTML File</span>
                                <span className="text-xs text-center text-[var(--theme-text-tertiary)]">A self-contained file with text, code, and styles.</span>
                            </button>
                            <button 
                                onClick={() => onExport('txt')}
                                className="flex flex-col items-center justify-center gap-3 p-6 bg-[var(--theme-bg-secondary)] hover:bg-[var(--theme-bg-tertiary)] rounded-lg border border-[var(--theme-border-secondary)] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-primary)] focus:ring-[var(--theme-border-focus)] transform hover:-translate-y-1 hover:shadow-lg"
                            >
                                <FileText size={buttonIconSize} className="text-blue-500" />
                                <span className="font-semibold text-base text-[var(--theme-text-primary)]">TXT File</span>
                                <span className="text-xs text-center text-[var(--theme-text-tertiary)]">A simple text file with the conversation content.</span>
                            </button>
                            <button 
                                onClick={() => onExport('json')} 
                                className="flex flex-col items-center justify-center gap-3 p-6 bg-[var(--theme-bg-secondary)] hover:bg-[var(--theme-bg-tertiary)] rounded-lg border border-[var(--theme-border-secondary)] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-primary)] focus:ring-[var(--theme-border-focus)] transform hover:-translate-y-1 hover:shadow-lg"
                            >
                                <FileCode2 size={buttonIconSize} className="text-orange-500" />
                                <span className="font-semibold text-base text-[var(--theme-text-primary)]">JSON File</span>
                                <span className="text-xs text-center text-[var(--theme-text-tertiary)]">Export chat to a JSON file that can be imported later.</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};
