import React, { useState, useEffect } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import html2canvas from 'html2canvas';
import { User, Bot, AlertTriangle, Edit3, Trash2, RotateCw, ClipboardCopy, Check, Loader2, AlertCircle, ImageIcon, FileCode2 } from 'lucide-react';
import { ChatMessage, UploadedFile, ThemeColors } from '../../types';
import { MessageContent } from './MessageContent';
import { translations } from '../../utils/appUtils';

// Helper functions and components for message actions
const generateThemeCssVariables = (colors: ThemeColors): string => {
  let css = ':root {\n';
  for (const [key, value] of Object.entries(colors)) {
    const cssVarName = `--theme-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    css += `  ${cssVarName}: ${value};\n`;
  }
  css += `  --markdown-code-bg: ${colors.bgCodeBlock || colors.bgInput };\n`;
  css += `  --markdown-code-text: ${colors.textCode};\n`;
  css += `  --markdown-pre-bg: ${colors.bgCodeBlock || colors.bgSecondary};\n`;
  css += `  --markdown-link-text: ${colors.textLink};\n`;
  css += `  --markdown-blockquote-text: ${colors.textTertiary};\n`;
  css += `  --markdown-blockquote-border: ${colors.borderSecondary};\n`;
  css += `  --markdown-hr-bg: ${colors.borderSecondary};\n`;
  css += `  --markdown-table-border: ${colors.borderSecondary};\n`;
  css += '}';
  return css;
};

const generateFullHtmlDocument = (contentHtml: string, themeColors: ThemeColors, messageId: string): string => {
  const themeVariablesCss = generateThemeCssVariables(themeColors);
  const styles = `
    <style id="theme-variables">${themeVariablesCss}</style>
    <style>
      /* Basic styles for HTML export */
      body { background-color: var(--theme-bg-primary); color: var(--theme-text-primary); font-family: sans-serif; padding: 20px; }
      .markdown-body-container { background-color: var(--theme-bg-model-message); color: var(--theme-bg-model-message-text); padding: 20px; border-radius: 8px; max-width: 900px; margin: auto; }
    </style>`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Chat Export - ${messageId}</title>${styles}</head><body><div class="markdown-body-container"><div class="markdown-body">${contentHtml}</div></div></body></html>`;
};

const ExportMessageButton: React.FC<{ markdownContent: string; messageId: string; themeColors: ThemeColors; className?: string; type: 'png' | 'html', t: (key: keyof typeof translations) => string }> = ({ markdownContent, messageId, themeColors, className, type, t }) => {
  const [exportState, setExportState] = useState<'idle' | 'exporting' | 'success' | 'error'>('idle');
  const iconSize = window.innerWidth < 640 ? 14 : 16;

  const handleExport = async () => {
    if (!markdownContent || exportState === 'exporting') return;
    setExportState('exporting');

    try {
        if (type === 'png') {
            const tempDiv = document.createElement('div');
            tempDiv.className = 'markdown-body';
            tempDiv.style.position = 'absolute'; tempDiv.style.left = '-9999px'; tempDiv.style.width = '800px'; tempDiv.style.padding = '24px';
            tempDiv.style.backgroundColor = themeColors.bgModelMessage; tempDiv.style.color = themeColors.bgModelMessageText;
            tempDiv.innerHTML = DOMPurify.sanitize(marked.parse(markdownContent) as string);
            document.body.appendChild(tempDiv);
            const canvas = await html2canvas(tempDiv, { useCORS: true, backgroundColor: themeColors.bgModelMessage, scale: 2 });
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = dataUrl; link.download = `chat-message-${messageId}.png`; link.click();
            document.body.removeChild(tempDiv);
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

  return <button onClick={handleExport} disabled={exportState === 'exporting'} className={`p-1 rounded-md transition-all text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-link)] hover:bg-[var(--theme-bg-tertiary)] ${className}`} aria-label={title} title={title}>{icon}</button>;
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
  return <button onClick={handleCopy} disabled={!textToCopy} className={`p-1 rounded-md transition-all text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-link)] hover:bg-[var(--theme-bg-tertiary)] ${className}`} aria-label={copied ? t('copied_button_title') : t('copy_button_title')} title={copied ? t('copied_button_title') : t('copy_button_title')}>{copied ? <Check size={14} className="text-[var(--theme-text-success)]" /> : <ClipboardCopy size={14} />}</button>;
};

const UserIcon: React.FC = () => <User size={window.innerWidth < 640 ? 20 : 24} className="text-[var(--theme-icon-user)] flex-shrink-0" />;
const BotIcon: React.FC = () => <Bot size={window.innerWidth < 640 ? 20 : 24} className="text-[var(--theme-icon-model)] flex-shrink-0" />;
const ErrorMsgIcon: React.FC = () => <AlertTriangle size={window.innerWidth < 640 ? 20 : 24} className="text-[var(--theme-icon-error)] flex-shrink-0" />;

interface MessageProps {
    message: ChatMessage;
    messages: ChatMessage[];
    messageIndex: number;
    onEditMessage: (messageId: string) => void;
    onDeleteMessage: (messageId: string) => void;
    onRetryMessage: (messageId: string) => void; 
    onImageClick: (file: UploadedFile) => void;
    onOpenHtmlPreview: (html: string, options?: { initialTrueFullscreen?: boolean }) => void;
    showThoughts: boolean;
    themeColors: ThemeColors; 
    baseFontSize: number;
    t: (key: keyof typeof translations) => string;
}

export const Message: React.FC<MessageProps> = (props) => {
    const { message, messages, messageIndex, onEditMessage, onDeleteMessage, onRetryMessage, onImageClick, onOpenHtmlPreview, showThoughts, themeColors, baseFontSize, t } = props;
    
    const prevMsg = messages[messageIndex - 1];
    const isGrouped = prevMsg &&
        prevMsg.role === message.role &&
        !prevMsg.isLoading &&
        !message.isLoading &&
        (new Date(message.timestamp).getTime() - new Date(prevMsg.timestamp).getTime() < 5 * 60 * 1000);

    const actionIconSize = window.innerWidth < 640 ? 14 : 16;
    const canRetryMessage = (message.role === 'model' || (message.role === 'error' && message.generationStartTime)) && !message.isLoading;

    const messageContainerClasses = `flex items-start gap-2 sm:gap-3 group ${isGrouped ? 'mt-1' : 'mt-3 sm:mt-4'} ${message.role === 'user' ? 'justify-end' : 'justify-start'}`;
    const bubbleClasses = `w-fit max-w-full sm:max-w-xl lg:max-w-2xl xl:max-w-3xl p-2.5 sm:p-3 rounded-2xl shadow-premium flex flex-col min-w-0`;

    const roleSpecificBubbleClasses = {
        user: 'bg-[var(--theme-bg-user-message)] text-[var(--theme-bg-user-message-text)] rounded-br-lg',
        model: 'bg-[var(--theme-bg-model-message)] text-[var(--theme-bg-model-message-text)] rounded-bl-lg',
        error: 'bg-[var(--theme-bg-error-message)] text-[var(--theme-bg-error-message-text)] rounded-bl-lg',
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
                {message.role === 'user' && !message.isLoading && <button onClick={() => onEditMessage(message.id)} title={t('edit_button_title')} aria-label={t('edit_button_title')} className="p-1 text-[var(--theme-icon-edit)] hover:text-[var(--theme-text-link)] hover:bg-[var(--theme-bg-tertiary)] rounded-md"><Edit3 size={actionIconSize} /></button>}
                {canRetryMessage && <button onClick={() => onRetryMessage(message.id)} title={t('retry_button_title')} aria-label={t('retry_button_title')} className="p-1 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-link)] hover:bg-[var(--theme-bg-tertiary)] rounded-md"><RotateCw size={actionIconSize} /></button>}
                {(message.content || message.thoughts) && !message.isLoading && <MessageCopyButton textToCopy={message.content} t={t} />}
                {message.content && !message.isLoading && message.role === 'model' && !message.audioSrc && (
                    <>
                        <ExportMessageButton type="png" markdownContent={message.content} messageId={message.id} themeColors={themeColors} t={t} />
                        <ExportMessageButton type="html" markdownContent={message.content} messageId={message.id} themeColors={themeColors} t={t} />
                    </>
                )}
                {!message.isLoading && <button onClick={() => onDeleteMessage(message.id)} title={t('delete_button_title')} aria-label={t('delete_button_title')} className="p-1 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-danger)] hover:bg-[var(--theme-bg-tertiary)] rounded-md"><Trash2 size={actionIconSize} /></button>}
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
                <MessageContent {...props} />
            </div>
            {message.role === 'user' && iconAndActions}
        </div>
    );
};