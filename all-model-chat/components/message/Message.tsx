import React, { useState, useMemo, useRef } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import { User, Bot, AlertTriangle, Edit3, Trash2, RotateCw, ClipboardCopy, Check, Loader2, AlertCircle, ImageIcon, FileCode2, Volume2 } from 'lucide-react';
import { ChatMessage, UploadedFile, ThemeColors } from '../../types';
import { MessageContent } from './MessageContent';
import { translations, getResponsiveValue } from '../../utils/appUtils';
import { exportElementAsPng, exportHtmlStringAsFile, gatherPageStyles } from '../../utils/exportUtils';


const ExportMessageButton: React.FC<{ markdownContent: string; messageId: string; themeColors: ThemeColors; themeId: string; className?: string; type: 'png' | 'html', t: (key: keyof typeof translations) => string }> = ({ markdownContent, messageId, themeColors, themeId, className, type, t }) => {
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

const UserIcon: React.FC = () => <User size={getResponsiveValue(20, 24)} className="text-[var(--theme-icon-user)] flex-shrink-0" />;
const BotIcon: React.FC = () => <Bot size={getResponsiveValue(20, 24)} className="text-[var(--theme-icon-model)] flex-shrink-0" />;
const ErrorMsgIcon: React.FC = () => <AlertTriangle size={getResponsiveValue(20, 24)} className="text-[var(--theme-icon-error)] flex-shrink-0" />;

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
    expandCodeBlocksByDefault: boolean;
    isMermaidRenderingEnabled: boolean;
    isGraphvizRenderingEnabled: boolean;
    onTextToSpeech: (messageId: string, text: string) => void;
    ttsMessageId: string | null;
    onSuggestionClick?: (suggestion: string) => void;
    t: (key: keyof typeof translations) => string;
}

export const Message: React.FC<MessageProps> = React.memo((props) => {
    const { message, prevMessage, messageIndex, onEditMessage, onDeleteMessage, onRetryMessage, onImageClick, onOpenHtmlPreview, showThoughts, themeColors, themeId, baseFontSize, expandCodeBlocksByDefault, isMermaidRenderingEnabled, isGraphvizRenderingEnabled, t, onTextToSpeech, ttsMessageId, onSuggestionClick } = props;
    
    const isGrouped = prevMessage &&
        prevMessage.role === message.role &&
        !prevMessage.isLoading &&
        !message.isLoading &&
        (new Date(message.timestamp).getTime() - new Date(prevMessage.timestamp).getTime() < 5 * 60 * 1000);

    const isModelThinkingOrHasThoughts = message.role === 'model' && (message.isLoading || (message.thoughts && showThoughts));
    const actionIconSize = getResponsiveValue(14, 16);
    const showRetryButton = (message.role === 'model' || (message.role === 'error' && message.generationStartTime));
    const isThisMessageLoadingTts = ttsMessageId === message.id;

    const messageContainerClasses = `flex items-start gap-2 sm:gap-3 group ${isGrouped ? 'mt-1' : 'mt-3 sm:mt-4'} ${message.role === 'user' ? 'justify-end' : 'justify-start'}`;
    const bubbleClasses = `w-fit max-w-[calc(100%-2.75rem)] sm:max-w-2xl lg:max-w-3xl xl:max-w-4xl p-2.5 sm:p-3 rounded-2xl shadow-md flex flex-col min-w-0 ${isModelThinkingOrHasThoughts ? 'sm:min-w-[320px]' : ''}`;

    const actionButtonClasses = "p-1 rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-secondary)] focus:ring-[var(--theme-border-focus)]";


    const roleSpecificBubbleClasses = {
        user: 'bg-[var(--theme-bg-user-message)] text-[var(--theme-bg-user-message-text)] rounded-lg',
        model: 'bg-[var(--theme-bg-model-message)] text-[var(--theme-bg-model-message-text)] rounded-lg',
        error: 'bg-[var(--theme-bg-error-message)] text-[var(--theme-bg-error-message-text)] rounded-lg',
    };

    const [deltaX, setDeltaX] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);
    const [copied, setCopied] = useState(false);
    const touchStartRef = useRef({ x: 0, y: 0 });
    const isSwipeGesture = useRef<boolean | null>(null);
    const isMobile = useMemo(() => typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0), []);

    const SWIPE_THRESHOLD = 80;

    const handleTouchStart = (e: React.TouchEvent) => {
        if (!isMobile || message.isLoading) return;
        touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        isSwipeGesture.current = null;
        setIsSwiping(true);
        setCopied(false);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isMobile || !isSwiping || message.isLoading) return;
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const dx = currentX - touchStartRef.current.x;
        const dy = currentY - touchStartRef.current.y;

        if (isSwipeGesture.current === null) {
            if (Math.abs(dx) > Math.abs(dy) + 5) {
                isSwipeGesture.current = true; // Horizontal
            } else {
                isSwipeGesture.current = false; // Vertical
            }
        }
        
        if (isSwipeGesture.current) {
            e.preventDefault();
            const limitedDx = Math.max(-150, Math.min(150, dx));
            setDeltaX(limitedDx);
        } else {
            setIsSwiping(false);
        }
    };

    const handleTouchEnd = () => {
        if (!isMobile || message.isLoading) return;
        
        if (isSwipeGesture.current) {
            if (deltaX > SWIPE_THRESHOLD) {
                onDeleteMessage(message.id);
            } else if (deltaX < -SWIPE_THRESHOLD) {
                if (message.content) {
                    navigator.clipboard.writeText(message.content);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                }
            }
        }
        
        setIsSwiping(false);
        setDeltaX(0);
        isSwipeGesture.current = null;
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
                {message.role === 'user' && !message.isLoading && <button onClick={() => onEditMessage(message.id)} title={t('edit')} aria-label={t('edit')} className={`${actionButtonClasses} text-[var(--theme-icon-edit)] hover:text-[var(--theme-text-link)] hover:bg-[var(--theme-bg-tertiary)]`}><Edit3 size={actionIconSize} /></button>}
                {showRetryButton && <button onClick={() => onRetryMessage(message.id)} title={message.isLoading ? t('retry_and_stop_button_title') : t('retry_button_title')} aria-label={message.isLoading ? t('retry_and_stop_button_title') : t('retry_button_title')} className={`${actionButtonClasses} text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-link)] hover:bg-[var(--theme-bg-tertiary)]`}><RotateCw size={actionIconSize} /></button>}
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
                {!message.isLoading && <button onClick={() => onDeleteMessage(message.id)} title={t('delete')} aria-label={t('delete')} className={`${actionButtonClasses} text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-danger)] hover:bg-[var(--theme-bg-tertiary)]`}><Trash2 size={actionIconSize} /></button>}
            </div>
        </div>
    );

    return (
        <div 
            className="relative message-container-animate"
            style={{ animationDelay: `${Math.min(messageIndex * 80, 800)}ms` }}
            data-message-id={message.id} 
            data-message-role={message.role}
        >
             {isMobile && (
                <div 
                    className={`absolute inset-0 rounded-2xl ${isGrouped ? 'mt-1' : 'mt-3 sm:mt-4'}`}
                    aria-hidden="true"
                >
                    <div className="absolute inset-y-0 left-0 w-full flex items-center justify-start pl-6 bg-red-500 text-white rounded-2xl"
                        style={{ 
                            clipPath: `inset(0 ${-deltaX > 0 ? '100%' : `calc(100% - ${deltaX}px)`} 0 0)`,
                            opacity: Math.min(1, Math.abs(deltaX) / SWIPE_THRESHOLD),
                        }}>
                        <Trash2 size={20} />
                    </div>
                    <div className="absolute inset-y-0 right-0 w-full flex items-center justify-end pr-6 bg-blue-500 text-white rounded-2xl"
                        style={{ 
                            clipPath: `inset(0 0 0 ${deltaX < 0 ? `calc(100% - ${-deltaX}px)` : '100%'})`,
                            opacity: Math.min(1, Math.abs(deltaX) / SWIPE_THRESHOLD),
                        }}>
                        {copied ? <Check size={20} /> : <ClipboardCopy size={20} />}
                    </div>
                </div>
            )}
            <div
                className={`${messageContainerClasses}`} 
                style={{ 
                    transform: `translateX(${deltaX}px)`,
                    transition: isSwiping ? 'none' : 'transform 0.3s ease',
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {message.role !== 'user' && iconAndActions}
                <div className={`${bubbleClasses} ${roleSpecificBubbleClasses[message.role]}`}>
                    <MessageContent
                        message={message}
                        onImageClick={onImageClick}
                        onOpenHtmlPreview={onOpenHtmlPreview}
                        showThoughts={showThoughts}
                        baseFontSize={baseFontSize}
                        expandCodeBlocksByDefault={expandCodeBlocksByDefault}
                        isMermaidRenderingEnabled={isMermaidRenderingEnabled}
                        isGraphvizRenderingEnabled={isGraphvizRenderingEnabled}
                        onSuggestionClick={onSuggestionClick}
                        t={t}
                    />
                </div>
                {message.role === 'user' && iconAndActions}
            </div>
        </div>
    );
});