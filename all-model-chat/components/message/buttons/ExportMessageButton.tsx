
import React, { useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import { Loader2, Download, ImageIcon, FileCode2, FileText, FileJson, X } from 'lucide-react';
import { ThemeColors, ChatMessage } from '../../../types';
import { translations } from '../../../utils/appUtils';
import { exportElementAsPng, exportHtmlStringAsFile, exportTextStringAsFile, gatherPageStyles, triggerDownload, sanitizeFilename } from '../../../utils/exportUtils';
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
        // Shorten message ID for filename
        const shortId = messageId.slice(-6);
        // Extract a safe title from the first few words
        const contentSnippet = markdownContent.replace(/[^\w\s]/gi, '').split(' ').slice(0, 5).join('_');
        const safeSnippet = sanitizeFilename(contentSnippet) || 'message';
        const filenameBase = `${safeSnippet}-${shortId}`;

        // Simulate a small delay for better UX on fast operations (like text export) to show the loading state briefly
        if (type !== 'png') {
             await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (type === 'png') {
            const rawHtml = marked.parse(markdownContent);
            const sanitizedHtml = DOMPurify.sanitize(rawHtml as string);
            
            const tempContainer = document.createElement('div');
            tempContainer.style.position = 'absolute';
            tempContainer.style.left = '-9999px';
            tempContainer.style.top = '0px';
            tempContainer.style.width = '840px'; 
            tempContainer.style.padding = '20px';
            tempContainer.style.boxSizing = 'border-box';
            
            const allStyles = await gatherPageStyles();
            
            tempContainer.innerHTML = `
                ${allStyles}
                <div class="export-wrapper p-4" style="background-color: ${themeColors.bgPrimary}; background-image: radial-gradient(ellipse at 50% 100%, ${themeId === 'pearl' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.025)'}, transparent 70%);">
                    <div class="flex items-start gap-2 sm:gap-3 group justify-start">
                        <div class="flex-shrink-0 w-8 sm:w-10 flex flex-col items-center sticky top-2 sm:top-4 self-start z-10">
                           <div class="h-6 sm:h-7">
                               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${themeColors.iconModel}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v-2"/><path d="M9 13v-2"/></svg>
                           </div>
                       </div>
                       <div class="w-fit max-w-full sm:max-w-xl lg:max-w-2xl xl:max-w-3xl p-2.5 sm:p-3 rounded-2xl shadow-md flex flex-col min-w-0 bg-[var(--theme-bg-model-message)] text-[var(--theme-bg-model-message-text)] rounded-lg">
                           <div class="markdown-body">${sanitizedHtml}</div>
                       </div>
                   </div>
                </div>
            `;
            
            document.body.appendChild(tempContainer);
            
            tempContainer.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block as HTMLElement);
            });
            
            await exportElementAsPng(tempContainer, `${filenameBase}.png`, { backgroundColor: null, scale: 2.5 });
            document.body.removeChild(tempContainer);

        } else if (type === 'html') {
            const rawHtml = marked.parse(markdownContent);
            const sanitizedHtml = DOMPurify.sanitize(rawHtml as string);
            const headContent = await gatherPageStyles();
            const scripts = `
              <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
              <script>
                document.addEventListener('DOMContentLoaded', () => {
                  document.body.classList.add('theme-${themeId === 'pearl' ? 'light' : 'dark'}');
                  document.querySelectorAll('pre code').forEach((el) => {
                    hljs.highlightElement(el);
                  });
                });
              </script>
            `;

            const fullHtmlDoc = `<!DOCTYPE html><html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Export - ${shortId}</title>
              ${headContent}
              <style>
                body { padding: 20px; }
                .code-block-utility-button { display: none !important; }
              </style>
            </head>
            <body>
              <div class="exported-message-container">
                  <div class="flex items-start gap-2 sm:gap-3 group justify-start">
                       <div class="flex-shrink-0 w-8 sm:w-10 flex flex-col items-center sticky top-2 sm:top-4 self-start z-10">
                          <div class="h-6 sm:h-7">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${themeColors.iconModel}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v-2"/><path d="M9 13v-2"/></svg>
                          </div>
                      </div>
                      <div class="w-fit max-w-full sm:max-w-xl lg:max-w-2xl xl:max-w-3xl p-2.5 sm:p-3 rounded-2xl shadow-md flex flex-col min-w-0 bg-[var(--theme-bg-model-message)] text-[var(--theme-bg-model-message-text)] rounded-lg">
                          <div class="markdown-body">${sanitizedHtml}</div>
                      </div>
                  </div>
              </div>
              ${scripts}
            </body>
            </html>`;
            
            exportHtmlStringAsFile(fullHtmlDoc, `${filenameBase}.html`);

        } else if (type === 'txt') {
            exportTextStringAsFile(markdownContent, `${filenameBase}.txt`);
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
