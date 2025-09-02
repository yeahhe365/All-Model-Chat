import React, { useState, useCallback, useRef, useEffect } from 'react';
import { UploadedFile } from '../../types';
import { X, ZoomIn, ZoomOut, RotateCw, Download, Loader2, ClipboardCopy, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { translations, getResponsiveValue } from '../../utils/appUtils';
import { Modal } from './Modal';

interface ImageZoomModalProps {
  files: UploadedFile[] | null;
  initialIndex?: number;
  onClose: () => void;
  t: (key: keyof typeof translations, fallback?: string) => string;
}

export const ImageZoomModal: React.FC<ImageZoomModalProps> = ({ files, initialIndex = 0, onClose, t }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const MIN_SCALE = 0.2;
  const MAX_SCALE = 10;
  const ZOOM_SPEED_FACTOR = 1.1;

  const handleReset = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (files) {
      setCurrentIndex(initialIndex ?? 0);
      handleReset();
    }
  }, [files, initialIndex, handleReset]);

  const currentFile = files ? files[currentIndex] : null;

  const handleNext = useCallback(() => {
    if (files && currentIndex < files.length - 1) {
        setCurrentIndex(prev => prev + 1);
        handleReset();
    }
  }, [currentIndex, files, handleReset]);

  const handlePrevious = useCallback(() => {
      if (files && currentIndex > 0) {
          setCurrentIndex(prev => prev - 1);
          handleReset();
      }
  }, [currentIndex, files, handleReset]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'ArrowRight') handleNext();
        if (e.key === 'ArrowLeft') handlePrevious();
    };
    if (files) {
        window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [files, handleNext, handlePrevious]);

  useEffect(() => {
    if (currentFile) {
      setIsDownloading(false);
      setIsCopied(false);
    }
  }, [currentFile]);

  const handleZoom = useCallback((direction: 'in' | 'out') => {
    if (!viewportRef.current || !imageRef.current || !currentFile) return;

    const rect = viewportRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const newScale = direction === 'in'
      ? Math.min(MAX_SCALE, scale * 1.5)
      : Math.max(MIN_SCALE, scale / 1.5);
      
    if (newScale === scale) return;

    const imageOffsetX = imageRef.current.offsetLeft;
    const imageOffsetY = imageRef.current.offsetTop;
    const ratio = newScale / scale;
    const newPositionX = (centerX - imageOffsetX) * (1 - ratio) + position.x * ratio;
    const newPositionY = (centerY - imageOffsetY) * (1 - ratio) + position.y * ratio;

    setPosition({ x: newPositionX, y: newPositionY });
    setScale(newScale);
  }, [scale, position, currentFile]);

  const handleCopy = useCallback(async () => {
    if (!currentFile?.dataUrl || isCopied) return;
    try {
        const response = await fetch(currentFile.dataUrl);
        const blob = await response.blob();
        if (!navigator.clipboard || !navigator.clipboard.write) {
            throw new Error("Clipboard API not available.");
        }
        await navigator.clipboard.write([
            new ClipboardItem({
                [blob.type]: blob
            })
        ]);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
        console.error('Failed to copy image:', err);
        alert('Failed to copy image to clipboard. Your browser might not support this feature or require permissions.');
    }
  }, [currentFile, isCopied]);

  const handleDownload = useCallback(() => {
    if (!currentFile?.dataUrl || isDownloading) return;
    setIsDownloading(true);
    try {
      const link = document.createElement('a');
      link.href = currentFile.dataUrl;
      link.download = currentFile.name || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Download failed:", err);
      alert('Download failed. See console for details.');
    } finally {
      setIsDownloading(false);
    }
  }, [currentFile, isDownloading]);

  const handleWheel = useCallback((event: WheelEvent) => {
    if (!viewportRef.current || !imageRef.current || !currentFile) return;
    event.preventDefault();

    const rect = viewportRef.current.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const newScale = event.deltaY < 0
      ? Math.min(MAX_SCALE, scale * ZOOM_SPEED_FACTOR)
      : Math.max(MIN_SCALE, scale / ZOOM_SPEED_FACTOR);

    if (newScale === scale) return;

    const imageOffsetX = imageRef.current.offsetLeft;
    const imageOffsetY = imageRef.current.offsetTop;
    const ratio = newScale / scale;
    const newPositionX = (mouseX - imageOffsetX) * (1 - ratio) + position.x * ratio;
    const newPositionY = (mouseY - imageOffsetY) * (1 - ratio) + position.y * ratio;

    setPosition({ x: newPositionX, y: newPositionY });
    setScale(newScale);
  }, [scale, position, currentFile]);

  const handleMouseDown = (event: React.MouseEvent<HTMLImageElement>) => {
    if (!currentFile || event.button !== 0) return; 
    event.preventDefault();
    setIsDragging(true);
    setDragStart({ 
      x: event.clientX - position.x, 
      y: event.clientY - position.y 
    });
    if (imageRef.current) imageRef.current.style.cursor = 'grabbing';
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !currentFile) return;
    event.preventDefault();
    setPosition({
      x: event.clientX - dragStart.x,
      y: event.clientY - dragStart.y,
    });
  };

  const handleMouseUp = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!currentFile) return;
    event.preventDefault();
    setIsDragging(false);
    if (imageRef.current) imageRef.current.style.cursor = 'grab';
  };
  
  const handleMouseLeave = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) { 
        handleMouseUp(event);
    }
  };

  useEffect(() => {
    const vpRef = viewportRef.current;
    if (vpRef && currentFile) {
      vpRef.addEventListener('wheel', handleWheel, { passive: false });
    }
    return () => {
      if (vpRef && currentFile) {
        vpRef.removeEventListener('wheel', handleWheel);
      }
    };
  }, [handleWheel, currentFile]);

  if (!currentFile) return null;

  const isSvgDiagram = currentFile.type === 'image/svg+xml';
  const controlButtonClasses = "p-2 bg-black/50 hover:bg-black/70 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm";

  return (
    <Modal
      isOpen={!!currentFile}
      onClose={onClose}
      noPadding
      backdropClassName="bg-black/80 backdrop-blur-sm"
      contentClassName="w-full h-full"
    >
      <div 
        className="w-full h-full"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave} 
      >
        <h2 id="image-zoom-modal-title" className="sr-only">{t('imageZoom_title').replace('{filename}', currentFile.name)}</h2>
        <div 
            ref={viewportRef} 
            className="w-full h-full flex items-center justify-center overflow-hidden relative"
        >
          <img
            key={currentFile.id}
            ref={imageRef}
            src={currentFile.dataUrl}
            alt={`Zoomed view of ${currentFile.name}`}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: '0 0', 
              transition: isDragging ? 'none' : 'transform 0.05s ease-out',
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              cursor: isDragging ? 'grabbing' : 'grab',
              userSelect: 'none', 
              backgroundColor: isSvgDiagram ? 'white' : 'transparent',
              borderRadius: isSvgDiagram ? '0.375rem' : '0',
            }}
            onMouseDown={handleMouseDown}
            draggable="false" 
          />
        </div>

        {files && files.length > 1 && (
            <>
                <button
                    onClick={handlePrevious}
                    disabled={currentIndex === 0}
                    className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                    aria-label="Previous image"
                >
                    <ChevronLeft size={getResponsiveValue(24, 32)} />
                </button>
                <button
                    onClick={handleNext}
                    disabled={currentIndex === files.length - 1}
                    className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                    aria-label="Next image"
                >
                    <ChevronRight size={getResponsiveValue(24, 32)} />
                </button>
            </>
        )}

        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1.5 sm:p-2 bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-bg-input)] text-[var(--theme-text-primary)] rounded-full shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)]"
          aria-label={t('imageZoom_close_aria')}
          title={t('imageZoom_close_title')}
        >
          <X size={getResponsiveValue(20, 24)} />
        </button>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-black/40 rounded-lg shadow-lg backdrop-blur-sm border border-white/10" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => handleZoom('out')} disabled={scale <= MIN_SCALE} className={controlButtonClasses} title="Zoom Out"><ZoomOut size={18} /></button>
          <div className="text-xs text-white font-mono tabular-nums select-none w-16 text-center">
            {(scale * 100).toFixed(0)}%
          </div>
          <button onClick={() => handleZoom('in')} disabled={scale >= MAX_SCALE} className={controlButtonClasses} title="Zoom In"><ZoomIn size={18} /></button>
          
          <div className="w-px h-6 bg-white/20 mx-1"></div>

          <button onClick={handleReset} className={controlButtonClasses} title="Reset View"><RotateCw size={18} /></button>

          <button onClick={handleCopy} disabled={isCopied} className={controlButtonClasses} title={isCopied ? "Copied!" : "Copy Image"}>
              {isCopied ? <Check size={18} className="text-green-400" /> : <ClipboardCopy size={18} />}
          </button>
          
          <div className="w-px h-6 bg-white/20 mx-1"></div>
          
          <button onClick={handleDownload} disabled={isDownloading} className={controlButtonClasses} title={t('imageZoom_download_original', 'Download Original File')}>
            {isDownloading ? <Loader2 size={18} className="animate-spin"/> : <Download size={18} />}
          </button>
        </div>
      </div>
    </Modal>
  );
};
