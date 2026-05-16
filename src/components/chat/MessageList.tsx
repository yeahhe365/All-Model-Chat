import { logService } from '@/services/logService';
import React, { Suspense, useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { Message } from '@/components/message/Message';
import { WelcomeScreen } from './message-list/WelcomeScreen';
import { ScrollNavigation } from './message-list/ScrollNavigation';
import { TextSelectionToolbar } from './message-list/TextSelectionToolbar';
import { useMessageListUI } from '@/hooks/useMessageListUI';
import { useMessageListScroll } from './message-list/hooks/useMessageListScroll';
import { MessageListFooter } from './message-list/MessageListFooter';
import { isGemini3Model } from '@/utils/modelHelpers';
import { getVisibleChatMessages } from '@/utils/chat/visibility';
import { isMarkdownFile } from '@/utils/fileTypeUtils';
import { useSettingsStore } from '@/stores/settingsStore';
import { useChatStore } from '@/stores/chatStore';
import { useUIStore } from '@/stores/uiStore';
import { useChatState } from '@/hooks/chat/useChatState';
import { useChatInputRuntime, useChatMessageListRuntime } from '@/components/layout/chat-runtime/ChatRuntimeContext';
import { useI18n } from '@/contexts/I18nContext';
import { formatLiveArtifactFollowupPrompt, type LiveArtifactFollowupPayload } from '@/utils/liveArtifactFollowup';
import { lazyNamedComponent } from '@/utils/lazyNamedComponent';

const LazyHtmlPreviewModal = lazyNamedComponent(
  () => import('@/components/modals/HtmlPreviewModal'),
  'HtmlPreviewModal',
);
const LazyFilePreviewModal = lazyNamedComponent(
  () => import('@/components/modals/FilePreviewModal'),
  'FilePreviewModal',
);
const LazyMarkdownPreviewModal = lazyNamedComponent(
  () => import('@/components/modals/MarkdownPreviewModal'),
  'MarkdownPreviewModal',
);
const LazyFileConfigurationModal = lazyNamedComponent(
  () => import('@/components/modals/FileConfigurationModal'),
  'FileConfigurationModal',
);

const MessageListComponent: React.FC = () => {
  const appSettings = useSettingsStore((state) => state.appSettings);
  const themeId = useSettingsStore((state) => state.currentTheme.id);
  const { language } = useI18n();
  const messages = useChatStore((state) => state.activeMessages);
  const setCommandedInput = useChatStore((state) => state.setCommandedInput);
  const { activeSessionId, currentChatSettings } = useChatState(appSettings);
  const chatInputHeight = useUIStore((state) => state.chatInputHeight);
  const { onSendMessage } = useChatInputRuntime();
  const {
    sessionTitle,
    setScrollContainerRef,
    onEditMessage,
    onDeleteMessage,
    onRetryMessage,
    onUpdateMessageFile,
    onFollowUpSuggestionClick,
    onFollowUpSuggestionFill,
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
  const handleLiveArtifactFollowUp = React.useCallback(
    (payload: LiveArtifactFollowupPayload) => {
      const followupPrompt = formatLiveArtifactFollowupPrompt(payload, language);
      if (!followupPrompt) {
        logService.warn('Ignored invalid Live Artifact follow-up payload.');
        return;
      }

      onSendMessage(followupPrompt);
    },
    [language, onSendMessage],
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
    scrollToTop,
    scrollToBottom,
    showScrollDown,
    showScrollUp,
    scrollerRef,
    handleScroll,
  } = useMessageListScroll({ messages: visibleMessages, setScrollContainerRef, activeSessionId });

  // Determine if current model is Gemini 3 to enable per-part resolution
  const isGemini3 = useMemo(() => isGemini3Model(currentChatSettings.modelId), [currentChatSettings.modelId]);
  const markdownPreviewFile = previewFile && isMarkdownFile(previewFile) ? previewFile : null;
  const genericPreviewFile = previewFile && !isMarkdownFile(previewFile) ? previewFile : null;
  const followOutput = React.useCallback((isAtBottom: boolean) => (isAtBottom ? 'auto' : false), []);

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
            followOutput={followOutput}
            computeItemKey={(_, msg) => msg.id}
            rangeChanged={onRangeChanged}
            increaseViewportBy={{ top: 800, bottom: 800 }}
            className="custom-scrollbar chat-message-list-scroller"
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
                  onLiveArtifactFollowUp={handleLiveArtifactFollowUp}
                  showThoughts={currentChatSettings.showThoughts}
                  onContinueGeneration={onContinueGeneration}
                  onForkMessage={onForkMessage}
                  onSuggestionClick={onFollowUpSuggestionClick}
                  onSuggestionFill={onFollowUpSuggestionFill}
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
          onScrollToTop={scrollToTop}
          onScrollToBottom={scrollToBottom}
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
            onLiveArtifactFollowUp={handleLiveArtifactFollowUp}
          />
        </Suspense>
      )}

      {configuringFile && (
        <Suspense fallback={null}>
          <LazyFileConfigurationModal
            isOpen={!!configuringFile}
            onClose={() => setConfiguringFile(null)}
            file={configuringFile.file}
            onSave={handleSaveFileConfig}
            isGemini3={isGemini3}
          />
        </Suspense>
      )}
    </>
  );
};

export const MessageList = React.memo(MessageListComponent);
