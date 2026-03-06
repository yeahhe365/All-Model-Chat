
import React, { useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';
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
import { useMessageListScroll } from './message-list/hooks/useMessageListScroll';
import { MessageListFooter } from './message-list/MessageListFooter';

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
  chatInputHeight: number;
  appSettings: AppSettings;
  currentModelId: string;
  onOpenSidePanel: (content: SideViewContent) => void;
  onQuote: (text: string) => void;
  onInsert?: (text: string) => void;
  activeSessionId: string | null;
}

export const MessageList: React.FC<MessageListProps> = ({ 
    messages, sessionTitle, setScrollContainerRef, onScrollContainerScroll,
    onEditMessage, onDeleteMessage, onRetryMessage, onUpdateMessageFile, showThoughts, baseFontSize,
    expandCodeBlocksByDefault, isMermaidRenderingEnabled, isGraphvizRenderingEnabled, onSuggestionClick, onOrganizeInfoClick, onFollowUpSuggestionClick, onTextToSpeech, onGenerateCanvas, onContinueGeneration, ttsMessageId, onQuickTTS, t, themeId,
    chatInputHeight, appSettings, currentModelId, onOpenSidePanel, onQuote, onInsert, activeSessionId
}) => {
  
  // UI Logic (Modals, Previews, Configuration)
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

  // Scroll Logic
  const {
      virtuosoRef,
      setInternalScrollerRef,
      setAtBottom,
      onRangeChanged,
      scrollToPrevTurn,
      scrollToNextTurn,
      showScrollDown,
      showScrollUp,
      scrollerRef
  } = useMessageListScroll({ messages, setScrollContainerRef, activeSessionId });

  // Determine if current model is Gemini 3 to enable per-part resolution
  const isGemini3 = useMemo(() => isGemini3Model(currentModelId), [currentModelId]);

  return (
    <>
      <div className={`relative flex-grow h-full ${themeId === 'pearl' ? 'bg-[var(--theme-bg-primary)]' : 'bg-[var(--theme-bg-secondary)]'}`}>
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
            scrollerRef={setInternalScrollerRef}
            atBottomStateChange={setAtBottom}
            followOutput={false} // Disable auto-scroll to bottom during streaming (we handle it via auto-anchor or user interaction)
            rangeChanged={onRangeChanged}
            increaseViewportBy={800} 
            className="custom-scrollbar"
            onScroll={onScrollContainerScroll} // Pass scroll event to parent handler
            components={{
                Footer: () => <MessageListFooter messages={messages} chatInputHeight={chatInputHeight} />
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
        
        {/* Floating Toolbars & Navigation */}
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
          bottomOffset={chatInputHeight}
        />
      </div>
    
      {/* Modals */}
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
