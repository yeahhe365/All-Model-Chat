
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Download, Minimize, X, ZoomIn, ZoomOut, RotateCw, Image as ImageIcon, Expand, Atom } from 'lucide-react';
import { sanitizeFilename, exportElementAsPng, triggerDownload } from '../../utils/exportUtils';
import { useWindowContext } from '../../contexts/WindowContext';
import { IconHtml5 } from '../icons/CustomIcons';

interface HtmlPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  htmlContent: string | null;
  initialTrueFullscreenRequest?: boolean;
}

const ZOOM_STEP = 0.1;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3.0;

export const HtmlPreviewModal: React.FC<HtmlPreviewModalProps> = ({
  isOpen,
  onClose,
  htmlContent,
  initialTrueFullscreenRequest,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isTrueFullscreen, setIsTrueFullscreen] = useState(false);
  const [isActuallyOpen, setIsActuallyOpen] = useState(isOpen);
  const [scale, setScale] = useState(1);
  const [isScreenshotting, setIsScreenshotting] = useState(false);
  
  // Track if we are in the process of a direct launch to prevent UI flash
  const [isDirectFullscreenLaunch, setIsDirectFullscreenLaunch] = useState(initialTrueFullscreenRequest);
  
  const { document: targetDocument } = useWindowContext();

  const handleZoomIn = () => setScale(s => Math.min(MAX_ZOOM, s + ZOOM_STEP));
  const handleZoomOut = () => setScale(s => Math.max(MIN_ZOOM, s - ZOOM_STEP));

  const enterTrueFullscreen = useCallback(async () => {
    const element = iframeRef.current;
    if (!element) return;

    try {
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if ((element as any).webkitRequestFullscreen) { // Safari
        (element as any).webkitRequestFullscreen();
      }
    } catch (err) {
      console.error("Error attempting to enable full-screen mode:", err);
      // If fullscreen fails, show the modal UI so the user isn't stuck with an invisible overlay
      setIsDirectFullscreenLaunch(false);
    }
  }, []);

  const exitTrueFullscreen = useCallback(async () => {
    if (targetDocument.fullscreenElement || (targetDocument as any).webkitFullscreenElement) {
        if (targetDocument.exitFullscreen) {
            try {
                await targetDocument.exitFullscreen();
            } catch (err) {
                console.error("Error attempting to disable full-screen mode:", err);
            }
        } else if ((targetDocument as any).webkitExitFullscreen) { // Safari
            try {
                await (targetDocument as any).webkitExitFullscreen();
            } catch (err) {
                console.error("Error attempting to disable webkit full-screen mode:", err);
            }
        }
    }
  }, [targetDocument]);

  const handleClose = useCallback(() => {
    if (isOpen) {
        onClose();
    }
  }, [isOpen, onClose]);
  
  useEffect(() => {
    const handleFullscreenChange = () => {
      const newlyFullscreenElement = targetDocument.fullscreenElement || (targetDocument as any).webkitFullscreenElement;
      const isNowInTrueFullscreenForIframe = newlyFullscreenElement === iframeRef.current;

      if (isTrueFullscreen && !isNowInTrueFullscreenForIframe) {
        // We were in true fullscreen for *this iframe*, and now we are not.
        
        // If we launched directly to fullscreen, exiting fullscreen should close the modal completely.
        if (initialTrueFullscreenRequest) {
            onClose();
            return;
        }
      }
      setIsTrueFullscreen(isNowInTrueFullscreenForIframe);
    };
  
    targetDocument.addEventListener('fullscreenchange', handleFullscreenChange);
    targetDocument.addEventListener('webkitfullscreenchange', handleFullscreenChange); // Safari
  
    return () => {
      targetDocument.removeEventListener('fullscreenchange', handleFullscreenChange);
      targetDocument.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [isTrueFullscreen, handleClose, iframeRef, initialTrueFullscreenRequest, onClose, targetDocument]);

  useEffect(() => {
    if (isOpen) {
      setIsActuallyOpen(true);
      setScale(1); // Reset scale on open
      setIsDirectFullscreenLaunch(initialTrueFullscreenRequest);
    } else {
      const timer = setTimeout(() => setIsActuallyOpen(false), 300); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialTrueFullscreenRequest]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isTrueFullscreen) {
          // Browser will handle exiting true fullscreen.
        } else {
          handleClose(); // Not in true fullscreen, so close the modal directly.
        }
      }
    };

    if (isOpen) {
      targetDocument.addEventListener('keydown', handleKeyDown);
      if (initialTrueFullscreenRequest && iframeRef.current) {
        // Attempt immediate fullscreen entrance. 
        enterTrueFullscreen();
      }
    }
    return () => {
      targetDocument.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleClose, initialTrueFullscreenRequest, enterTrueFullscreen, isTrueFullscreen, targetDocument]);


  if (!isActuallyOpen || !htmlContent) {
    return null;
  }
  
  let previewTitle = "HTML Preview";
  try {
    const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      previewTitle = titleMatch[1].trim();
    }
  } catch (e) { /* ignore errors in title extraction */ }

  const isReactPreview = previewTitle.toLowerCase().includes('react');
  const HeaderIcon = isReactPreview ? Atom : IconHtml5;
  const iconBgClass = isReactPreview ? 'bg-cyan-500/10 text-cyan-500' : 'bg-orange-500/10';
  const subtitle = isReactPreview ? "React App" : "HTML Preview";

  const handleDownload = () => {
    if (!htmlContent) return;
    const filename = `${sanitizeFilename(previewTitle)}.html`;
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, filename);
  };

  const handleScreenshot = async () => {
    if (!iframeRef.current?.contentDocument?.body || isScreenshotting) return;
    setIsScreenshotting(true);
    try {
        const iframeBody = iframeRef.current.contentDocument.body;
        const filename = `${sanitizeFilename(previewTitle)}-screenshot.png`;
        
        // Temporarily reset scale for screenshot to ensure high quality capture
        // Note: Capturing cross-origin iframes isn't possible, but this is srcDoc so it's same-origin effectively.
        
        await exportElementAsPng(iframeBody, filename, {
            backgroundColor: iframeRef.current.contentDocument.body.style.backgroundColor || getComputedStyle(iframeRef.current.contentDocument.body).backgroundColor || '#ffffff',
            scale: 2,
        });
    } catch (err) {
        console.error("Failed to take screenshot of iframe content:", err);
        alert("Sorry, the screenshot could not be captured. Please check the console for errors.");
    } finally {
        setIsScreenshotting(false);
    }
  };

  const handleRefresh = useCallback(() => {
    if (iframeRef.current && htmlContent) {
      iframeRef.current.srcdoc = ' '; 
      requestAnimationFrame(() => {
        if (iframeRef.current) { 
          iframeRef.current.srcdoc = htmlContent;
        }
      });
    }
  }, [htmlContent]);
  
  const iconBtnClass = "p-2 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed";

  const handleIframeError = (event: React.SyntheticEvent<HTMLIFrameElement, Event>) => {
    console.error("Iframe loading error:", event);
  };

  // Skip animation if immediate fullscreen is requested to make it feel instant
  const animationClass = isOpen 
    ? (initialTrueFullscreenRequest ? '' : 'modal-enter-animation') 
    : 'modal-exit-animation';

  // If direct fullscreen launch is active, hide the modal chrome to prevent flash,
  // but keep it in the DOM so the iframe can be fullscreened.
  const containerClass = isDirectFullscreenLaunch 
    ? 'fixed inset-0 z-[2100] opacity-0 pointer-events-none' 
    : 'fixed inset-0 bg-black/80 flex items-center justify-center z-[2100] backdrop-blur-sm';

  return createPortal(
    <div
      className={containerClass}
      role="dialog"
      aria-modal="true"
      aria-labelledby="html-preview-modal-title"
      onClick={isTrueFullscreen ? undefined : handleClose} 
    >
      <div
        className={`bg-[var(--theme-bg-secondary)] w-full h-full flex flex-col overflow-hidden ${animationClass}`}
        onClick={(e) => e.stopPropagation()} 
      >
        {/* Refined Header - Simplified */}
        <header className="h-14 px-4 flex items-center justify-between gap-4 bg-[var(--theme-bg-primary)] border-b border-[var(--theme-border-secondary)] z-10 select-none">
            <div className="flex items-center gap-3 min-w-0 overflow-hidden">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBgClass}`}>
                    <HeaderIcon size={20} />
                </div>
                <div className="flex flex-col min-w-0">
                    <h2 id="html-preview-modal-title" className="text-sm font-semibold text-[var(--theme-text-primary)] truncate" title={previewTitle}>
                        {previewTitle}
                    </h2>
                    <span className="text-[10px] text-[var(--theme-text-tertiary)] truncate">
                        {subtitle}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-1">
                {/* Zoom Controls */}
                <div className="hidden sm:flex items-center">
                    <button onClick={handleZoomOut} className={iconBtnClass} disabled={scale <= MIN_ZOOM} title="Zoom Out">
                        <ZoomOut size={18} strokeWidth={1.5} />
                    </button>
                    <span className="text-xs font-mono font-medium text-[var(--theme-text-secondary)] w-10 text-center select-none tabular-nums">
                        {Math.round(scale * 100)}%
                    </span>
                    <button onClick={handleZoomIn} className={iconBtnClass} disabled={scale >= MAX_ZOOM} title="Zoom In">
                        <ZoomIn size={18} strokeWidth={1.5} />
                    </button>
                </div>

                <div className="hidden sm:block w-px h-4 bg-[var(--theme-border-secondary)] mx-2" />

                {/* Action Controls */}
                <button onClick={handleRefresh} className={iconBtnClass} title="Reload">
                    <RotateCw size={18} strokeWidth={1.5} />
                </button>
                <button onClick={handleDownload} className={iconBtnClass} title="Download HTML">
                    <Download size={18} strokeWidth={1.5} />
                </button>
                <button onClick={handleScreenshot} className={iconBtnClass} disabled={isScreenshotting} title="Screenshot">
                    {isScreenshotting ? <Loader2 size={18} className="animate-spin" strokeWidth={1.5} /> : <ImageIcon size={18} strokeWidth={1.5} />}
                </button>

                <div className="w-px h-4 bg-[var(--theme-border-secondary)] mx-2" />

                {/* Screen Mode Controls */}
                <button 
                    onClick={isTrueFullscreen ? exitTrueFullscreen : enterTrueFullscreen} 
                    className={iconBtnClass}
                    title={isTrueFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                >
                    {isTrueFullscreen ? <Minimize size={18} strokeWidth={1.5} /> : <Expand size={18} strokeWidth={1.5} />}
                </button>
                
                {!isTrueFullscreen && (
                    <button onClick={handleClose} className="p-2 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-danger)]/10 hover:text-[var(--theme-text-danger)] rounded-lg transition-colors ml-1" title="Close">
                        <X size={20} strokeWidth={1.5} />
                    </button>
                )}
            </div>
        </header>

        <div className="flex-grow relative overflow-auto custom-scrollbar bg-[var(--theme-bg-tertiary)]">
            {/* Subtle Grid Pattern Background */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.05]" 
                 style={{ 
                     backgroundImage: `radial-gradient(var(--theme-text-tertiary) 1px, transparent 1px)`, 
                     backgroundSize: '20px 20px',
                 }} 
            />
            
            <iframe
                ref={iframeRef}
                srcDoc={htmlContent}
                title="HTML Content Preview"
                className="border-none bg-white shadow-sm origin-top-left" 
                style={{
                    width: `${100 / scale}%`,
                    height: `${100 / scale}%`,
                    transform: `scale(${scale})`,
                }}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
                onError={handleIframeError}
            />
        </div>
      </div>
    </div>,
    targetDocument.body
  );
};
