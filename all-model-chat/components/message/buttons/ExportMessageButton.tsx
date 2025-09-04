import React, { useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import { Loader2, Check, AlertCircle, ImageIcon, FileCode2 } from 'lucide-react';
import { ThemeColors } from '../../../types';
import { translations, getResponsiveValue } from '../../../utils/appUtils';
import { exportElementAsPng, exportHtmlStringAsFile, gatherPageStyles } from '../../../utils/exportUtils';

interface ExportMessageButtonProps {
    markdownContent: string;
    messageId: string;
    themeColors: ThemeColors;
    themeId: string;
    className?: string;
    type: 'png' | 'html';
    t: (key: keyof typeof translations) => string;
}

export const ExportMessageButton: React.FC<ExportMessageButtonProps> = ({ markdownContent, messageId, themeColors, themeId, className, type, t }) => {
  const [exportState, setExportState] = useState<'idle' | 'exporting' | 'success' | 'error'>('idle');
  const iconSize = getResponsiveValue(14, 16);

  const handleExport = async () => {
    if (!markdownContent || exportState === 'exporting') return;
    setExportState('exporting');

    try {
        const rawHtml = marked.parse(markdownContent);
        const sanitizedHtml = DOMPurify.sanitize(rawHtml as string);

        if (type === 'png') {
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
            
            const filename = `chat-message-${messageId}.png`;
            await exportElementAsPng(tempContainer, filename, { backgroundColor: null, scale: 2.5 });

            document.body.removeChild(tempContainer);
        } else { // html
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
              <title>Chat Export - ${messageId}</title>
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
            
            const filename = `chat-message-${messageId}.html`;
            exportHtmlStringAsFile(fullHtmlDoc, filename);
        }
        setExportState('success');
    } catch (err) {
      console.error(`Failed to export message as ${type.toUpperCase()}:`, err);
      setExportState('error');
    } finally {
      setTimeout(() => setExportState('idle'), 2500);
    }
  };

  let icon, title;
  const upperType = type.toUpperCase();
  switch (exportState) {
    case 'exporting': icon = <Loader2 size={iconSize} className="animate-spin text-[var(--theme-text-link)]" />; title = t('exporting_title').replace('{type}', upperType); break;
    case 'success': icon = <Check size={iconSize} className="text-[var(--theme-text-success)]" />; title = t('exported_title').replace('{type}', upperType); break;
    case 'error': icon = <AlertCircle size={iconSize} className="text-[var(--theme-text-danger)]" />; title = t('export_failed_title'); break;
    default: icon = type === 'png' ? <ImageIcon size={iconSize} /> : <FileCode2 size={iconSize} />; title = t('export_as_title').replace('{type}', upperType);
  }

  return <button onClick={handleExport} disabled={exportState === 'exporting'} className={`${className}`} aria-label={title} title={title}>{icon}</button>;
};
