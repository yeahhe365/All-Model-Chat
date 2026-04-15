
import React, { Suspense, lazy, useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { useI18n } from '../../contexts/I18nContext';
import { Message } from '../message/Message';
import { WelcomeScreen } from './message-list/WelcomeScreen';
import { ScrollNavigation } from './message-list/ScrollNavigation';
import { FileConfigurationModal } from '../modals/FileConfigurationModal';
import { TextSelectionToolbar } from './message-list/TextSelectionToolbar';
import { useMessageListUI } from '../../hooks/useMessageListUI';
import { useMessageListScroll } from './message-list/hooks/useMessageListScroll';
import { MessageListFooter } from './message-list/MessageListFooter';
import { isGemini3Model } from '../../utils/modelHelpers';
import { useChatAreaMessageList } from '../layout/chat-area/ChatAreaContext';

const LazyHtmlPreviewModal = lazy(async () => {
  const module = await import('../modals/HtmlPreviewModal');
  return { default: module.HtmlPreviewModal };
});

const LazyFilePreviewModal = lazy(async () => {
  const module = await import('../modals/FilePreviewModal');
  return { default: module.FilePreviewModal };
});

const MessageListComponent: React.FC = () => {
  const { t } = useI18n();
  const {
    messages,
    sessionTitle,
    setScrollContainerRef,
    onScrollContainerScroll,
    onEditMessage,
    onDeleteMessage,
    onRetryMessage,
    onUpdateMessageFile,
    showThoughts,
    themeId,
    baseFontSize,
    expandCodeBlocksByDefault,
    isMermaidRenderingEnabled,
    isGraphvizRenderingEnabled,
    onSuggestionClick,
    onOrganizeInfoClick,
    onFollowUpSuggestionClick,
    onGenerateCanvas,
    onContinueGeneration,
    onQuickTTS,
    chatInputHeight,
    appSettings,
    currentModelId,
    onOpenSidePanel,
    onQuote,
    onInsert,
    activeSessionId,
  } = useChatAreaMessageList();
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
      handleScrollerRef,
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
            scrollerRef={handleScrollerRef}
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
                        onGenerateCanvas={onGenerateCanvas}
                        onContinueGeneration={onContinueGeneration}
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
            containerRef={scrollerRef} 
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
      {previewFile && (
        <Suspense fallback={null}>
          <LazyFilePreviewModal 
              file={previewFile} 
              onClose={closeFilePreviewModal}
              t={t}
              onPrev={handlePrevImage}
              onNext={handleNextImage}
              hasPrev={currentImageIndex > 0}
              hasNext={currentImageIndex !== -1 && currentImageIndex < allImages.length - 1}
          />
        </Suspense>
      )}

      {isHtmlPreviewModalOpen && htmlToPreview !== null && (
        <Suspense fallback={null}>
          <LazyHtmlPreviewModal
            isOpen={isHtmlPreviewModalOpen}
            onClose={handleCloseHtmlPreview}
            htmlContent={htmlToPreview}
            initialTrueFullscreenRequest={initialTrueFullscreenRequest}
          />
        </Suspense>
      )}

      <FileConfigurationModal 
          isOpen={!!configuringFile} 
          onClose={() => setConfiguringFile(null)} 
          file={configuringFile?.file || null}
          onSave={handleSaveFileConfig}
          t={t as any}
          isGemini3={isGemini3}
      />
    </>
  );
};

export const MessageList = React.memo(MessageListComponent);
