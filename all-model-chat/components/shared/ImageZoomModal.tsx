import React, { useState, useCallback, useRef } from 'react';
import { UploadedFile, ThemeColors } from '../../types';
import { X } from 'lucide-react';
import { translations, getResponsiveValue } from '../../utils/appUtils';
import { Modal } from './Modal';

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

  if (!file) return null;

  const isMermaidDiagram = file.type === 'image/svg+xml';

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
          <X size={getResponsiveValue(20, 24)} />
        </button>
         <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)] px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg shadow-lg text-xs select-none">
            {file.name} ({(scale * 100).toFixed(0)}%)
        </div>
      </div>
    </Modal>
  );
};