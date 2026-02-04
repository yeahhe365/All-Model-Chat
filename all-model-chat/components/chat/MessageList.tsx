
import React, { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { ChatMessage, AppSettings, SideViewContent, VideoMetadata } from '../../types';
import { Message } from '../message/Message';
import { translations } from '../../utils/appUtils';
import { HtmlPreviewModal } from '../modals/HtmlPreviewModal';
import { FilePreviewModal } from '../modals/FilePreviewModal';
import { WelcomeScreen } from './message-list/WelcomeScreen';
import { ScrollNavigation } from './message-list/ScrollNavigation';
import { FileConfigurationModal } from '../modals/FileConfigurationModal';
import { MediaResolution } from '../../types/settings';
import { isGemini3Model } from '../../utils/appUtils';
import { TextSelectionToolbar } from './message-list/TextSelectionToolbar';
import { useMessageListUI } from '../../hooks/useMessageListUI';

export interface MessageListProps {
  messages: ChatMessage[];
  sessionTitle?: string;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  setScrollContainerRef: (node: HTMLDivElement | null) => void;
  onScrollContainerScroll: () => void;
  onEditMessage: (messageId: string, mode?: 'update' | 'resend') => void;
  onDeleteMessage: (messageId: string) => void;
  onRetryMessage: (messageId: string) => void;
  onUpdateMessageFile: (messageId: string, fileId: string, updates: { videoMetadata?: VideoMetadata, mediaResolution?: MediaResolution }) => void;
  showThoughts: boolean;
  themeId: string;
  baseFontSize: number;
  expandCodeBlocksByDefault: boolean;
  isMermaidRenderingEnabled: boolean;
  isGraphvizRenderingEnabled: boolean;
  onSuggestionClick?: (suggestion: string) => void;
  onOrganizeInfoClick?: (suggestion: string) => void;
  onFollowUpSuggestionClick?: (suggestion: string) => void;
  onTextToSpeech: (messageId: string, text: string) => void;
  onGenerateCanvas: (messageId: string, text: string) => void;
  onContinueGeneration: (messageId: string) => void;
  ttsMessageId: string | null;
  onQuickTTS: (text: string) => Promise<string | null>;
  t: (key: keyof typeof translations, fallback?: string) => string;
  language: 'en' | 'zh';
  scrollNavVisibility: { up: boolean, down: boolean };
  onScrollToPrevTurn: () => void;
  onScrollToNextTurn: () => void;
  chatInputHeight: number;
  appSettings: AppSettings;
  currentModelId: string;
  onOpenSidePanel: (content: SideViewContent) => void;
  onQuote: (text: string) => void;
  onInsert?: (text: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({ 
    messages, sessionTitle, setScrollContainerRef, 
    onEditMessage, onDeleteMessage, onRetryMessage, onUpdateMessageFile, showThoughts, baseFontSize,
    expandCodeBlocksByDefault, isMermaidRenderingEnabled, isGraphvizRenderingEnabled, onSuggestionClick, onOrganizeInfoClick, onFollowUpSuggestionClick, onTextToSpeech, onGenerateCanvas, onContinueGeneration, ttsMessageId, onQuickTTS, t, language, themeId,
    chatInputHeight, appSettings, currentModelId, onOpenSidePanel, onQuote, onInsert
}) => {
  const {
      previewFile,
      isHtmlPreviewModalOpen,
      htmlToPreview,
      initialTrueFullscreenRequest,
      configuringFile,
      setConfiguringFile,
      handleFileClick,
      closeFilePreviewModal,
      allImages,
      currentImageIndex,
      handlePrevImage,
      handleNextImage,
      handleOpenHtmlPreview,
      handleCloseHtmlPreview,
      handleConfigureFile,
      handleSaveFileConfig,
  } = useMessageListUI({ messages, onUpdateMessageFile });

  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [scrollerRef, setScrollerRef] = useState<HTMLElement | null>(null);

  // Sync internal scroller ref with parent's expectations
  useEffect(() => {
    if (scrollerRef) {
        setScrollContainerRef(scrollerRef as HTMLDivElement);
    }
  }, [scrollerRef, setScrollContainerRef]);

  // Determine if current model is Gemini 3 to enable per-part resolution
  const isGemini3 = useMemo(() => {
      return isGemini3Model(currentModelId);
  }, [currentModelId]);

  // Virtualized Scroll Navigation Logic
  const handleScrollToPrevTurn = useCallback(() => {
    if (!virtuosoRef.current) return;
    
    // Simple heuristic: Find the index of the last user message visible or above
    // Since we don't know exactly what is visible without querying Virtuoso state intricately,
    // we'll scan efficiently from the bottom-ish or current position.
    // For simplicity with Virtuoso: we can just find the index in the data.
    
    // NOTE: True "current view" index detection is complex. 
    // We will use a simplified approach: find the last model message index and scroll to it.
    // A better UX might be tracking the *current* top index via `rangeChanged` prop.
    
    // Using simple "Scroll to Top" for now if logic is complex, OR implement `rangeChanged` tracking.
    // Let's implement basic range tracking:
    virtuosoRef.current.scrollToIndex({ index: Math.max(0, messages.length - 2), align: 'start', behavior: 'smooth' });
  }, [messages.length]);

  // Advanced scroll navigation using range tracking
  const visibleRangeRef = useRef({ startIndex: 0, endIndex: 0 });

  const onRangeChanged = useCallback(({ startIndex, endIndex }: { startIndex: number, endIndex: number }) => {
      visibleRangeRef.current = { startIndex, endIndex };
  }, []);

  const scrollToPrevTurn = useCallback(() => {
      const currentIndex = visibleRangeRef.current.startIndex;
      let targetIndex = -1;

      // Find the first model message ABOVE the current view
      for (let i = currentIndex - 1; i >= 0; i--) {
          const msg = messages[i];
          const prevMsg = messages[i - 1];
          // Turn boundary: Model message preceded by User message
          if (msg.role === 'model' && prevMsg?.role === 'user') {
              targetIndex = i;
              break;
          }
      }
      
      if (targetIndex === -1 && currentIndex > 0) targetIndex = 0;

      if (targetIndex !== -1) {
          virtuosoRef.current?.scrollToIndex({ index: targetIndex, align: 'start', behavior: 'smooth' });
      }
  }, [messages]);

  const scrollToNextTurn = useCallback(() => {
      const currentIndex = visibleRangeRef.current.startIndex;
      let targetIndex = -1;

      // Find the first model message BELOW the current view
      // Start searching a bit below current index to avoid jumping to the one currently at top
      for (let i = currentIndex + 1; i < messages.length; i++) {
          const msg = messages[i];
          const prevMsg = messages[i - 1];
          // Turn boundary
          if (msg.role === 'model' && prevMsg?.role === 'user') {
              targetIndex = i;
              break;
          }
      }

      if (targetIndex !== -1) {
          virtuosoRef.current?.scrollToIndex({ index: targetIndex, align: 'start', behavior: 'smooth' });
      } else {
          virtuosoRef.current?.scrollToIndex({ index: messages.length - 1, align: 'end', behavior: 'smooth' });
      }
  }, [messages]);

  // Determine nav visibility based on `atBottom` and list length
  const showScrollDown = !atBottom;
  const showScrollUp = messages.length > 2 && visibleRangeRef.current.startIndex > 0;

  return (
    <>
      <div 
        className={`relative flex-grow h-full ${themeId === 'pearl' ? 'bg-[var(--theme-bg-primary)]' : 'bg-[var(--theme-bg-secondary)]'}`}
      >
        {messages.length === 0 ? (
          <WelcomeScreen 
              t={t}
              onSuggestionClick={onSuggestionClick}
              onOrganizeInfoClick={onOrganizeInfoClick}
              showSuggestions={appSettings.showWelcomeSuggestions ?? true}
              themeId={themeId}
          />
        ) : (
          <Virtuoso
            ref={virtuosoRef}
            data={messages}
            scrollerRef={setScrollerRef}
            atBottomStateChange={setAtBottom}
            followOutput={(isAtBottom) => isAtBottom ? 'auto' : false}
            rangeChanged={onRangeChanged}
            increaseViewportBy={400} // Pre-render more content for smoother scrolling
            className="custom-scrollbar"
            components={{
                // Add padding to bottom to account for input area
                Footer: () => <div style={{ height: chatInputHeight ? `${chatInputHeight + 20}px` : '160px' }} />
            }}
            itemContent={(index, msg) => (
                <div className="px-1.5 sm:px-2 md:px-3 max-w-7xl mx-auto w-full">
                    <Message
                        key={msg.id}
                        message={msg}
                        sessionTitle={sessionTitle}
                        prevMessage={index > 0 ? messages[index - 1] : undefined}
                        messageIndex={index}
                        onEditMessage={onEditMessage}
                        onDeleteMessage={onDeleteMessage}
                        onRetryMessage={onRetryMessage}
                        onImageClick={handleFileClick} 
                        onOpenHtmlPreview={handleOpenHtmlPreview}
                        showThoughts={showThoughts}
                        themeId={themeId}
                        baseFontSize={baseFontSize}
                        expandCodeBlocksByDefault={expandCodeBlocksByDefault}
                        isMermaidRenderingEnabled={isMermaidRenderingEnabled}
                        isGraphvizRenderingEnabled={isGraphvizRenderingEnabled}
                        onTextToSpeech={onTextToSpeech}
                        onGenerateCanvas={onGenerateCanvas}
                        onContinueGeneration={onContinueGeneration}
                        ttsMessageId={ttsMessageId}
                        onSuggestionClick={onFollowUpSuggestionClick}
                        t={t}
                        appSettings={appSettings}
                        onOpenSidePanel={onOpenSidePanel}
                        onConfigureFile={msg.role === 'user' ? handleConfigureFile : undefined}
                        isGemini3={isGemini3}
                    />
                </div>
            )}
          />
        )}
        
        {/* Overlays that need to be absolute relative to the container */}
        <TextSelectionToolbar 
            onQuote={onQuote} 
            onInsert={onInsert} 
            onTTS={onQuickTTS} 
            containerRef={scrollerRef as any} // Pass the raw DOM element from Virtuoso
            t={t} 
        />

        <ScrollNavigation 
          showUp={showScrollUp}
          showDown={showScrollDown}
          onScrollToPrev={scrollToPrevTurn}
          onScrollToNext={scrollToNextTurn}
        />
      </div>
    
      <FilePreviewModal 
          file={previewFile} 
          onClose={closeFilePreviewModal}
          t={t}
          onPrev={handlePrevImage}
          onNext={handleNextImage}
          hasPrev={currentImageIndex > 0}
          hasNext={currentImageIndex !== -1 && currentImageIndex < allImages.length - 1}
      />

      {isHtmlPreviewModalOpen && htmlToPreview !== null && (
        <HtmlPreviewModal
          isOpen={isHtmlPreviewModalOpen}
          onClose={handleCloseHtmlPreview}
          htmlContent={htmlToPreview}
          initialTrueFullscreenRequest={initialTrueFullscreenRequest}
        />
      )}

      <FileConfigurationModal 
          isOpen={!!configuringFile} 
          onClose={() => setConfiguringFile(null)} 
          file={configuringFile?.file || null}
          onSave={handleSaveFileConfig}
          t={t}
          isGemini3={isGemini3}
      />
    </>
  );
};
