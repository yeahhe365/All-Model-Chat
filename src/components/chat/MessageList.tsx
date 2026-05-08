import React, { Suspense, lazy, useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { Message } from '../message/Message';
import { WelcomeScreen } from './message-list/WelcomeScreen';
import { ScrollNavigation } from './message-list/ScrollNavigation';
import { FileConfigurationModal } from '../modals/FileConfigurationModal';
import { TextSelectionToolbar } from './message-list/TextSelectionToolbar';
import { useMessageListUI } from '../../hooks/useMessageListUI';
import { useMessageListScroll } from './message-list/hooks/useMessageListScroll';
import { MessageListFooter } from './message-list/MessageListFooter';
import { isGemini3Model } from '../../utils/modelHelpers';
import { getVisibleChatMessages } from '../../utils/chat/visibility';
import { isMarkdownFile } from '../../utils/fileTypeUtils';
import { useSettingsStore } from '../../stores/settingsStore';
import { useChatStore } from '../../stores/chatStore';
import { useUIStore } from '../../stores/uiStore';
import { useChatState } from '../../hooks/chat/useChatState';
import { useChatMessageListRuntime } from '../layout/chat-runtime/ChatRuntimeContext';

const LazyHtmlPreviewModal = lazy(async () => {
  const module = await import('../modals/HtmlPreviewModal');
  return { default: module.HtmlPreviewModal };
});

const LazyFilePreviewModal = lazy(async () => {
  const module = await import('../modals/FilePreviewModal');
  return { default: module.FilePreviewModal };
});

const LazyMarkdownPreviewModal = lazy(async () => {
  const module = await import('../modals/MarkdownPreviewModal');
  return { default: module.MarkdownPreviewModal };
});

const MessageListComponent: React.FC = () => {
  const appSettings = useSettingsStore((state) => state.appSettings);
  const themeId = useSettingsStore((state) => state.currentTheme.id);
  const messages = useChatStore((state) => state.activeMessages);
  const setCommandedInput = useChatStore((state) => state.setCommandedInput);
  const { activeSessionId, currentChatSettings } = useChatState(appSettings);
  const chatInputHeight = useUIStore((state) => state.chatInputHeight);
  const {
    sessionTitle,
    setScrollContainerRef,
    onEditMessage,
    onDeleteMessage,
    onRetryMessage,
    onUpdateMessageFile,
    onFollowUpSuggestionClick,
    onGenerateCanvas,
    onContinueGeneration,
    onForkMessage,
    onQuickTTS,
    onOpenSidePanel,
  } = useChatMessageListRuntime();
  const handleQuote = React.useCallback(
    (text: string) => {
      setCommandedInput({ text, id: Date.now(), mode: 'quote' });
    },
    [setCommandedInput],
  );
  const handleInsert = React.useCallback(
    (text: string) => {
      setCommandedInput({ text, id: Date.now(), mode: 'insert' });
    },
    [setCommandedInput],
  );
  const visibleMessages = useMemo(() => getVisibleChatMessages(messages), [messages]);
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
  } = useMessageListUI({ messages: visibleMessages, onUpdateMessageFile });

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
    scrollerRef,
    handleScroll,
  } = useMessageListScroll({ messages: visibleMessages, setScrollContainerRef, activeSessionId });

  // Determine if current model is Gemini 3 to enable per-part resolution
  const isGemini3 = useMemo(() => isGemini3Model(currentChatSettings.modelId), [currentChatSettings.modelId]);
  const markdownPreviewFile = previewFile && isMarkdownFile(previewFile) ? previewFile : null;
  const genericPreviewFile = previewFile && !isMarkdownFile(previewFile) ? previewFile : null;

  return (
    <>
      <div
        className={`relative flex-grow h-full ${themeId === 'pearl' ? 'bg-[var(--theme-bg-primary)]' : 'bg-[var(--theme-bg-secondary)]'}`}
      >
        {visibleMessages.length === 0 ? (
          <WelcomeScreen />
        ) : (
          <Virtuoso
            ref={virtuosoRef}
            data={visibleMessages}
            scrollerRef={handleScrollerRef}
            atBottomStateChange={setAtBottom}
            atBottomThreshold={150}
            followOutput={false} // Disable auto-scroll to bottom during streaming (we handle it via auto-anchor or user interaction)
            computeItemKey={(_, msg) => msg.id}
            rangeChanged={onRangeChanged}
            increaseViewportBy={{ top: 800, bottom: 800 }}
            className="custom-scrollbar"
            onScroll={handleScroll}
            components={{
              Footer: () => <MessageListFooter messages={visibleMessages} chatInputHeight={chatInputHeight} />,
            }}
            itemContent={(index, msg) => (
              <div className="px-1.5 sm:px-2 md:px-3 max-w-7xl mx-auto w-full">
                <Message
                  key={msg.id}
                  message={msg}
                  sessionTitle={sessionTitle}
                  prevMessage={index > 0 ? visibleMessages[index - 1] : undefined}
                  messageIndex={index}
                  onEditMessage={onEditMessage}
                  onDeleteMessage={onDeleteMessage}
                  onRetryMessage={onRetryMessage}
                  onImageClick={handleFileClick}
                  onOpenHtmlPreview={handleOpenHtmlPreview}
                  showThoughts={currentChatSettings.showThoughts}
                  onGenerateCanvas={onGenerateCanvas}
                  onContinueGeneration={onContinueGeneration}
                  onForkMessage={onForkMessage}
                  onSuggestionClick={onFollowUpSuggestionClick}
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
          onQuote={handleQuote}
          onInsert={handleInsert}
          onTTS={onQuickTTS}
          containerRef={scrollerRef}
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
      {genericPreviewFile && (
        <Suspense fallback={null}>
          <LazyFilePreviewModal
            file={genericPreviewFile}
            onClose={closeFilePreviewModal}
            onPrev={handlePrevImage}
            onNext={handleNextImage}
            hasPrev={currentImageIndex > 0}
            hasNext={currentImageIndex !== -1 && currentImageIndex < allImages.length - 1}
          />
        </Suspense>
      )}

      {markdownPreviewFile && (
        <Suspense fallback={null}>
          <LazyMarkdownPreviewModal file={markdownPreviewFile} onClose={closeFilePreviewModal} />
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
        isGemini3={isGemini3}
      />
    </>
  );
};

export const MessageList = React.memo(MessageListComponent);
