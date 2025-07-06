import React, { useState, useCallback, useRef } from 'react';
import { ChatMessage, MessageListProps, UploadedFile, ThemeColors } from '../types';
import { HtmlPreviewModal } from './HtmlPreviewModal';
import { Message } from './message/Message';
import { X, Bot, Zap, ArrowUp } from 'lucide-react';
import { translations } from '../utils/appUtils';

interface ImageZoomModalProps {
  file: UploadedFile | null;
  onClose: () => void;
  themeColors: ThemeColors;
  t: (key: keyof typeof translations) => string;
}

const ImageZoomModal: React.FC<ImageZoomModalProps> = ({ file, onClose, themeColors, t }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const MIN_SCALE = 0.2;
  const MAX_SCALE = 10;
  const ZOOM_SPEED_FACTOR = 1.1;

  React.useEffect(() => {
    if (file) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [file]);

  const handleWheel = useCallback((event: WheelEvent) => {
    if (!viewportRef.current || !imageRef.current || !file) return;
    event.preventDefault();

    const rect = viewportRef.current.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const newScale = event.deltaY < 0
      ? Math.min(MAX_SCALE, scale * ZOOM_SPEED_FACTOR)
      : Math.max(MIN_SCALE, scale / ZOOM_SPEED_FACTOR);

    if (newScale === scale) return;

    // Get the image's layout position (before transforms are applied) relative to its container.
    // This is crucial for correctly calculating the zoom pivot point when flexbox centering is used.
    const imageOffsetX = imageRef.current.offsetLeft;
    const imageOffsetY = imageRef.current.offsetTop;

    const ratio = newScale / scale;

    // This formula calculates the new translation offset (position)
    // needed to keep the point under the mouse cursor stationary.
    // It works by finding the point on the untransformed content that is under the cursor,
    // and adjusting the translation so that after scaling, this same point is still under the cursor.
    const newPositionX = (mouseX - imageOffsetX) * (1 - ratio) + position.x * ratio;
    const newPositionY = (mouseY - imageOffsetY) * (1 - ratio) + position.y * ratio;

    setPosition({ x: newPositionX, y: newPositionY });
    setScale(newScale);
  }, [scale, position, file]);

  const handleMouseDown = (event: React.MouseEvent<HTMLImageElement>) => {
    if (!file || event.button !== 0) return; 
    event.preventDefault();
    setIsDragging(true);
    setDragStart({ 
      x: event.clientX - position.x, 
      y: event.clientY - position.y 
    });
    if (imageRef.current) imageRef.current.style.cursor = 'grabbing';
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !file) return;
    event.preventDefault();
    setPosition({
      x: event.clientX - dragStart.x,
      y: event.clientY - dragStart.y,
    });
  };

  const handleMouseUp = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!file) return;
    event.preventDefault();
    setIsDragging(false);
    if (imageRef.current) imageRef.current.style.cursor = 'grab';
  };
  
  const handleMouseLeave = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) { 
        handleMouseUp(event);
    }
  };


  React.useEffect(() => {
    const vpRef = viewportRef.current;
    if (vpRef && file) {
      vpRef.addEventListener('wheel', handleWheel, { passive: false });
    }
    return () => {
      if (vpRef && file) {
        vpRef.removeEventListener('wheel', handleWheel);
      }
    };
  }, [handleWheel, file]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    if (file) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [file, onClose]);

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === viewportRef.current?.parentElement) {
        onClose();
    }
  };


  if (!file || !file.dataUrl) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-2 sm:p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-zoom-modal-title"
      onClick={handleBackdropClick}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave} 
    >
        <h2 id="image-zoom-modal-title" className="sr-only">{t('imageZoom_title').replace('{filename}', file.name)}</h2>
        <div 
            ref={viewportRef} 
            className="w-full h-full flex items-center justify-center overflow-hidden relative"
        >
          <img
            ref={imageRef}
            src={file.dataUrl}
            alt={`Zoomed view of ${file.name}`}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: '0 0', 
              transition: isDragging ? 'none' : 'transform 0.05s ease-out',
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              cursor: isDragging ? 'grabbing' : 'grab',
              userSelect: 'none', 
            }}
            onMouseDown={handleMouseDown}
            draggable="false" 
          />
        </div>
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1.5 sm:p-2 bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-bg-input)] text-[var(--theme-text-primary)] rounded-full shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)]"
          aria-label={t('imageZoom_close_aria')}
          title={t('imageZoom_close_title')}
        >
          <X size={window.innerWidth < 640 ? 20 : 24} />
        </button>
         <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)] px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg shadow-lg text-xs select-none">
            {file.name} ({(scale * 100).toFixed(0)}%)
        </div>
    </div>
  );
};

const SUGGESTIONS_KEYS = [
  { titleKey: 'suggestion_summarize_title', descKey: 'suggestion_summarize_desc' },
  { titleKey: 'suggestion_explain_title', descKey: 'suggestion_explain_desc' },
  { titleKey: 'suggestion_translate_title', descKey: 'suggestion_translate_desc' },
  { titleKey: 'suggestion_ocr_title', descKey: 'suggestion_ocr_desc' },
];

export const MessageList: React.FC<MessageListProps> = ({ 
    messages, messagesEndRef, scrollContainerRef, onScrollContainerScroll, 
    onEditMessage, onDeleteMessage, onRetryMessage, showThoughts, themeColors, baseFontSize,
    onSuggestionClick, onTextToSpeech, ttsMessageId, t, language
}) => {
  const [zoomedFile, setZoomedFile] = useState<UploadedFile | null>(null);
  
  const [isHtmlPreviewModalOpen, setIsHtmlPreviewModalOpen] = useState(false);
  const [htmlToPreview, setHtmlToPreview] = useState<string | null>(null);
  const [initialTrueFullscreenRequest, setInitialTrueFullscreenRequest] = useState(false);
  
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

  return (
    <>
    <div 
      ref={scrollContainerRef}
      onScroll={onScrollContainerScroll}
      className="flex-grow overflow-y-auto p-3 sm:p-4 md:p-6 pb-0 bg-[var(--theme-bg-secondary)] custom-scrollbar"
      aria-live="polite" 
    >
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-full w-full max-w-4xl mx-auto px-4 pb-24">
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
        messages.map((msg: ChatMessage, index: number) => (
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
            baseFontSize={baseFontSize}
            onTextToSpeech={onTextToSpeech}
            ttsMessageId={ttsMessageId}
            t={t}
          />
        ))
      )}
      <div ref={messagesEndRef} />
    </div>
    {zoomedFile && (
      <ImageZoomModal 
        file={zoomedFile} 
        onClose={closeImageZoomModal}
        themeColors={themeColors}
        t={t}
      />
    )}
    {isHtmlPreviewModalOpen && htmlToPreview !== null && (
      <HtmlPreviewModal
        isOpen={isHtmlPreviewModalOpen}
        onClose={handleCloseHtmlPreview}
        htmlContent={htmlToPreview}
        themeColors={themeColors}
        initialTrueFullscreenRequest={initialTrueFullscreenRequest}
      />
    )}
    </>
  );
};