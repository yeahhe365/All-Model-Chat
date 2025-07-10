import React, { useState, useEffect } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import html2canvas from 'html2canvas';
import hljs from 'highlight.js';
import { User, Bot, AlertTriangle, Edit3, Trash2, RotateCw, ClipboardCopy, Check, Loader2, AlertCircle, ImageIcon, FileCode2, Volume2 } from 'lucide-react';
import { ChatMessage, UploadedFile, ThemeColors } from '../../types';
import { MessageContent } from './MessageContent';
import { translations, generateThemeCssVariables } from '../../utils/appUtils';

const generateFullHtmlDocument = (contentHtml: string, themeColors: ThemeColors, messageId: string, themeId: string): string => {
  let headContent = '';
  // Clone all style and link tags from the current document's head
  const headElements = document.head.querySelectorAll('style, link[rel="stylesheet"]');
  headElements.forEach(el => {
    headContent += el.outerHTML;
  });

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

  return `<!DOCTYPE html><html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chat Export - ${messageId}</title>
    ${headContent}
    <style>
      body { padding: 20px; }
      .exported-message-container { max-width: 900px; margin: auto; }
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
                <div class="markdown-body">${contentHtml}</div>
            </div>
        </div>
    </div>
    ${scripts}
  </body>
  </html>`;
};

const ExportMessageButton: React.FC<{ markdownContent: string; messageId: string; themeColors: ThemeColors; themeId: string; className?: string; type: 'png' | 'html', t: (key: keyof typeof translations) => string }> = ({ markdownContent, messageId, themeColors, themeId, className, type, t }) => {
  const [exportState, setExportState] = useState<'idle' | 'exporting' | 'success' | 'error'>('idle');
  const iconSize = window.innerWidth < 640 ? 14 : 16;

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
            
            // Fetch and inline all stylesheets from the document head
            const stylePromises = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
                .map(el => {
                    if (el.tagName === 'STYLE') {
                        return Promise.resolve(`<style>${el.innerHTML}</style>`);
                    }
                    if (el.tagName === 'LINK' && (el as HTMLLinkElement).rel === 'stylesheet') {
                        // Use a proxy or direct fetch if same-origin, but for CDNs, direct fetch might be blocked
                        // For simplicity, we'll try to fetch, but this may have CORS issues in a real environment.
                        return fetch((el as HTMLLinkElement).href)
                            .then(res => res.text())
                            .then(css => `<style>${css}</style>`)
                            .catch(err => {
                                console.warn('Could not fetch stylesheet for export:', (el as HTMLLinkElement).href, err);
                                return `<!-- Failed to fetch ${(el as HTMLLinkElement).href} -->`;
                            });
                    }
                    return Promise.resolve('');
                });
            
            const allStyles = (await Promise.all(stylePromises)).join('\n');
            
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
            
            // Run highlight.js on the temporary container
            tempContainer.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block as HTMLElement);
            });
            
            // Wait for images to load
            const images = tempContainer.querySelectorAll('img');
            const imageLoadPromises = Array.from(images).map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise(resolve => { img.onload = img.onerror = resolve; });
            });
            await Promise.all(imageLoadPromises);
            await new Promise(resolve => setTimeout(resolve, 250)); // Small delay for rendering

            const canvas = await html2canvas(tempContainer, {
                useCORS: true,
                scale: 2.5,
                backgroundColor: null, // Transparent, so container's background is used
            });

            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `chat-message-${messageId}.png`;
            link.click();
            document.body.removeChild(tempContainer);
        } else { // html
            const fullHtmlDoc = generateFullHtmlDocument(sanitizedHtml, themeColors, messageId, themeId);
            
            const titleMatch = fullHtmlDoc.match(/<title[^>]*>([^<]+)<\/title>/i);
            let filename = `chat-export-${messageId}.html`;
            if (titleMatch && titleMatch[1]) {
                let saneTitle = titleMatch[1].trim().replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/[. ]+$/, '');
                if (saneTitle.length > 100) {
                    saneTitle = saneTitle.substring(0, 100);
                }
                filename = `${saneTitle || 'chat-export'}.html`;
            }

            const blob = new Blob([fullHtmlDoc], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
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

const MessageCopyButton: React.FC<{ textToCopy?: string; className?: string; t: (key: keyof typeof translations) => string }> = ({ textToCopy, className, t }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    if (!textToCopy || copied) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) { console.error('Failed to copy', err); }
  };
  return <button onClick={handleCopy} disabled={!textToCopy} className={`${className}`} aria-label={copied ? t('copied_button_title') : t('copy_button_title')} title={copied ? t('copied_button_title') : t('copy_button_title')}>{copied ? <Check size={14} className="text-[var(--theme-text-success)]" /> : <ClipboardCopy size={14} />}</button>;
};

const UserIcon: React.FC = () => <User size={window.innerWidth < 640 ? 20 : 24} className="text-[var(--theme-icon-user)] flex-shrink-0" />;
const BotIcon: React.FC = () => <Bot size={window.innerWidth < 640 ? 20 : 24} className="text-[var(--theme-icon-model)] flex-shrink-0" />;
const ErrorMsgIcon: React.FC = () => <AlertTriangle size={window.innerWidth < 640 ? 20 : 24} className="text-[var(--theme-icon-error)] flex-shrink-0" />;

interface MessageProps {
    message: ChatMessage;
    prevMessage?: ChatMessage;
    messageIndex: number;
    onEditMessage: (messageId: string) => void;
    onDeleteMessage: (messageId: string) => void;
    onRetryMessage: (messageId: string) => void; 
    onImageClick: (file: UploadedFile) => void;
    onOpenHtmlPreview: (html: string, options?: { initialTrueFullscreen?: boolean }) => void;
    showThoughts: boolean;
    themeColors: ThemeColors; 
    themeId: string;
    baseFontSize: number;
    onTextToSpeech: (messageId: string, text: string) => void;
    ttsMessageId: string | null;
    t: (key: keyof typeof translations) => string;
}

export const Message: React.FC<MessageProps> = React.memo((props) => {
    const { message, prevMessage, messageIndex, onEditMessage, onDeleteMessage, onRetryMessage, onImageClick, onOpenHtmlPreview, showThoughts, themeColors, themeId, baseFontSize, t, onTextToSpeech, ttsMessageId } = props;
    
    const isGrouped = prevMessage &&
        prevMessage.role === message.role &&
        !prevMessage.isLoading &&
        !message.isLoading &&
        (new Date(message.timestamp).getTime() - new Date(prevMessage.timestamp).getTime() < 5 * 60 * 1000);

    const actionIconSize = window.innerWidth < 640 ? 14 : 16;
    const canRetryMessage = (message.role === 'model' || (message.role === 'error' && message.generationStartTime)) && !message.isLoading;
    const isThisMessageLoadingTts = ttsMessageId === message.id;

    const messageContainerClasses = `flex items-start gap-2 sm:gap-3 group ${isGrouped ? 'mt-1' : 'mt-3 sm:mt-4'} ${message.role === 'user' ? 'justify-end' : 'justify-start'}`;
    const bubbleClasses = `w-fit max-w-full sm:max-w-xl lg:max-w-2xl xl:max-w-3xl p-2.5 sm:p-3 rounded-2xl shadow-md flex flex-col min-w-0`;

    const actionButtonClasses = "p-1 rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-secondary)] focus:ring-[var(--theme-border-focus)]";


    const roleSpecificBubbleClasses = {
        user: 'bg-[var(--theme-bg-user-message)] text-[var(--theme-bg-user-message-text)] rounded-lg',
        model: 'bg-[var(--theme-bg-model-message)] text-[var(--theme-bg-model-message-text)] rounded-lg',
        error: 'bg-[var(--theme-bg-error-message)] text-[var(--theme-bg-error-message-text)] rounded-lg',
    };

    const iconAndActions = (
        <div className="flex-shrink-0 w-8 sm:w-10 flex flex-col items-center sticky top-2 sm:top-4 self-start z-10">
            <div className="h-6 sm:h-7">
                {!isGrouped && (
                    <>
                    {message.role === 'user' && <UserIcon />}
                    {message.role === 'model' && <BotIcon />}
                    {message.role === 'error' && <ErrorMsgIcon />}
                    </>
                )}
            </div>
            <div 
              className="message-actions flex flex-col items-center gap-0.5 mt-1 sm:mt-1.5"
              style={{ '--actions-translate-x': message.role === 'user' ? '8px' : '-8px' } as React.CSSProperties}
            >
                {message.role === 'user' && !message.isLoading && <button onClick={() => onEditMessage(message.id)} title={t('edit_button_title')} aria-label={t('edit_button_title')} className={`${actionButtonClasses} text-[var(--theme-icon-edit)] hover:text-[var(--theme-text-link)] hover:bg-[var(--theme-bg-tertiary)]`}><Edit3 size={actionIconSize} /></button>}
                {canRetryMessage && <button onClick={() => onRetryMessage(message.id)} title={t('retry_button_title')} aria-label={t('retry_button_title')} className={`${actionButtonClasses} text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-link)] hover:bg-[var(--theme-bg-tertiary)]`}><RotateCw size={actionIconSize} /></button>}
                {(message.content || message.thoughts) && !message.isLoading && <MessageCopyButton textToCopy={message.content} t={t} className={`${actionButtonClasses} text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-link)] hover:bg-[var(--theme-bg-tertiary)]`} />}
                {message.content && !message.isLoading && message.role === 'model' && !message.audioSrc && (
                    <>
                        <button onClick={() => onTextToSpeech(message.id, message.content)} disabled={!!ttsMessageId} title="Read aloud" aria-label="Read message aloud" className={`${actionButtonClasses} text-[var(--theme-icon-edit)] hover:text-[var(--theme-text-link)] hover:bg-[var(--theme-bg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed`}>
                          { isThisMessageLoadingTts ? <Loader2 size={actionIconSize} className="animate-spin" /> : <Volume2 size={actionIconSize} /> }
                        </button>
                        <ExportMessageButton type="png" markdownContent={message.content} messageId={message.id} themeColors={themeColors} themeId={themeId} t={t} className={`${actionButtonClasses} text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-link)] hover:bg-[var(--theme-bg-tertiary)]`} />
                        <ExportMessageButton type="html" markdownContent={message.content} messageId={message.id} themeColors={themeColors} themeId={themeId} t={t} className={`${actionButtonClasses} text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-link)] hover:bg-[var(--theme-bg-tertiary)]`} />
                    </>
                )}
                {!message.isLoading && <button onClick={() => onDeleteMessage(message.id)} title={t('delete_button_title')} aria-label={t('delete_button_title')} className={`${actionButtonClasses} text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-danger)] hover:bg-[var(--theme-bg-tertiary)]`}><Trash2 size={actionIconSize} /></button>}
            </div>
        </div>
    );

    return (
        <div 
            className={`${messageContainerClasses} message-container-animate`} 
            data-message-id={message.id} 
            style={{ animationDelay: `${Math.min(messageIndex * 80, 800)}ms` }}
        >
            {message.role !== 'user' && iconAndActions}
            <div className={`${bubbleClasses} ${roleSpecificBubbleClasses[message.role]}`}>
                <MessageContent
                    message={message}
                    onImageClick={onImageClick}
                    onOpenHtmlPreview={onOpenHtmlPreview}
                    showThoughts={showThoughts}
                    baseFontSize={baseFontSize}
                    t={t}
                />
            </div>
            {message.role === 'user' && iconAndActions}
        </div>
    );
});