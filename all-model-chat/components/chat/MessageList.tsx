
import React, { useMemo } from 'react';
import { ChatMessage, AppSettings, SideViewContent, VideoMetadata } from '../../types';
import { Message } from '../message/Message';
import { translations } from '../../utils/appUtils';
import { HtmlPreviewModal } from '../modals/HtmlPreviewModal';
import { FilePreviewModal } from '../modals/FilePreviewModal';
import { ThemeColors } from '../../types/theme';
import { WelcomeScreen } from './message-list/WelcomeScreen';
import { MessageListPlaceholder } from './message-list/MessageListPlaceholder';
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
  themeColors: ThemeColors;
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
}

export const MessageList: React.FC<MessageListProps> = ({ 
    messages, sessionTitle, scrollContainerRef, setScrollContainerRef, onScrollContainerScroll, 
    onEditMessage, onDeleteMessage, onRetryMessage, onUpdateMessageFile, showThoughts, themeColors, baseFontSize,
    expandCodeBlocksByDefault, isMermaidRenderingEnabled, isGraphvizRenderingEnabled, onSuggestionClick, onOrganizeInfoClick, onFollowUpSuggestionClick, onTextToSpeech, onGenerateCanvas, onContinueGeneration, ttsMessageId, t, language, themeId,
    scrollNavVisibility, onScrollToPrevTurn, onScrollToNextTurn,
    chatInputHeight, appSettings, currentModelId, onOpenSidePanel, onQuote
}) => {
  const {
      previewFile,
      isHtmlPreviewModalOpen,
      htmlToPreview,
      initialTrueFullscreenRequest,
      configuringFile,
      setConfiguringFile,
      visibleMessages,
      handleBecameVisible,
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
      estimateMessageHeight
  } = useMessageListUI({ messages, onUpdateMessageFile });

  // Determine if current model is Gemini 3 to enable per-part resolution
  const isGemini3 = useMemo(() => {
      return isGemini3Model(currentModelId);
  }, [currentModelId]);

  return (
    <>
    <div 
      ref={setScrollContainerRef}
      onScroll={onScrollContainerScroll}
      className={`relative flex-grow overflow-y-auto px-1.5 sm:px-2 md:px-3 py-3 sm:py-4 md:py-6 custom-scrollbar ${themeId === 'pearl' ? 'bg-[var(--theme-bg-primary)]' : 'bg-[var(--theme-bg-secondary)]'}`}
      style={{ paddingBottom: chatInputHeight ? `${chatInputHeight + 16}px` : '160px' }}
      aria-live="polite" 
    >
      <TextSelectionToolbar onQuote={onQuote} containerRef={scrollContainerRef} />
      
      {messages.length === 0 ? (
        <WelcomeScreen 
            t={t}
            onSuggestionClick={onSuggestionClick}
            onOrganizeInfoClick={onOrganizeInfoClick}
            showSuggestions={appSettings.showWelcomeSuggestions ?? true}
            themeId={themeId}
        />
      ) : (
        <div className="w-full max-w-7xl mx-auto">
          {messages.map((msg: ChatMessage, index: number) => {
            if (visibleMessages.has(msg.id)) {
                return (
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
                        themeColors={themeColors}
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
                );
            } else {
                return (
                    <MessageListPlaceholder
                        key={`${msg.id}-placeholder`}
                        height={estimateMessageHeight(msg, showThoughts)}
                        onVisible={() => handleBecameVisible(msg.id)}
                    />
                );
            }
          })}
        </div>
      )}
      
      <ScrollNavigation 
        showUp={scrollNavVisibility.up}
        showDown={scrollNavVisibility.down}
        onScrollToPrev={onScrollToPrevTurn}
        onScrollToNext={onScrollToNextTurn}
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
