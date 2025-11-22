import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ChatMessage, MessageListProps, UploadedFile } from '../types';
import { Message } from './message/Message';
import { X, Bot, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { translations } from '../utils/appUtils';
import { HtmlPreviewModal } from './HtmlPreviewModal';
import { ImageZoomModal } from './shared/ImageZoomModal';

const SUGGESTIONS_KEYS = [
  { titleKey: 'suggestion_organize_title', descKey: 'suggestion_organize_desc', specialAction: 'organize' },
  { titleKey: 'suggestion_translate_title', descKey: 'suggestion_translate_desc' },
  { titleKey: 'suggestion_ocr_title', descKey: 'suggestion_ocr_desc' },
  { titleKey: 'suggestion_explain_title', descKey: 'suggestion_explain_desc' },
  { titleKey: 'suggestion_summarize_title', descKey: 'suggestion_summarize_desc' },
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
    expandCodeBlocksByDefault, isMermaidRenderingEnabled, isGraphvizRenderingEnabled, onSuggestionClick, onOrganizeInfoClick, onFollowUpSuggestionClick, onTextToSpeech, ttsMessageId, t, language, themeId,
    scrollNavVisibility, onScrollToPrevTurn, onScrollToNextTurn,
    chatInputHeight, appSettings
}) => {
  const [zoomedFile, setZoomedFile] = useState<UploadedFile | null>(null);
  
  const [isHtmlPreviewModalOpen, setIsHtmlPreviewModalOpen] = useState(false);
  const [htmlToPreview, setHtmlToPreview] = useState<string | null>(null);
  const [initialTrueFullscreenRequest, setInitialTrueFullscreenRequest] = useState(false);
  const [suggestionPage, setSuggestionPage] = useState(0);
  
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

  const suggestionsPerPage = 4;
  const totalSuggestionPages = Math.ceil(SUGGESTIONS_KEYS.length / suggestionsPerPage);
  const paginatedSuggestions = SUGGESTIONS_KEYS.slice(
      suggestionPage * suggestionsPerPage, 
      (suggestionPage * suggestionsPerPage) + suggestionsPerPage
  );

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
        <div className="flex flex-col items-center justify-center min-h-full w-full max-w-4xl mx-auto px-4 pb-16">
          <div className="w-full">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-medium text-center text-[var(--theme-text-primary)] mb-6 sm:mb-12 welcome-message-animate tracking-tight">
              {t('welcome_greeting')}
            </h1>
            
            {/* Header for Suggestions */}
            <div className="flex items-center justify-end mb-4 px-1">
                {totalSuggestionPages > 1 && (
                    <div className="flex items-center bg-[var(--theme-bg-tertiary)]/50 rounded-full p-1 pl-3">
                        <span className="text-xs font-medium tabular-nums mr-2 text-[var(--theme-text-secondary)]">
                            {suggestionPage + 1} / {totalSuggestionPages}
                        </span>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setSuggestionPage(p => Math.max(0, p - 1))}
                                disabled={suggestionPage === 0}
                                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-[var(--theme-bg-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-all text-[var(--theme-text-primary)]"
                                aria-label="Previous suggestions"
                            >
                                <ChevronLeft size={14} strokeWidth={1.5} />
                            </button>
                            <button
                                onClick={() => setSuggestionPage(p => Math.min(totalSuggestionPages - 1, p + 1))}
                                disabled={suggestionPage >= totalSuggestionPages - 1}
                                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-[var(--theme-bg-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-all text-[var(--theme-text-primary)]"
                                aria-label="Next suggestions"
                            >
                                <ChevronRight size={14} strokeWidth={1.5} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Suggestions Grid */}
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              {paginatedSuggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => {
                      const text = t(s.descKey as any);
                      if ((s as any).specialAction === 'organize' && onOrganizeInfoClick) {
                          onOrganizeInfoClick(text);
                      } else if (onSuggestionClick) {
                          onSuggestionClick(text);
                      }
                  }}
                  className="
                    relative flex flex-col text-left
                    h-32 sm:h-40 p-3 sm:p-5 rounded-xl sm:rounded-2xl
                    bg-[var(--theme-bg-tertiary)]/40 
                    border border-[var(--theme-border-secondary)]/50
                    hover:bg-[var(--theme-bg-tertiary)] hover:border-[var(--theme-border-focus)]
                    hover:shadow-lg hover:-translate-y-1
                    transition-all duration-300 ease-out group
                    focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)]
                    overflow-hidden
                  "
                  style={{ animation: `fadeInUp 0.5s ${0.1 + i * 0.1}s ease-out both` }}
                >
                  <div className="relative z-10">
                    <h3 className="font-bold text-sm sm:text-base text-[var(--theme-text-primary)] mb-1 sm:mb-2 group-hover:text-[var(--theme-text-link)] transition-colors duration-300">
                        {t(s.titleKey as any)}
                    </h3>
                    <p className="text-xs sm:text-sm text-[var(--theme-text-secondary)] leading-relaxed line-clamp-3 opacity-90 group-hover:opacity-100">
                        {t(s.descKey as any)}
                    </p>
                  </div>
                  
                  <div className="flex justify-between items-end mt-auto relative z-10">
                    <span className="text-[9px] sm:text-[10px] font-bold text-[var(--theme-text-tertiary)] uppercase tracking-wider opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 delay-75">
                      {t('suggestion_prompt_label')}
                    </span>
                    <div className="
                        w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full 
                        bg-[var(--theme-bg-primary)] text-[var(--theme-text-tertiary)]
                        shadow-sm
                        group-hover:bg-[var(--theme-bg-accent)] group-hover:text-[var(--theme-text-accent)]
                        transition-all duration-300 transform group-hover:scale-110
                    ">
                        <ArrowUp size={14} strokeWidth={1.5} />
                    </div>
                  </div>
                  
                  {/* Subtle decoration */}
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-[var(--theme-bg-accent)]/5 to-transparent rounded-bl-3xl rounded-tr-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                </button>
              ))}
              
              {/* Placeholders to keep grid structure if last page is not full */}
              {Array.from({ length: Math.max(0, suggestionsPerPage - paginatedSuggestions.length) }).map((_, i) => (
                <div key={`placeholder-${i}`} className="h-32 sm:h-40 rounded-xl sm:rounded-2xl border border-dashed border-[var(--theme-border-secondary)]/30" />
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
                    <ArrowUp size={20} strokeWidth={1.5} />
                </button>
            )}
            {scrollNavVisibility.down && (
                <button
                    onClick={onScrollToNextTurn}
                    className="p-2 bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)] rounded-full shadow-lg hover:bg-[var(--theme-bg-input)] hover:text-[var(--theme-text-primary)] transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] pointer-events-auto"
                    aria-label="Scroll to next turn or bottom"
                    title="Scroll to next turn or bottom"
                >
                    <ArrowDown size={20} strokeWidth={1.5} />
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