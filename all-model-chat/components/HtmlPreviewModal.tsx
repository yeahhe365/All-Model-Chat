

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Download, Maximize, Minimize, Expand, RotateCw } from 'lucide-react'; 
import { ThemeColors } from '../constants/themeConstants';

interface HtmlPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  htmlContent: string | null;
  themeColors: ThemeColors;
  initialTrueFullscreenRequest?: boolean;
}

const sanitizeFilename = (name: string): string => {
  if (!name || typeof name !== 'string') {
    return "preview";
  }
  // Remove illegal characters for filenames and control characters
  let saneName = name.trim().replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
  
  // Windows doesn't like filenames ending with a period or space.
  saneName = saneName.replace(/[. ]+$/, '');

  // Limit length to avoid issues with filesystems
  if (saneName.length > 100) {
    saneName = saneName.substring(0, 100);
  }
  
  return saneName || "preview";
};

export const HtmlPreviewModal: React.FC<HtmlPreviewModalProps> = ({
  isOpen,
  onClose,
  htmlContent,
  themeColors,
  initialTrueFullscreenRequest,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isTrueFullscreen, setIsTrueFullscreen] = useState(false);
  const iconSize = window.innerWidth < 640 ? 18 : 20;
  const [isActuallyOpen, setIsActuallyOpen] = useState(isOpen);

  const enterTrueFullscreen = useCallback(async () => {
    if (iframeRef.current && document.fullscreenEnabled) {
      try {
        await iframeRef.current.requestFullscreen();
      } catch (err) {
        console.error("Error attempting to enable full-screen mode:", err);
      }
    } else if (iframeRef.current && (iframeRef.current as any).webkitRequestFullscreen) { // Safari
        try {
            (iframeRef.current as any).webkitRequestFullscreen();
        } catch (err) {
            console.error("Error attempting to enable webkit full-screen mode:", err);
        }
    }
  }, []);

  const exitTrueFullscreen = useCallback(async () => {
    if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
        if (document.exitFullscreen) {
            try {
                await document.exitFullscreen();
            } catch (err) {
                console.error("Error attempting to disable full-screen mode:", err);
            }
        } else if ((document as any).webkitExitFullscreen) { // Safari
            try {
                await (document as any).webkitExitFullscreen();
            } catch (err) {
                console.error("Error attempting to disable webkit full-screen mode:", err);
            }
        }
    }
  }, []);

  const handleClose = useCallback(() => {
    if (isOpen) {
        onClose();
    }
  }, [isOpen, onClose]);
  
  useEffect(() => {
    const handleFullscreenChange = () => {
      const newlyFullscreenElement = document.fullscreenElement || (document as any).webkitFullscreenElement;
      const isNowInTrueFullscreenForIframe = newlyFullscreenElement === iframeRef.current;

      if (isTrueFullscreen && !isNowInTrueFullscreenForIframe) {
        // We were in true fullscreen for *this iframe*, and now we are not.
        handleClose(); // Close the modal.
      }
      setIsTrueFullscreen(isNowInTrueFullscreenForIframe);
    };
  
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange); // Safari
  
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [isTrueFullscreen, handleClose, iframeRef]);

  useEffect(() => {
    if (isOpen) {
      setIsActuallyOpen(true);
    } else {
      const timer = setTimeout(() => setIsActuallyOpen(false), 300); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isTrueFullscreen) {
          // Browser will handle exiting true fullscreen.
          // The 'fullscreenchange' event listener above will then call onClose().
        } else {
          handleClose(); // Not in true fullscreen, so close the modal directly.
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      if (initialTrueFullscreenRequest && iframeRef.current) {
        const timer = setTimeout(() => {
            enterTrueFullscreen();
        }, 150); // Delay slightly for modal animations and iframe readiness
        return () => {
            clearTimeout(timer);
            document.removeEventListener('keydown', handleKeyDown);
        }
      }
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleClose, initialTrueFullscreenRequest, enterTrueFullscreen, isTrueFullscreen]);


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

  const handleDownload = () => {
    if (!htmlContent) return;
    const filename = `${sanitizeFilename(previewTitle)}.html`;
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleRefresh = useCallback(() => {
    if (iframeRef.current && htmlContent) {
      // Temporarily clear srcdoc to force a full reload if the content is identical
      // Some browsers might optimize if srcdoc is set to the exact same string.
      iframeRef.current.srcdoc = ' '; 
      requestAnimationFrame(() => {
        if (iframeRef.current) { // Check if still mounted
          iframeRef.current.srcdoc = htmlContent;
        }
      });
    }
  }, [htmlContent]);
  
  const buttonClasses = "p-1 sm:p-1.5 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-input)] rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-secondary)] focus:ring-[var(--theme-border-focus)]";

  const FullscreenToggleButton: React.FC = () => (
    <button
      onClick={isTrueFullscreen ? exitTrueFullscreen : enterTrueFullscreen}
      className={buttonClasses}
      aria-label={isTrueFullscreen ? "Exit true fullscreen" : "Enter true fullscreen"}
      title={isTrueFullscreen ? "Exit Fullscreen" : "Enter Fullscreen (Browser)"}
    >
      {isTrueFullscreen ? <Minimize size={iconSize} /> : <Expand size={iconSize} strokeWidth={2.5} />}
    </button>
  );

  const handleIframeError = (event: React.SyntheticEvent<HTMLIFrameElement, Event>) => {
    console.error("Iframe loading error:", event);
    // You could potentially display a message to the user here
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="html-preview-modal-title"
      onClick={isTrueFullscreen ? undefined : handleClose} // Prevent closing by backdrop click when in true fullscreen
    >
      <div
        className={`bg-[var(--theme-bg-primary)] w-full h-full shadow-2xl flex flex-col overflow-hidden ${isOpen ? 'modal-enter-animation' : 'modal-exit-animation'}`}
        onClick={(e) => e.stopPropagation()} 
      >
        <header className="py-1 px-2 sm:py-1.5 sm:px-3 border-b border-[var(--theme-border-secondary)] flex justify-between items-center flex-shrink-0 bg-[var(--theme-bg-secondary)]">
          <h2 id="html-preview-modal-title" className="text-sm sm:text-base font-semibold text-[var(--theme-text-link)] truncate pr-2" title={previewTitle}>
            {previewTitle}
          </h2>
          <div className="flex items-center gap-1 sm:gap-2">
            <FullscreenToggleButton />
            <button
                onClick={handleDownload}
                className={buttonClasses}
                aria-label="Download HTML content"
                title="Download HTML"
            >
                <Download size={iconSize} /> 
            </button>
            <button
              onClick={handleRefresh}
              className={buttonClasses}
              aria-label="Refresh preview content"
              title="Refresh Preview"
            >
              <RotateCw size={iconSize} />
            </button>
            {!isTrueFullscreen && (
                <button
                onClick={handleClose}
                className={buttonClasses}
                aria-label="Close HTML preview"
                title="Close Preview (Esc)"
                >
                <X size={iconSize + 2} />
                </button>
            )}
          </div>
        </header>
        <div className="flex-grow relative bg-[var(--theme-bg-secondary)]">
          <iframe
            ref={iframeRef}
            srcDoc={htmlContent}
            title="HTML Content Preview"
            className="w-full h-full border-none bg-white" 
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
            onError={handleIframeError}
          />
        </div>
      </div>
    </div>
  );
};
