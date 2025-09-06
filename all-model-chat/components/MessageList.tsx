import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ChatMessage, MessageListProps, UploadedFile } from '../types';
import { Message } from './message/Message';
import { X, Bot, Lightbulb, ArrowUp, ArrowDown } from 'lucide-react';
import { translations } from '../utils/appUtils';
import { HtmlPreviewModal } from './HtmlPreviewModal';
import { ImageZoomModal } from './shared/ImageZoomModal';

const SUGGESTIONS_KEYS = [
  { titleKey: 'suggestion_summarize_title', descKey: 'suggestion_summarize_desc' },
  { titleKey: 'suggestion_explain_title', descKey: 'suggestion_explain_desc' },
  { titleKey: 'suggestion_translate_title', descKey: 'suggestion_translate_desc' },
  { titleKey: 'suggestion_ocr_title', descKey: 'suggestion_ocr_desc' },
];

const Placeholder: React.FC<{ height: number, onVisible: () => void }> = ({ height, onVisible }) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                // When the placeholder comes into view (or close to it), trigger the onVisible callback.
                if (entry.isIntersecting) {
                    onVisible();
                }
            },
            {
                root: null, // observe against the viewport
                rootMargin: '500px 0px', // Start loading messages 500px before they become visible
                threshold: 0.01
            }
        );

        const currentRef = ref.current;
        if (currentRef) {
            observer.observe(currentRef);
        }

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, [onVisible]);

    return <div ref={ref} style={{ height: `${height}px` }} aria-hidden="true" />;
};


export const MessageList: React.FC<MessageListProps> = ({ 
    messages, scrollContainerRef, onScrollContainerScroll, 
    onEditMessage, onDeleteMessage, onRetryMessage, showThoughts, themeColors, baseFontSize,
    expandCodeBlocksByDefault, isMermaidRenderingEnabled, isGraphvizRenderingEnabled, onSuggestionClick, onFollowUpSuggestionClick, onTextToSpeech, ttsMessageId, t, language, themeId,
    scrollNavVisibility, onScrollToPrevTurn, onScrollToNextTurn,
    chatInputHeight, appSettings
}) => {
  const [zoomedFile, setZoomedFile] = useState<UploadedFile | null>(null);
  
  const [isHtmlPreviewModalOpen, setIsHtmlPreviewModalOpen] = useState(false);
  const [htmlToPreview, setHtmlToPreview] = useState<string | null>(null);
  const [initialTrueFullscreenRequest, setInitialTrueFullscreenRequest] = useState(false);
  
  const [visibleMessages, setVisibleMessages] = useState<Set<string>>(() => {
    // Initially, make the last 15 messages visible to prevent a blank screen on load
    // and ensure the user sees the latest part of the conversation.
    const initialVisible = new Set<string>();
    const lastN = 15;
    for (let i = Math.max(0, messages.length - lastN); i < messages.length; i++) {
        initialVisible.add(messages[i].id);
    }
    return initialVisible;
  });

  const estimateMessageHeight = useCallback((message: ChatMessage) => {
    if (!message) return 150; // A fallback estimate
    let height = 80; // Base height for padding, avatar space, actions
    if (message.content) {
        const lines = message.content.length / 80;
        height += lines * 24; // ~24px per line estimate
    }
    if (message.files && message.files.length > 0) {
        height += message.files.length * 120; // Estimate for files
    }
    if (message.thoughts && showThoughts) {
        height += 100; // Estimate for thoughts block
    }
    return Math.min(height, 1200); // Cap estimate
  }, [showThoughts]);

  const handleBecameVisible = useCallback((messageId: string) => {
    setVisibleMessages(prev => {
        if (prev.has(messageId)) return prev;
        const newSet = new Set(prev);
        newSet.add(messageId);
        return newSet;
    });
  }, []);

  const handleImageClick = useCallback((file: UploadedFile) => {
    setZoomedFile(file);
  }, []);

  const closeImageZoomModal = useCallback(() => {
    setZoomedFile(null);
  }, []);

  const handleOpenHtmlPreview = useCallback((
      htmlContent: string, 
      options?: { initialTrueFullscreen?: boolean }
    ) => {
    setHtmlToPreview(htmlContent);
    setInitialTrueFullscreenRequest(options?.initialTrueFullscreen ?? false);
    setIsHtmlPreviewModalOpen(true);
  }, []);

  const handleCloseHtmlPreview = useCallback(() => {
    setIsHtmlPreviewModalOpen(false);
    setHtmlToPreview(null);
    setInitialTrueFullscreenRequest(false);
  }, []);

  return (
    <>
    <div 
      ref={scrollContainerRef}
      onScroll={onScrollContainerScroll}
      className={`relative flex-grow overflow-y-auto px-1.5 sm:px-2 md:px-3 py-3 sm:py-4 md:py-6 custom-scrollbar ${themeId === 'pearl' ? 'bg-[var(--theme-bg-primary)]' : 'bg-[var(--theme-bg-secondary)]'}`}
      style={{ paddingBottom: chatInputHeight ? `${chatInputHeight + 16}px` : '160px' }}
      aria-live="polite" 
    >
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-full w-full max-w-7xl mx-auto px-4 pb-24">
          <div className="w-full">
            <h1 className="text-3xl sm:text-4xl font-bold text-center text-[var(--theme-text-primary)] mb-8 sm:mb-12 welcome-message-animate">
              {t('welcome_greeting')}
            </h1>
            <div className="text-left mb-2 sm:mb-3 flex items-center gap-2 text-sm font-medium text-[var(--theme-text-secondary)]">
              <Lightbulb size={16} className="text-[var(--theme-text-link)]" />
              <span>{t('welcome_suggestion_title')}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {SUGGESTIONS_KEYS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => onSuggestionClick && onSuggestionClick(t(s.descKey as any))}
                  className="bg-[var(--theme-bg-tertiary)] border border-transparent hover:border-[var(--theme-border-secondary)] rounded-2xl p-3 sm:p-4 text-left h-40 sm:h-44 flex flex-col group justify-between hover:bg-[var(--theme-bg-input)] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)]"
                  style={{ animation: `fadeInUp 0.5s ${0.2 + i * 0.1}s ease-out both` }}
                >
                  <div>
                    <h3 className="font-semibold text-base text-[var(--theme-text-primary)]">{t(s.titleKey as any)}</h3>
                    <p className="text-sm text-[var(--theme-text-secondary)] mt-1">{t(s.descKey as any)}</p>
                  </div>
                  <div className="flex justify-between items-center mt-auto text-[var(--theme-text-tertiary)] opacity-70 group-hover:opacity-100 transition-opacity">
                    <span className="text-sm">{t('suggestion_prompt_label')}</span>
                    <ArrowUp size={20} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-7xl mx-auto">
          {messages.map((msg: ChatMessage, index: number) => {
            if (visibleMessages.has(msg.id)) {
                return (
                    <Message
                        key={msg.id}
                        message={msg}
                        prevMessage={index > 0 ? messages[index - 1] : undefined}
                        messageIndex={index}
                        onEditMessage={onEditMessage}
                        onDeleteMessage={onDeleteMessage}
                        onRetryMessage={onRetryMessage}
                        onImageClick={handleImageClick}
                        onOpenHtmlPreview={handleOpenHtmlPreview}
                        showThoughts={showThoughts}
                        themeColors={themeColors}
                        themeId={themeId}
                        baseFontSize={baseFontSize}
                        expandCodeBlocksByDefault={expandCodeBlocksByDefault}
                        isMermaidRenderingEnabled={isMermaidRenderingEnabled}
                        isGraphvizRenderingEnabled={isGraphvizRenderingEnabled}
                        onTextToSpeech={onTextToSpeech}
                        ttsMessageId={ttsMessageId}
                        onSuggestionClick={onFollowUpSuggestionClick}
                        t={t}
                        appSettings={appSettings}
                    />
                );
            } else {
                return (
                    <Placeholder
                        key={`${msg.id}-placeholder`}
                        height={estimateMessageHeight(msg)}
                        onVisible={() => handleBecameVisible(msg.id)}
                    />
                );
            }
          })}
        </div>
      )}
       { (scrollNavVisibility.up || scrollNavVisibility.down) && (
          <div
            className="sticky z-10 bottom-4 left-0 right-4 flex flex-col items-end gap-2 pointer-events-none"
            style={{ animation: 'fadeInUp 0.3s ease-out both' }}
          >
            {scrollNavVisibility.up && (
                <button
                    onClick={onScrollToPrevTurn}
                    className="p-2 bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)] rounded-full shadow-lg hover:bg-[var(--theme-bg-input)] hover:text-[var(--theme-text-primary)] transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] pointer-events-auto"
                    aria-label="Scroll to previous turn"
                    title="Scroll to previous turn"
                >
                    <ArrowUp size={20} />
                </button>
            )}
            {scrollNavVisibility.down && (
                <button
                    onClick={onScrollToNextTurn}
                    className="p-2 bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)] rounded-full shadow-lg hover:bg-[var(--theme-bg-input)] hover:text-[var(--theme-text-primary)] transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] pointer-events-auto"
                    aria-label="Scroll to next turn or bottom"
                    title="Scroll to next turn or bottom"
                >
                    <ArrowDown size={20} />
                </button>
            )}
          </div>
        )}
    </div>
    <ImageZoomModal 
        file={zoomedFile} 
        onClose={closeImageZoomModal}
        themeColors={themeColors}
        t={t}
    />
    {isHtmlPreviewModalOpen && htmlToPreview !== null && (
      <HtmlPreviewModal
        isOpen={isHtmlPreviewModalOpen}
        onClose={handleCloseHtmlPreview}
        htmlContent={htmlToPreview}
        initialTrueFullscreenRequest={initialTrueFullscreenRequest}
      />
    )}
    </>
  );
};