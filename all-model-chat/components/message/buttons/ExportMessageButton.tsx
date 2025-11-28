
import React, { useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import { Loader2, Download, ImageIcon, FileCode2, FileText, FileJson, X } from 'lucide-react';
import { ThemeColors, ChatMessage } from '../../../types';
import { translations } from '../../../utils/appUtils';
import { 
    exportElementAsPng, 
    exportHtmlStringAsFile, 
    exportTextStringAsFile, 
    triggerDownload, 
    sanitizeFilename,
    generateExportHtmlTemplate,
    generateExportTxtTemplate,
    gatherPageStyles,
    createSnapshotContainer
} from '../../../utils/exportUtils';
import { useResponsiveValue } from '../../../hooks/useDevice';
import { Modal } from '../../shared/Modal';

interface ExportMessageButtonProps {
    message: ChatMessage;
    themeColors: ThemeColors;
    themeId: string;
    className?: string;
    t: (key: keyof typeof translations, fallback?: string) => string;
    iconSize?: number;
}

export const ExportMessageButton: React.FC<ExportMessageButtonProps> = ({ message, themeColors, themeId, className, t, iconSize: propIconSize }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [exportingType, setExportingType] = useState<'png' | 'html' | 'txt' | 'json' | null>(null);
  const responsiveIconSize = useResponsiveValue(14, 16);
  const iconSize = propIconSize ?? responsiveIconSize;
  
  // Match UI constants with ExportChatModal
  const headingIconSize = useResponsiveValue(20, 24);
  const buttonIconSize = useResponsiveValue(24, 28);

  const handleExport = async (type: 'png' | 'html' | 'txt' | 'json') => {
    if (exportingType) return;
    setExportingType(type);

    try {
        const markdownContent = message.content || '';
        const messageId = message.id;
        const shortId = messageId.slice(-6);
        const contentSnippet = markdownContent.replace(/[^\w\s]/gi, '').split(' ').slice(0, 5).join('_');
        const safeSnippet = sanitizeFilename(contentSnippet) || 'message';
        const filenameBase = `${safeSnippet}-${shortId}`;
        
        const dateObj = new Date(message.timestamp);
        const dateStr = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString();

        if (type !== 'png') {
             await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (type === 'png') {
            const rawHtml = marked.parse(markdownContent);
            const sanitizedHtml = DOMPurify.sanitize(rawHtml as string);
            
            let cleanup = () => {};
            try {
                const { container, innerContent, remove, rootBgColor } = await createSnapshotContainer(
                    themeId,
                    '800px'
                );
                cleanup = remove;

                const headerHtml = `
                    <div style="padding: 2rem 2rem 1rem 2rem; border-bottom: 1px solid var(--theme-border-secondary); margin-bottom: 1rem;">
                        <h1 style="font-size: 1.5rem; font-weight: bold; color: var(--theme-text-primary); margin-bottom: 0.5rem;">Exported Message</h1>
                        <div style="font-size: 0.875rem; color: var(--theme-text-tertiary); display: flex; gap: 1rem;">
                            <span>${dateStr}</span>
                            <span>•</span>
                            <span>ID: ${shortId}</span>
                        </div>
                    </div>
                `;

                innerContent.innerHTML = `
                    ${headerHtml}
                    <div style="padding: 0 2rem 2rem 2rem;">
                        <div class="markdown-body">${sanitizedHtml}</div>
                    </div>
                `;
                
                innerContent.querySelectorAll('pre code').forEach((block) => {
                    hljs.highlightElement(block as HTMLElement);
                });
                
                await exportElementAsPng(container, `${filenameBase}.png`, { backgroundColor: rootBgColor, scale: 2.5 });
            } finally {
                cleanup();
            }

        } else if (type === 'html') {
            const rawHtml = marked.parse(markdownContent);
            const sanitizedHtml = DOMPurify.sanitize(rawHtml as string);
            const styles = await gatherPageStyles();
            const bodyClasses = document.body.className;
            const rootBgColor = getComputedStyle(document.documentElement).getPropertyValue('--theme-bg-primary');

            const fullHtml = generateExportHtmlTemplate({
                title: `Message ${shortId}`,
                date: dateStr,
                model: `ID: ${shortId}`,
                contentHtml: `<div class="markdown-body">${sanitizedHtml}</div>`,
                styles,
                themeId,
                language: 'en',
                rootBgColor,
                bodyClasses
            });
            
            exportHtmlStringAsFile(fullHtml, `${filenameBase}.html`);

        } else if (type === 'txt') {
            const txtContent = generateExportTxtTemplate({
                title: `Message Export ${shortId}`,
                date: dateStr,
                model: 'N/A',
                messages: [{
                    role: message.role === 'user' ? 'USER' : 'ASSISTANT',
                    timestamp: new Date(message.timestamp),
                    content: markdownContent,
                    files: message.files?.map(f => ({ name: f.name }))
                }]
            });
            exportTextStringAsFile(txtContent, `${filenameBase}.txt`);
        } else if (type === 'json') {
            const blob = new Blob([JSON.stringify(message, null, 2)], { type: 'application/json' });
            triggerDownload(URL.createObjectURL(blob), `${filenameBase}.json`);
        }
    } catch (err) {
      console.error(`Failed to export message as ${type.toUpperCase()}:`, err);
      alert(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setExportingType(null);
      setIsOpen(false);
    }
  };

  return (
    <>
        <button 
            onClick={() => setIsOpen(true)} 
            className={`${className}`} 
            aria-label={t('export')} 
            title={t('export')}
        >
            <Download size={iconSize} strokeWidth={1.5} />
        </button>

        <Modal isOpen={isOpen} onClose={() => !exportingType && setIsOpen(false)}>
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
                        onClick={() => setIsOpen(false)} 
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
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                            {[
                                { id: 'png', icon: ImageIcon, label: 'PNG Image', desc: 'Visual snapshot' },
                                { id: 'html', icon: FileCode2, label: 'HTML File', desc: 'Web page format' },
                                { id: 'txt', icon: FileText, label: 'TXT File', desc: 'Plain text' },
                                { id: 'json', icon: FileJson, label: 'JSON File', desc: 'Raw data' },
                            ].map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => handleExport(opt.id as any)}
                                    className={`
                                        flex flex-col items-center justify-center gap-3 p-6 
                                        bg-[var(--theme-bg-secondary)] hover:bg-[var(--theme-bg-tertiary)] 
                                        rounded-lg border border-[var(--theme-border-secondary)] 
                                        transition-all duration-200 
                                        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-primary)] focus:ring-[var(--theme-border-focus)] 
                                        transform hover:-translate-y-1 hover:shadow-lg
                                    `}
                                >
                                    <opt.icon size={buttonIconSize} className={
                                        opt.id === 'png' ? 'text-[var(--theme-text-link)]' :
                                        opt.id === 'html' ? 'text-green-500' :
                                        opt.id === 'txt' ? 'text-blue-500' :
                                        'text-orange-500'
                                    } strokeWidth={1.5} />
                                    <span className="font-semibold text-base text-[var(--theme-text-primary)]">{opt.label}</span>
                                    <span className="text-xs text-center text-[var(--theme-text-tertiary)]">{opt.desc}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    </>
  );
};
