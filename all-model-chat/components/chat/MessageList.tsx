
import React, { useState, useCallback, useMemo } from 'react';
import { ChatMessage, UploadedFile, AppSettings, SideViewContent } from '../../types';
import { Message } from '../message/Message';
import { translations } from '../../utils/appUtils';
import { HtmlPreviewModal } from '../modals/HtmlPreviewModal';
import { FilePreviewModal } from '../shared/ImageZoomModal';
import { ThemeColors } from '../../constants/themeConstants';
import { SUPPORTED_IMAGE_MIME_TYPES } from '../../constants/fileConstants';
import { WelcomeScreen } from './message-list/WelcomeScreen';
import { MessageListPlaceholder } from './message-list/MessageListPlaceholder';
import { ScrollNavigation } from './message-list/ScrollNavigation';

export interface MessageListProps {
  messages: ChatMessage[];
  sessionTitle?: string;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  setScrollContainerRef: (node: HTMLDivElement | null) => void;
  onScrollContainerScroll: () => void;
  onEditMessage: (messageId: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onRetryMessage: (messageId: string) => void;
  onEditMessageContent: (message: ChatMessage) => void;
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
  ttsMessageId: string | null;
  t: (key: keyof typeof translations, fallback?: string) => string;
  language: 'en' | 'zh';
  scrollNavVisibility: { up: boolean, down: boolean };
  onScrollToPrevTurn: () => void;
  onScrollToNextTurn: () => void;
  chatInputHeight: number;
  appSettings: AppSettings;
  onOpenSidePanel: (content: SideViewContent) => void;
}

export const MessageList: React.FC<MessageListProps> = ({ 
    messages, sessionTitle, scrollContainerRef, setScrollContainerRef, onScrollContainerScroll, 
    onEditMessage, onDeleteMessage, onRetryMessage, onEditMessageContent, showThoughts, themeColors, baseFontSize,
    expandCodeBlocksByDefault, isMermaidRenderingEnabled, isGraphvizRenderingEnabled, onSuggestionClick, onOrganizeInfoClick, onFollowUpSuggestionClick, onTextToSpeech, ttsMessageId, t, language, themeId,
    scrollNavVisibility, onScrollToPrevTurn, onScrollToNextTurn,
    chatInputHeight, appSettings, onOpenSidePanel
}) => {
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);
  
  const [isHtmlPreviewModalOpen, setIsHtmlPreviewModalOpen] = useState(false);
  const [htmlToPreview, setHtmlToPreview] = useState<string | null>(null);
  const [initialTrueFullscreenRequest, setInitialTrueFullscreenRequest] = useState(false);
  
  // Virtualization state
  const [visibleMessages, setVisibleMessages] = useState<Set<string>>(() => {
    const initialVisible = new Set<string>();
    const lastN = 15;
    for (let i = Math.max(0, messages.length - lastN); i < messages.length; i++) {
        initialVisible.add(messages[i].id);
    }
    return initialVisible;
  });

  const estimateMessageHeight = useCallback((message: ChatMessage) => {
    if (!message) return 150;
    let height = 80;
    if (message.content) {
        const lines = message.content.length / 80;
        height += lines * 24;
    }
    if (message.files && message.files.length > 0) {
        height += message.files.length * 120;
    }
    if (message.thoughts && showThoughts) {
        height += 100;
    }
    return Math.min(height, 1200);
  }, [showThoughts]);

  const handleBecameVisible = useCallback((messageId: string) => {
    setVisibleMessages(prev => {
        if (prev.has(messageId)) return prev;
        const newSet = new Set(prev);
        newSet.add(messageId);
        return newSet;
    });
  }, []);

  const handleFileClick = useCallback((file: UploadedFile) => {
    setPreviewFile(file);
  }, []);

  const closeFilePreviewModal = useCallback(() => {
    setPreviewFile(null);
  }, []);

  const allImages = useMemo(() => {
      if (!previewFile) return [];
      return messages.flatMap(m => m.files || []).filter(f => 
          (SUPPORTED_IMAGE_MIME_TYPES.includes(f.type) || f.type === 'image/svg+xml') && !f.error
      );
  }, [messages, previewFile]);

  const currentImageIndex = useMemo(() => {
      if (!previewFile) return -1;
      return allImages.findIndex(f => f.id === previewFile.id);
  }, [allImages, previewFile]);

  const handlePrevImage = useCallback(() => {
      if (currentImageIndex > 0) {
          setPreviewFile(allImages[currentImageIndex - 1]);
      }
  }, [currentImageIndex, allImages]);

  const handleNextImage = useCallback(() => {
      if (currentImageIndex < allImages.length - 1) {
          setPreviewFile(allImages[currentImageIndex + 1]);
      }
  }, [currentImageIndex, allImages]);

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

  return (
    <>
    <div 
      ref={setScrollContainerRef}
      onScroll={onScrollContainerScroll}
      className={`relative flex-grow overflow-y-auto px-1.5 sm:px-2 md:px-3 py-3 sm:py-4 md:py-6 custom-scrollbar ${themeId === 'pearl' ? 'bg-[var(--theme-bg-primary)]' : 'bg-[var(--theme-bg-secondary)]'}`}
      style={{ paddingBottom: chatInputHeight ? `${chatInputHeight + 16}px` : '160px' }}
      aria-live="polite" 
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
                        onEditMessageContent={onEditMessageContent}
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
                        ttsMessageId={ttsMessageId}
                        onSuggestionClick={onFollowUpSuggestionClick}
                        t={t}
                        appSettings={appSettings}
                        onOpenSidePanel={onOpenSidePanel}
                    />
                );
            } else {
                return (
                    <MessageListPlaceholder
                        key={`${msg.id}-placeholder`}
                        height={estimateMessageHeight(msg)}
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
    </>
  );
};
