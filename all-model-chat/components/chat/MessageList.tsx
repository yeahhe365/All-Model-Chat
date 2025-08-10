import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ChatMessage, MessageListProps, UploadedFile } from '../types';
import { Message } from './message/Message';
import { Bot, Zap, ArrowUp, ArrowDown } from 'lucide-react';
import { translations } from '../utils/appUtils';
import { HtmlPreviewModal } from './HtmlPreviewModal';
import { ImageZoomModal } from './shared/ImageZoomModal';
import { SelectionToolbar } from './shared/SelectionToolbar';
import { ActionModal } from './shared/ActionModal';

type ActionType = 'explain' | 'summarize' | 'translate';

const SUGGESTIONS_KEYS = [
  { titleKey: 'suggestion_summarize_title', descKey: 'suggestion_summarize_desc' },
  { titleKey: 'suggestion_explain_title', descKey: 'suggestion_explain_desc' },
  { titleKey: 'suggestion_translate_title', descKey: 'suggestion_translate_desc' },
  { titleKey: 'suggestion_ocr_title', descKey: 'suggestion_ocr_desc' },
];

export const MessageList: React.FC<MessageListProps> = ({ 
    messages, messagesEndRef, scrollContainerRef, onScrollContainerScroll, 
    onEditMessage, onDeleteMessage, onRetryMessage, showThoughts, themeColors, baseFontSize,
    expandCodeBlocksByDefault, isMermaidRenderingEnabled, isGraphvizRenderingEnabled, onSuggestionClick, onFollowUpSuggestionClick, onTextToSpeech, ttsMessageId, t, language, themeId,
    scrollNavVisibility, onScrollToPrevTurn, onScrollToNextTurn, chatInputHeight, appSettings
}) => {
  const [zoomedFile, setZoomedFile] = useState<UploadedFile | null>(null);
  
  const [isHtmlPreviewModalOpen, setIsHtmlPreviewModalOpen] = useState(false);
  const [htmlToPreview, setHtmlToPreview] = useState<string | null>(null);
  const [initialTrueFullscreenRequest, setInitialTrueFullscreenRequest] = useState(false);

  const [selectionToolbar, setSelectionToolbar] = useState<{ visible: boolean; x: number; y: number; text: string }>({ visible: false, x: 0, y: 0, text: '' });
  const [actionModal, setActionModal] = useState<{ visible: boolean; action: ActionType | null; text: string }>({ visible: false, action: null, text: '' });
  
  const handleImageClick = useCallback((file: UploadedFile) => { setZoomedFile(file); }, []);
  const closeImageZoomModal = useCallback(() => { setZoomedFile(null); }, []);

  const handleOpenHtmlPreview = useCallback((htmlContent: string, options?: { initialTrueFullscreen?: boolean }) => {
    setHtmlToPreview(htmlContent);
    setInitialTrueFullscreenRequest(options?.initialTrueFullscreen ?? false);
    setIsHtmlPreviewModalOpen(true);
  }, []);

  const handleCloseHtmlPreview = useCallback(() => {
    setIsHtmlPreviewModalOpen(false);
    setHtmlToPreview(null);
    setInitialTrueFullscreenRequest(false);
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleSelection = () => {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed && selection.toString().trim().length > 1) {
        const range = selection.getRangeAt(0);
        const target = range.commonAncestorContainer.parentElement;

        if (target && target.closest('[data-message-role="model"]')) {
          const rect = range.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          setSelectionToolbar({
            visible: true,
            x: rect.left - containerRect.left + rect.width / 2,
            y: rect.bottom - containerRect.top,
            text: selection.toString(),
          });
          return;
        }
      }
      setSelectionToolbar(prev => ({ ...prev, visible: false }));
    };
    
    const handleMouseUp = () => setTimeout(handleSelection, 10);
    document.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('scroll', handleSelection, { passive: true });

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('scroll', handleSelection);
    };
  }, [scrollContainerRef]);

  const handleToolbarAction = (action: ActionType) => {
    setActionModal({
        visible: true,
        action: action,
        text: selectionToolbar.text,
    });
    setSelectionToolbar(prev => ({ ...prev, visible: false }));
  };

  return (
    <>
    <div 
      ref={scrollContainerRef}
      onScroll={onScrollContainerScroll}
      className={`relative flex-grow overflow-y-auto p-3 sm:p-4 md:p-6 custom-scrollbar ${themeId === 'pearl' ? 'bg-[var(--theme-bg-primary)]' : 'bg-[var(--theme-bg-secondary)]'}`}
      style={{ paddingBottom: chatInputHeight ? `${chatInputHeight + 16}px` : '160px' }}
      aria-live="polite" 
    >
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-full w-full max-w-7xl mx-auto px-4 pb-24">
          <div className="w-full">
            <h1 className="text-4xl sm:text-5xl font-bold text-center text-[var(--theme-text-primary)] mb-8 sm:mb-12 welcome-message-animate">
              {t('welcome_greeting')}
            </h1>
            <div className="text-left mb-2 sm:mb-3 flex items-center gap-2 text-sm font-medium text-[var(--theme-text-secondary)]">
              <Zap size={16} className="text-[var(--theme-text-link)]" />
              <span>{t('welcome_suggestion_title')}</span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
        <div className="w-full mx-auto">
          {messages.map((msg: ChatMessage, index: number) => (
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
            />
          ))}
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
      <div ref={messagesEndRef} />
      {selectionToolbar.visible && (
        <SelectionToolbar
            position={{ x: selectionToolbar.x, y: selectionToolbar.y }}
            selectedText={selectionToolbar.text}
            onAction={handleToolbarAction}
            t={t}
        />
      )}
    </div>
    <ImageZoomModal file={zoomedFile} onClose={closeImageZoomModal} themeColors={themeColors} t={t} />
    {isHtmlPreviewModalOpen && htmlToPreview !== null && <HtmlPreviewModal isOpen={isHtmlPreviewModalOpen} onClose={handleCloseHtmlPreview} htmlContent={htmlToPreview} themeColors={themeColors} initialTrueFullscreenRequest={initialTrueFullscreenRequest} />}
    {actionModal.visible && actionModal.action && (
        <ActionModal
            isOpen={actionModal.visible}
            onClose={() => setActionModal({ visible: false, action: null, text: ''})}
            action={actionModal.action}
            selectedText={actionModal.text}
            appSettings={appSettings}
            t={t}
        />
    )}
    </>
  );
};