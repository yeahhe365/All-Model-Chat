import React, { useState, useCallback, useRef, useEffect } from 'react';
import { UploadedFile, ThemeColors } from '../../types';
import { X, ZoomIn, ZoomOut, RotateCw, ImageIcon, FileCode2, Loader2, ClipboardCopy, Check } from 'lucide-react';
import { translations } from '../../utils/appUtils';
import { Modal } from './Modal';
import { useResponsiveValue } from '../../hooks/useDevice';

interface ImageZoomModalProps {
  file: UploadedFile | null;
  onClose: () => void;
  themeColors: ThemeColors;
  t: (key: keyof typeof translations) => string;
}

export const ImageZoomModal: React.FC<ImageZoomModalProps> = ({ file, onClose, t }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const closeIconSize = useResponsiveValue(20, 24);

  const MIN_SCALE = 0.2;
  const MAX_SCALE = 10;
  const ZOOM_SPEED_FACTOR = 1.1;

  useEffect(() => {
    if (file) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setIsDownloading(false);
      setIsCopied(false);
    }
  }, [file]);

  const handleZoom = useCallback((direction: 'in' | 'out') => {
    if (!viewportRef.current || !imageRef.current || !file) return;

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
  }, [scale, position, file]);

  const handleReset = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleCopy = useCallback(async () => {
    if (!file?.dataUrl || isCopied) return;
    try {
        const response = await fetch(file.dataUrl);
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
  }, [file, isCopied]);

  const handleDownload = useCallback(async (format: 'png' | 'svg') => {
    if (!file?.dataUrl || isDownloading) return;
    
    if (format === 'svg' && file.type === 'image/svg+xml') {
        setIsDownloading(true);
        try {
            const base64Content = file.dataUrl.split(',')[1];
            // This is the correct way to decode base64 that might contain UTF-8 characters
            const svgContent = decodeURIComponent(escape(atob(base64Content)));
            const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${file.name.split('.')[0] || 'diagram'}.svg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error("Failed to download SVG:", e);
        } finally {
            setIsDownloading(false);
        }
        return;
    }

    // Direct download for all other image types to preserve original size and format
    setIsDownloading(true);
    try {
      const link = document.createElement('a');
      link.href = file.dataUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Failed to initiate download:", e);
    } finally {
      setIsDownloading(false);
    }
  }, [file, isDownloading]);

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

    const imageOffsetX = imageRef.current.offsetLeft;
    const imageOffsetY = imageRef.current.offsetTop;
    const ratio = newScale / scale;
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

  useEffect(() => {
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

  if (!file) return null;

  const isMermaidDiagram = file.type === 'image/svg+xml';
  const controlButtonClasses = "p-2 bg-black/50 hover:bg-black/70 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm";

  return (
    <Modal
      isOpen={!!file}
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
              backgroundColor: isMermaidDiagram ? 'white' : 'transparent',
              borderRadius: isMermaidDiagram ? '0.375rem' : '0',
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
          <X size={closeIconSize} strokeWidth={1.5} />
        </button>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-black/40 rounded-lg shadow-lg backdrop-blur-sm border border-white/10" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => handleZoom('out')} disabled={scale <= MIN_SCALE} className={controlButtonClasses} title="Zoom Out"><ZoomOut size={18} strokeWidth={1.5} /></button>
          <div className="text-xs text-white font-mono tabular-nums select-none w-16 text-center">
            {(scale * 100).toFixed(0)}%
          </div>
          <button onClick={() => handleZoom('in')} disabled={scale >= MAX_SCALE} className={controlButtonClasses} title="Zoom In"><ZoomIn size={18} strokeWidth={1.5} /></button>
          
          <div className="w-px h-6 bg-white/20 mx-1"></div>

          <button onClick={handleReset} className={controlButtonClasses} title="Reset View"><RotateCw size={18} strokeWidth={1.5} /></button>

          <button onClick={handleCopy} disabled={isCopied} className={controlButtonClasses} title={isCopied ? "Copied!" : "Copy Image"}>
              {isCopied ? <Check size={18} className="text-green-400" strokeWidth={1.5} /> : <ClipboardCopy size={18} strokeWidth={1.5} />}
          </button>
          
          <div className="w-px h-6 bg-white/20 mx-1"></div>
          
          <button onClick={() => handleDownload('png')} disabled={isDownloading} className={controlButtonClasses} title="Download Image">
            {isDownloading ? <Loader2 size={18} className="animate-spin" strokeWidth={1.5}/> : <ImageIcon size={18} strokeWidth={1.5} />}
          </button>
          
          {isMermaidDiagram && (
            <button onClick={() => handleDownload('svg')} disabled={isDownloading} className={controlButtonClasses} title="Download as SVG">
                {isDownloading ? <Loader2 size={18} className="animate-spin" strokeWidth={1.5}/> : <FileCode2 size={18} strokeWidth={1.5} />}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};