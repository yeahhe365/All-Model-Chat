
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { UploadedFile } from '../../../types';

interface ImageViewerProps {
    file: UploadedFile;
    t: (key: string) => string;
}

const MIN_SCALE = 0.2;
const MAX_SCALE = 10;
const ZOOM_SPEED_FACTOR = 1.1;

export const ImageViewer: React.FC<ImageViewerProps> = ({ file, t }) => {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    
    const imageRef = useRef<HTMLImageElement>(null);
    const viewportRef = useRef<HTMLDivElement>(null);

    // Reset view when file changes
    useEffect(() => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    }, [file.id]);

    const handleZoom = useCallback((direction: 'in' | 'out') => {
        if (!viewportRef.current || !imageRef.current) return;

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
    }, [scale, position]);

    const handleReset = useCallback(() => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    }, []);

    const handleWheel = useCallback((event: WheelEvent) => {
        if (!viewportRef.current || !imageRef.current) return;
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
    }, [scale, position]);

    const handleMouseDown = (event: React.MouseEvent<HTMLImageElement>) => {
        if (event.button !== 0) return; 
        event.preventDefault();
        setIsDragging(true);
        setDragStart({ 
            x: event.clientX - position.x, 
            y: event.clientY - position.y 
        });
    };

    const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
        if (!isDragging) return;
        event.preventDefault();
        setPosition({
            x: event.clientX - dragStart.x,
            y: event.clientY - dragStart.y,
        });
    };

    const handleMouseUp = (event: React.MouseEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragging(false);
    };

    useEffect(() => {
        const vpRef = viewportRef.current;
        if (vpRef) {
            vpRef.addEventListener('wheel', handleWheel, { passive: false });
        }
        return () => {
            if (vpRef) {
                vpRef.removeEventListener('wheel', handleWheel);
            }
        };
    }, [handleWheel]);

    const isMermaidDiagram = file.type === 'image/svg+xml';
    const floatingBarBase = "bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl transition-all duration-200";
    const pillButtonClass = "p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-40 disabled:cursor-not-allowed";

    return (
        <div 
            className="w-full h-full relative flex flex-col select-none"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp} 
        >
            <div ref={viewportRef} className="flex-grow w-full h-full flex items-center justify-center overflow-hidden relative">
                <img
                    ref={imageRef}
                    src={file.dataUrl}
                    alt={`Zoomed view of ${file.name}`}
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        transformOrigin: '0 0', 
                        transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                        cursor: isDragging ? 'grabbing' : 'grab',
                        userSelect: 'none', 
                        backgroundColor: isMermaidDiagram ? 'white' : 'transparent',
                        borderRadius: isMermaidDiagram ? '4px' : '0',
                        boxShadow: isMermaidDiagram ? '0 0 0 1px rgba(255,255,255,0.1)' : 'none',
                    }}
                    onMouseDown={handleMouseDown}
                    onDoubleClick={handleReset}
                    draggable="false" 
                />
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
                <div className={`${floatingBarBase} rounded-full p-1.5 flex items-center gap-1`}>
                    <button onClick={() => handleZoom('out')} disabled={scale <= MIN_SCALE} className={pillButtonClass} title="Zoom Out">
                        <ZoomOut size={16} strokeWidth={1.5} />
                    </button>
                    
                    <div className="min-w-[50px] text-center px-2 font-mono text-xs font-medium text-white/90">
                        {(scale * 100).toFixed(0)}%
                    </div>

                    <button onClick={() => handleZoom('in')} disabled={scale >= MAX_SCALE} className={pillButtonClass} title="Zoom In">
                        <ZoomIn size={16} strokeWidth={1.5} />
                    </button>

                    <div className="w-px h-5 bg-white/10 mx-1"></div>

                    <button onClick={handleReset} className={pillButtonClass} title="Reset View">
                        <RotateCw size={16} strokeWidth={1.5} />
                    </button>
                </div>
            </div>
        </div>
    );
};
