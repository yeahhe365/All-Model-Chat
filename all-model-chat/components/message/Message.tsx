import React, { useState, useEffect } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import html2canvas from 'html2canvas';
import hljs from 'highlight.js';
import { User, Bot, AlertTriangle, Edit3, Trash2, RotateCw, ClipboardCopy, Check, Loader2, AlertCircle, ImageIcon, FileCode2, Volume2 } from 'lucide-react';
import { ChatMessage, UploadedFile, ThemeColors } from '../../types';
import { MessageContent } from './MessageContent';
import { translations, generateThemeCssVariables } from '../../utils/appUtils';

const generateFullHtmlDocument = (contentHtml: string, themeColors: ThemeColors, messageId: string): string => {
  const themeVariablesCss = generateThemeCssVariables(themeColors);
  const styles = `
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.5.1/github-markdown-dark.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/a11y-dark.min.css">
    <style id="theme-variables">${themeVariablesCss}</style>
    <style>
      /* Basic styles for HTML export */
      body { background-color: var(--theme-bg-primary); color: var(--theme-text-primary); font-family: sans-serif; padding: 20px; }
      .markdown-body-container { background-color: var(--theme-bg-model-message); color: var(--theme-bg-model-message-text); padding: 20px; border-radius: 8px; max-width: 900px; margin: auto; }
      /* Override markdown css to match theme */
      .markdown-body { background-color: transparent !important; color: var(--theme-bg-model-message-text) !important; }
      .markdown-body code:not(pre > code) { background-color: var(--theme-bg-code-block) !important; color: var(--theme-text-code) !important; }
      .markdown-body pre { background-color: var(--theme-bg-code-block) !important; }
      .markdown-body table th, .markdown-body table td { border-color: var(--theme-border-secondary) !important; }
      .markdown-body blockquote { border-left-color: var(--theme-border-secondary) !important; color: var(--theme-text-tertiary) !important; }
      .markdown-body a { color: var(--theme-text-link) !important; }
      .markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4, .markdown-body h5, .markdown-body h6 { color: var(--theme-text-primary) !important; border-bottom-color: var(--theme-border-secondary) !important; }
    </style>`;
  
  const scripts = `
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    <script>
      document.addEventListener('DOMContentLoaded', () => {
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
    ${styles}
  </head>
  <body>
    <div class="markdown-body-container">
      <div class="markdown-body">${contentHtml}</div>
    </div>
    ${scripts}
  </body>
  </html>`;
};

const ExportMessageButton: React.FC<{ markdownContent: string; messageId: string; themeColors: ThemeColors; className?: string; type: 'png' | 'html', t: (key: keyof typeof translations) => string }> = ({ markdownContent, messageId, themeColors, className, type, t }) => {
  const [exportState, setExportState] = useState<'idle' | 'exporting' | 'success' | 'error'>('idle');
  const iconSize = window.innerWidth < 640 ? 14 : 16;

  const handleExport = async () => {
    if (!markdownContent || exportState === 'exporting') return;
    setExportState('exporting');

    try {
        if (type === 'png') {
            const tempContainer = document.createElement('div');
            tempContainer.style.position = 'absolute';
            tempContainer.style.left = '-9999px';
            tempContainer.style.top = '-9999px';
            tempContainer.style.width = '840px';
            tempContainer.style.padding = '20px';
            tempContainer.style.backgroundColor = themeColors.bgPrimary;
            tempContainer.style.backgroundImage = `radial-gradient(ellipse at 50% 100%, ${themeColors.id === 'pearl' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.025)'}, transparent 70%)`;

            const botIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${themeColors.iconModel}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v-2"/><path d="M9 13v-2"/></svg>`;
            
            const themeCss = generateThemeCssVariables(themeColors);
            
            const exportStyles = `
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fira+Code:wght@400;500&display=swap');
                
                ${themeCss}

                body {
                    font-family: 'Inter', sans-serif;
                    margin: 0;
                    -webkit-font-smoothing: antialiased;
                    -moz-osx-font-smoothing: grayscale;
                }

                * { box-sizing: border-box; }

                .export-wrapper {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    width: 100%;
                    max-width: 800px;
                }

                .avatar-container {
                    width: 40px;
                    height: 40px;
                    flex-shrink: 0;
                    display: flex;
                    align-items: flex-start;
                    justify-content: center;
                    padding-top: 4px;
                }

                .message-bubble {
                    background-color: var(--theme-bg-model-message);
                    color: var(--theme-bg-model-message-text);
                    padding: 12px 16px;
                    border-radius: 18px;
                    border-bottom-left-radius: 4px;
                    max-width: calc(100% - 52px);
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.08);
                    border: 1px solid var(--theme-border-primary);
                }

                .markdown-body {
                    font-family: 'Inter', sans-serif;
                    background-color: transparent !important;
                    color: var(--theme-bg-model-message-text) !important;
                    font-size: 16px;
                    line-height: 1.7;
                    overflow-wrap: break-word;
                    word-break: break-word;
                }
                .markdown-body > *:first-child { margin-top: 0 !important; }
                .markdown-body > *:last-child { margin-bottom: 0 !important; }
                .markdown-body p, .markdown-body ul, .markdown-body ol, .markdown-body blockquote, .markdown-body pre { margin-bottom: 1em !important; }

                .markdown-body code:not(pre > code) {
                    font-family: 'Fira Code', monospace;
                    background-color: var(--theme-bg-code-block) !important;
                    color: var(--theme-text-code) !important;
                    padding: 0.2em 0.4em;
                    margin: 0;
                    font-size: 85%;
                    border-radius: 6px;
                }
                .markdown-body pre {
                    font-family: 'Fira Code', monospace;
                    background-color: var(--theme-bg-code-block) !important;
                    border-radius: 8px !important;
                    padding: 16px !important;
                    border: 1px solid var(--theme-border-secondary);
                    white-space: pre-wrap;
                    word-wrap: break-word;
                }
                .markdown-body pre code {
                    font-family: 'Fira Code', monospace !important;
                    background-color: transparent !important;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                }
                .markdown-body blockquote {
                    padding: 0 1em;
                    color: var(--theme-text-tertiary);
                    border-left: 0.25em solid var(--theme-border-secondary);
                }
                .markdown-body a { color: var(--theme-text-link) !important; text-decoration: underline; }
                .markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4, .markdown-body h5, .markdown-body h6 {
                    margin-top: 1.5em;
                    margin-bottom: 0.8em;
                    font-weight: 600;
                    color: var(--theme-text-primary) !important;
                    border-bottom-color: var(--theme-border-secondary) !important;
                }
                .markdown-body table { width: 100%; border-collapse: collapse; }
                .markdown-body table th, .markdown-body table td { border: 1px solid var(--theme-border-secondary) !important; padding: 0.5em 1em; }
                .markdown-body table th { background-color: var(--theme-bg-tertiary) !important; }
                .markdown-body img { max-width: 100%; border-radius: 8px; }
            `;

            const rawHtml = marked.parse(markdownContent);
            const sanitizedHtml = DOMPurify.sanitize(rawHtml as string);

            tempContainer.innerHTML = `
                <style>
                    ${exportStyles}
                </style>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.5.1/github-markdown-dark.min.css">
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/a11y-dark.min.css">
                
                <div class="export-wrapper">
                    <div class="avatar-container">${botIconSvg}</div>
                    <div class="message-bubble">
                        <div class="markdown-body">${sanitizedHtml}</div>
                    </div>
                </div>
            `;
            
            const codeBlocks = tempContainer.querySelectorAll('pre code');
            codeBlocks.forEach((block) => {
                hljs.highlightElement(block as HTMLElement);
            });
            
            document.body.appendChild(tempContainer);
            
            const images = tempContainer.querySelectorAll('img');
            const promises = Array.from(images).map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise(resolve => {
                    img.onload = img.onerror = resolve;
                });
            });
            await Promise.all(promises);
            await new Promise(resolve => setTimeout(resolve, 250));

            const canvas = await html2canvas(tempContainer, {
                useCORS: true,
                scale: 2.5,
                backgroundColor: themeColors.bgPrimary,
            });

            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `chat-message-${messageId}.png`;
            link.click();
            document.body.removeChild(tempContainer);
        } else { // html
            const rawHtml = marked.parse(markdownContent);
            const sanitizedHtml = DOMPurify.sanitize(rawHtml as string);
            const fullHtmlDoc = generateFullHtmlDocument(sanitizedHtml, themeColors, messageId);
            
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
    baseFontSize: number;
    onTextToSpeech: (messageId: string, text: string) => void;
    ttsMessageId: string | null;
    t: (key: keyof typeof translations) => string;
}

export const Message: React.FC<MessageProps> = React.memo((props) => {
    const { message, prevMessage, messageIndex, onEditMessage, onDeleteMessage, onRetryMessage, onImageClick, onOpenHtmlPreview, showThoughts, themeColors, baseFontSize, t, onTextToSpeech, ttsMessageId } = props;
    
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
                        <ExportMessageButton type="png" markdownContent={message.content} messageId={message.id} themeColors={themeColors} t={t} className={`${actionButtonClasses} text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-link)] hover:bg-[var(--theme-bg-tertiary)]`} />
                        <ExportMessageButton type="html" markdownContent={message.content} messageId={message.id} themeColors={themeColors} t={t} className={`${actionButtonClasses} text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-link)] hover:bg-[var(--theme-bg-tertiary)]`} />
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