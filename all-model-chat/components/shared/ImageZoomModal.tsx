
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { UploadedFile, ThemeColors } from '../../types';
import { X, ZoomIn, ZoomOut, RotateCw, ImageIcon, FileCode2, Loader2, ClipboardCopy, Check, Download, FileText, FileVideo, FileAudio, ExternalLink } from 'lucide-react';
import { translations } from '../../utils/appUtils';
import { Modal } from './Modal';
import { useResponsiveValue } from '../../hooks/useDevice';
import { triggerDownload } from '../../utils/exportUtils';
import { SUPPORTED_IMAGE_MIME_TYPES } from '../../constants/fileConstants';

interface FilePreviewModalProps {
  file: UploadedFile | null;
  onClose: () => void;
  themeColors: ThemeColors;
  t: (key: keyof typeof translations) => string;
}

const formatFileSize = (sizeInBytes: number): string => {
  if (sizeInBytes < 1024) return `${sizeInBytes} B`;
  const sizeInKb = sizeInBytes / 1024;
  if (sizeInKb < 1024) return `${sizeInKb.toFixed(1)} KB`;
  const sizeInMb = sizeInKb / 1024;
  return `${sizeInMb.toFixed(2)} MB`;
};

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, onClose, t }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isLoadingText, setIsLoadingText] = useState(false);
  
  const imageRef = useRef<HTMLImageElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const MIN_SCALE = 0.2;
  const MAX_SCALE = 10;
  const ZOOM_SPEED_FACTOR = 1.1;

  const isImage = file && SUPPORTED_IMAGE_MIME_TYPES.includes(file.type);
  const isPdf = file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
  const isVideo = file?.type.startsWith('video/');
  const isAudio = file?.type.startsWith('audio/');
  const isText = file && (file.type.startsWith('text/') || file.type === 'application/json' || file.type.includes('javascript') || file.type.includes('xml'));

  useEffect(() => {
    if (file) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setIsDownloading(false);
      setIsCopied(false);
      setTextContent(null);
      
      if (isText && file.dataUrl) {
          setIsLoadingText(true);
          fetch(file.dataUrl)
            .then(res => res.text())
            .then(text => {
                setTextContent(text);
                setIsLoadingText(false);
            })
            .catch(err => {
                console.error("Failed to load text content", err);
                setTextContent("Failed to load file content.");
                setIsLoadingText(false);
            });
      }
    }
  }, [file, isText]);

  const handleZoom = useCallback((direction: 'in' | 'out') => {
    if (!viewportRef.current || !imageRef.current || !file || !isImage) return;

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
  }, [scale, position, file, isImage]);

  const handleReset = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleCopy = useCallback(async () => {
    if (!file?.dataUrl || isCopied) return;
    try {
        if (textContent) {
            await navigator.clipboard.writeText(textContent);
        } else {
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
        }
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
        console.error('Failed to copy content:', err);
        alert('Failed to copy to clipboard. Your browser might not support this feature or require permissions.');
    }
  }, [file, isCopied, textContent]);

  const handleDownload = useCallback(async (format: 'png' | 'svg') => {
    if (!file?.dataUrl || isDownloading) return;
    
    if (format === 'svg' && file.type === 'image/svg+xml') {
        setIsDownloading(true);
        try {
            const base64Content = file.dataUrl.split(',')[1];
            const svgContent = decodeURIComponent(escape(atob(base64Content)));
            const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const filename = `${file.name.split('.')[0] || 'diagram'}.svg`;
            triggerDownload(url, filename, true);
        } catch (e) {
            console.error("Failed to download SVG:", e);
        } finally {
            setIsDownloading(false);
        }
        return;
    }

    setIsDownloading(true);
    try {
      triggerDownload(file.dataUrl, file.name, false);
    } catch (e) {
      console.error("Failed to initiate download:", e);
    } finally {
      setIsDownloading(false);
    }
  }, [file, isDownloading]);

  const handleWheel = useCallback((event: WheelEvent) => {
    if (!viewportRef.current || !imageRef.current || !file || !isImage) return;
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
  }, [scale, position, file, isImage]);

  const handleMouseDown = (event: React.MouseEvent<HTMLImageElement>) => {
    if (!file || !isImage || event.button !== 0) return; 
    event.preventDefault();
    setIsDragging(true);
    setDragStart({ 
      x: event.clientX - position.x, 
      y: event.clientY - position.y 
    });
    if (imageRef.current) imageRef.current.style.cursor = 'grabbing';
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !file || !isImage) return;
    event.preventDefault();
    setPosition({
      x: event.clientX - dragStart.x,
      y: event.clientY - dragStart.y,
    });
  };

  const handleMouseUp = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!file || !isImage) return;
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
    if (vpRef && file && isImage) {
      vpRef.addEventListener('wheel', handleWheel, { passive: false });
    }
    return () => {
      if (vpRef && file && isImage) {
        vpRef.removeEventListener('wheel', handleWheel);
      }
    };
  }, [handleWheel, file, isImage]);

  if (!file) return null;

  const isMermaidDiagram = file.type === 'image/svg+xml';
  
  const floatingBarBase = "bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl transition-all duration-200";
  const actionButtonClass = "p-2.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-40 disabled:cursor-not-allowed";
  const pillButtonClass = "p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-40 disabled:cursor-not-allowed";

  const FileIcon = isImage ? ImageIcon : isPdf ? FileText : isVideo ? FileVideo : isAudio ? FileAudio : FileCode2;

  return (
    <Modal
      isOpen={!!file}
      onClose={onClose}
      noPadding
      backdropClassName="bg-black/95 backdrop-blur-sm"
      contentClassName="w-full h-full"
    >
      <div 
        className={`w-full h-full relative flex flex-col ${isText ? '' : 'select-none'}`}
        onMouseMove={isImage ? handleMouseMove : undefined}
        onMouseUp={isImage ? handleMouseUp : undefined}
        onMouseLeave={isImage ? handleMouseLeave : undefined} 
      >
        <h2 id="file-preview-modal-title" className="sr-only">{t('imageZoom_title').replace('{filename}', file.name)}</h2>
        
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 p-4 sm:p-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4 z-50 pointer-events-none">
            {/* File Info */}
            <div className={`pointer-events-auto ${floatingBarBase} rounded-2xl px-4 py-2.5 flex items-center gap-3 max-w-[80%] sm:max-w-md`}>
                <div className="bg-white/10 p-1.5 rounded-lg text-white">
                    <FileIcon size={18} strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex flex-col">
                    <span className="text-sm font-medium text-white truncate" title={file.name}>{file.name}</span>
                    <span className="text-[10px] font-mono text-white/60 tracking-wide">
                        {file.type.split('/').pop()?.toUpperCase()} • {formatFileSize(file.size)}
                    </span>
                </div>
            </div>

            {/* Top Actions */}
            <div className={`pointer-events-auto ${floatingBarBase} rounded-full p-1 flex items-center gap-1 self-end sm:self-auto`}>
                <button onClick={handleCopy} disabled={isCopied} className={actionButtonClass} title={isCopied ? "Copied!" : "Copy Content"}>
                    {isCopied ? <Check size={20} className="text-green-400" strokeWidth={2} /> : <ClipboardCopy size={20} strokeWidth={1.5} />}
                </button>
                <button onClick={() => handleDownload(isMermaidDiagram ? 'svg' : 'png')} disabled={isDownloading} className={actionButtonClass} title={isMermaidDiagram ? "Download SVG" : "Download File"}>
                    {isDownloading ? <Loader2 size={20} className="animate-spin" strokeWidth={1.5}/> : <Download size={20} strokeWidth={1.5} />}
                </button>
                <div className="w-px h-5 bg-white/10 mx-1"></div>
                <button
                    onClick={onClose}
                    className={`${actionButtonClass} hover:bg-red-500/20 hover:text-red-400`}
                    aria-label={t('imageZoom_close_aria')}
                    title={t('imageZoom_close_title')}
                >
                    <X size={20} strokeWidth={1.5} />
                </button>
            </div>
        </div>

        {/* Main Viewport */}
        <div ref={viewportRef} className="flex-grow w-full h-full flex items-center justify-center overflow-hidden relative">
          {isImage ? (
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
          ) : isText ? (
              <div className="w-full h-full p-4 sm:p-8 pt-24 pb-24 overflow-auto custom-scrollbar select-text cursor-text">
                  <div className="max-w-4xl mx-auto bg-white/5 rounded-lg p-6 backdrop-blur-md border border-white/10 shadow-xl min-h-[50vh]">
                      {isLoadingText ? (
                          <div className="flex items-center justify-center h-40 text-white/50">
                              <Loader2 className="animate-spin mr-2" /> Loading content...
                          </div>
                      ) : (
                          <pre className="text-sm font-mono text-white/90 whitespace-pre-wrap break-all">
                              {textContent}
                          </pre>
                      )}
                  </div>
              </div>
          ) : isPdf ? (
              <div className="w-full h-full pt-20 pb-20 px-4 sm:px-8 relative group/pdf">
                  <iframe
                      src={file.dataUrl}
                      className="w-full h-full rounded-lg shadow-2xl bg-white"
                      title={`PDF: ${file.name}`}
                  />
                  <a 
                      href={file.dataUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 hover:bg-black/80 text-white text-sm rounded-full backdrop-blur-md transition-opacity opacity-0 group-hover/pdf:opacity-100 flex items-center gap-2 pointer-events-auto"
                  >
                      <ExternalLink size={14} />
                      Open in New Tab
                  </a>
              </div>
          ) : isVideo ? (
              <video 
                  src={file.dataUrl} 
                  controls 
                  className="max-w-[90%] max-h-[80%] rounded-lg shadow-2xl outline-none"
                  playsInline
              />
          ) : isAudio ? (
              <div className="bg-white/10 p-8 rounded-2xl backdrop-blur-xl border border-white/10 shadow-2xl flex flex-col items-center gap-4">
                  <FileAudio size={64} className="text-white/50" />
                  <audio 
                      src={file.dataUrl} 
                      controls 
                      className="w-[300px] sm:w-[400px]"
                  />
              </div>
          ) : (
              <div className="text-white/50 flex flex-col items-center gap-2">
                  <FileCode2 size={48} />
                  <p>Preview not available for this file type.</p>
              </div>
          )}
        </div>

        {/* Bottom Controls (Image Only) */}
        {isImage && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
                <div className={`${floatingBarBase} rounded-full p-1.5 flex items-center gap-1`}>
                    <button onClick={() => handleZoom('out')} disabled={scale <= MIN_SCALE} className={pillButtonClass} title="Zoom Out">
                        <ZoomOut size={20} strokeWidth={1.5} />
                    </button>
                    
                    <div className="min-w-[60px] text-center px-2 font-mono text-sm font-medium text-white/90">
                        {(scale * 100).toFixed(0)}%
                    </div>

                    <button onClick={() => handleZoom('in')} disabled={scale >= MAX_SCALE} className={pillButtonClass} title="Zoom In">
                        <ZoomIn size={20} strokeWidth={1.5} />
                    </button>

                    <div className="w-px h-5 bg-white/10 mx-1"></div>

                    <button onClick={handleReset} className={pillButtonClass} title="Reset View">
                        <RotateCw size={20} strokeWidth={1.5} />
                    </button>
                </div>
            </div>
        )}
      </div>
    </Modal>
  );
};
