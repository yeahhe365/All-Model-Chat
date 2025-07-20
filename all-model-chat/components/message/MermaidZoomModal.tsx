import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ThemeColors } from '../../types';
import { X } from 'lucide-react';
import { translations, getResponsiveValue } from '../../utils/appUtils';
import { Modal } from '../shared/Modal';

interface MermaidZoomModalProps {
  svgContent: string | null;
  onClose: () => void;
  themeColors: ThemeColors;
  t: (key: keyof typeof translations) => string;
}

export const MermaidZoomModal: React.FC<MermaidZoomModalProps> = ({ svgContent, onClose, t }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const MIN_SCALE = 0.1;
  const MAX_SCALE = 20;
  const ZOOM_SPEED_FACTOR = 1.1;

  useEffect(() => {
    if (svgContent) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [svgContent]);

  const handleWheel = useCallback((event: WheelEvent) => {
    if (!viewportRef.current || !svgContainerRef.current || !svgContent) return;
    event.preventDefault();

    const rect = viewportRef.current.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const newScale = event.deltaY < 0
      ? Math.min(MAX_SCALE, scale * ZOOM_SPEED_FACTOR)
      : Math.max(MIN_SCALE, scale / ZOOM_SPEED_FACTOR);

    if (newScale === scale) return;

    const svgOffsetX = svgContainerRef.current.offsetLeft;
    const svgOffsetY = svgContainerRef.current.offsetTop;
    const ratio = newScale / scale;
    const newPositionX = (mouseX - svgOffsetX) * (1 - ratio) + position.x * ratio;
    const newPositionY = (mouseY - svgOffsetY) * (1 - ratio) + position.y * ratio;

    setPosition({ x: newPositionX, y: newPositionY });
    setScale(newScale);
  }, [scale, position, svgContent]);

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!svgContent || event.button !== 0) return; 
    event.preventDefault();
    setIsDragging(true);
    setDragStart({ 
      x: event.clientX - position.x, 
      y: event.clientY - position.y 
    });
    if (svgContainerRef.current) svgContainerRef.current.style.cursor = 'grabbing';
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !svgContent) return;
    event.preventDefault();
    setPosition({
      x: event.clientX - dragStart.x,
      y: event.clientY - dragStart.y,
    });
  };

  const handleMouseUp = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!svgContent) return;
    event.preventDefault();
    setIsDragging(false);
    if (svgContainerRef.current) svgContainerRef.current.style.cursor = 'grab';
  };
  
  const handleMouseLeave = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) { 
        handleMouseUp(event);
    }
  };

  useEffect(() => {
    const vpRef = viewportRef.current;
    if (vpRef && svgContent) {
      vpRef.addEventListener('wheel', handleWheel, { passive: false });
    }
    return () => {
      if (vpRef && svgContent) {
        vpRef.removeEventListener('wheel', handleWheel);
      }
    };
  }, [handleWheel, svgContent]);

  if (!svgContent) return null;

  return (
    <Modal
      isOpen={!!svgContent}
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
        <h2 id="mermaid-zoom-modal-title" className="sr-only">Zoomed Mermaid Diagram</h2>
        <div 
            ref={viewportRef} 
            className="w-full h-full flex items-center justify-center overflow-hidden relative p-8 bg-white"
        >
          <div
            ref={svgContainerRef}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: '0 0', 
              transition: isDragging ? 'none' : 'transform 0.05s ease-out',
              cursor: isDragging ? 'grabbing' : 'grab',
              userSelect: 'none', 
            }}
            onMouseDown={handleMouseDown}
            dangerouslySetInnerHTML={{ __html: svgContent }}
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
            Mermaid Diagram ({(scale * 100).toFixed(0)}%)
        </div>
      </div>
    </Modal>
  );
};
