
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
  const [scrollerRef, setSetScrollerRef] = useState<HTMLElement | null>(null);

  // Sync internal scroller ref with parent's expectations
  useEffect(() => {
    if (scrollerRef) {
        setScrollContainerRef(scrollerRef as HTMLDivElement);
    }
  }, [scrollerRef, setScrollContainerRef]);

  // Handle New Turn Anchoring: When a message is sent, scroll the model's message to the top.
  const prevMsgCount = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevMsgCount.current) {
        // Find the index of the newly added Model message (placeholder)
        let targetIndex = -1;
        // Search backwards starting from the end of the previous message count
        for (let i = messages.length - 1; i >= Math.max(0, prevMsgCount.current - 1); i--) {
            if (messages[i].role === 'model') {
                targetIndex = i;
                break;
            }
        }

        if (targetIndex !== -1) {
            // Anchor view to the top of the model message (start of response)
            // Timeout ensures render cycle is complete including footer height adjustment
            setTimeout(() => {
                virtuosoRef.current?.scrollToIndex({
                    index: targetIndex,
                    align: 'start',
                    behavior: 'smooth'
                });
            }, 50);
        }
    }
    prevMsgCount.current = messages.length;
  }, [messages.length]);

  // Determine if current model is Gemini 3 to enable per-part resolution
  const isGemini3 = useMemo(() => {
      return isGemini3Model(currentModelId);
  }, [currentModelId]);

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

  // Determine if the last message is loading to increase footer space
  const lastMsg = messages[messages.length - 1];
  const isLastMessageLoading = lastMsg?.role === 'model' && lastMsg?.isLoading;

  const Footer = useMemo(() => {
      return () => (
          <div style={{ 
              height: isLastMessageLoading 
                  ? '85vh' 
                  : (chatInputHeight ? `${chatInputHeight + 20}px` : '160px'),
              transition: 'height 0.3s ease-out'
          }} />
      );
  }, [isLastMessageLoading, chatInputHeight]);

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
            scrollerRef={setSetScrollerRef}
            atBottomStateChange={setAtBottom}
            followOutput={false} // Disable auto-scroll to bottom during streaming
            rangeChanged={onRangeChanged}
            increaseViewportBy={800} 
            className="custom-scrollbar"
            components={{
                Footer: Footer
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
            containerRef={scrollerRef as any} 
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
