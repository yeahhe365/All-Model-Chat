import React, { useState, useCallback, useRef } from 'react';
import { ChatMessage, MessageListProps, UploadedFile, ThemeColors } from '../types';
import { HtmlPreviewModal } from './HtmlPreviewModal';
import { Message } from './message/Message';
import { X, Bot } from 'lucide-react';

interface ImageZoomModalProps {
  file: UploadedFile | null;
  onClose: () => void;
  themeColors: ThemeColors;
}

const ImageZoomModal: React.FC<ImageZoomModalProps> = ({ file, onClose, themeColors }) => {
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
    if (!viewportRef.current || !file) return;
    event.preventDefault();

    const rect = viewportRef.current.getBoundingClientRect();
    const mouseX = event.clientX - rect.left; 
    const mouseY = event.clientY - rect.top; 

    const newScale = event.deltaY < 0 
      ? Math.min(MAX_SCALE, scale * ZOOM_SPEED_FACTOR) 
      : Math.max(MIN_SCALE, scale / ZOOM_SPEED_FACTOR);
    
    if (newScale === scale) return; 

    const newPositionX = mouseX - (mouseX - position.x) * (newScale / scale);
    const newPositionY = mouseY - (mouseY - position.y) * (newScale / scale);
    
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
        <h2 id="image-zoom-modal-title" className="sr-only">Zoomed Image: {file.name}</h2>
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
          aria-label="Close image zoom view"
          title="Close (Esc)"
        >
          <X size={window.innerWidth < 640 ? 20 : 24} />
        </button>
         <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)] px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg shadow-lg text-xs select-none">
            {file.name} ({(scale * 100).toFixed(0)}%)
        </div>
    </div>
  );
};


export const MessageList: React.FC<MessageListProps> = ({ 
    messages, messagesEndRef, scrollContainerRef, onScrollContainerScroll, 
    onEditMessage, onDeleteMessage, onRetryMessage, showThoughts, themeColors, baseFontSize,
    onSuggestionClick
}) => {
  const [zoomedFile, setZoomedFile] = useState<UploadedFile | null>(null);
  
  const [isHtmlPreviewModalOpen, setIsHtmlPreviewModalOpen] = useState(false);
  const [htmlToPreview, setHtmlToPreview] = useState<string | null>(null);
  const [initialTrueFullscreenRequest, setInitialTrueFullscreenRequest] = useState(false);
  
  const handleImageClick = (file: UploadedFile) => {
    setZoomedFile(file);
  };

  const closeImageZoomModal = () => {
    setZoomedFile(null);
  };

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
      className="flex-grow overflow-y-auto p-3 sm:p-4 md:p-6 bg-[var(--theme-bg-secondary)] custom-scrollbar"
      aria-live="polite" 
    >
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center text-[var(--theme-text-tertiary)] p-4">
          <div className="max-w-sm mx-auto welcome-message-animate">
              <Bot size={48} className="mx-auto mb-4 opacity-40 text-[var(--theme-text-link)]" />
              <h2 className="text-xl font-semibold text-[var(--theme-text-primary)] mb-1">Welcome to All Model Chat</h2>
              <p className="text-sm px-2">
                  Start a conversation by typing below. You can also attach files, load scenarios via the <span className="font-semibold text-[var(--theme-text-secondary)]">Manage Scenarios</span> button, or configure settings.
              </p>
          </div>
        </div>
      ) : (
        messages.map((msg: ChatMessage, index: number) => (
          <Message
            key={msg.id}
            message={msg}
            messages={messages}
            messageIndex={index}
            onEditMessage={onEditMessage}
            onDeleteMessage={onDeleteMessage}
            onRetryMessage={onRetryMessage}
            onImageClick={handleImageClick}
            onOpenHtmlPreview={handleOpenHtmlPreview}
            showThoughts={showThoughts}
            themeColors={themeColors}
            baseFontSize={baseFontSize}
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