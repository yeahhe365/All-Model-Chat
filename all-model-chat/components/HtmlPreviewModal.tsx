
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Download, Maximize, Minimize, Expand, RotateCw } from 'lucide-react'; 
import { ThemeColors } from '../constants';

interface HtmlPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  htmlContent: string | null;
  themeColors: ThemeColors;
  initialTrueFullscreenRequest?: boolean;
}

const sanitizeFilename = (name: string): string => {
  // Replace invalid characters with underscores and limit length
  let saneName = name.replace(/[^a-z0-9_.-]+/gi, '_').replace(/^_+|_+$/g, '');
  if (saneName.length > 60) {
    saneName = saneName.substring(0, 60);
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
  
  useEffect(() => {
    const handleFullscreenChange = () => {
      const newlyFullscreenElement = document.fullscreenElement || (document as any).webkitFullscreenElement;
      const isNowInTrueFullscreenForIframe = newlyFullscreenElement === iframeRef.current;

      if (isTrueFullscreen && !isNowInTrueFullscreenForIframe) {
        // We were in true fullscreen for *this iframe*, and now we are not.
        onClose(); // Close the modal.
      }
      setIsTrueFullscreen(isNowInTrueFullscreenForIframe);
    };
  
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange); // Safari
  
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [isTrueFullscreen, onClose, iframeRef]);


  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isTrueFullscreen) {
          // Browser will handle exiting true fullscreen.
          // The 'fullscreenchange' event listener above will then call onClose().
        } else {
          onClose(); // Not in true fullscreen, so close the modal directly.
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
  }, [isOpen, onClose, initialTrueFullscreenRequest, enterTrueFullscreen, isTrueFullscreen]);


  if (!isOpen || !htmlContent) {
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
  
  const FullscreenToggleButton: React.FC = () => (
    <button
      onClick={isTrueFullscreen ? exitTrueFullscreen : enterTrueFullscreen}
      className="p-1.5 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-input)] rounded-full transition-colors"
      aria-label={isTrueFullscreen ? "Exit true fullscreen" : "Enter true fullscreen"}
      title={isTrueFullscreen ? "Exit Fullscreen" : "Enter Fullscreen (Browser)"}
    >
      {isTrueFullscreen ? <Minimize size={20} /> : <Expand size={20} strokeWidth={2.5} />}
    </button>
  );

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="html-preview-modal-title"
      onClick={isTrueFullscreen ? undefined : onClose} // Prevent closing by backdrop click when in true fullscreen
    >
      <div
        className="bg-[var(--theme-bg-primary)] w-full h-full shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()} 
      >
        <header className="py-1.5 sm:py-2 px-3 sm:px-4 border-b border-[var(--theme-border-secondary)] flex justify-between items-center flex-shrink-0 bg-[var(--theme-bg-secondary)]">
          <h2 id="html-preview-modal-title" className="text-base sm:text-lg font-semibold text-[var(--theme-text-link)] truncate pr-2" title={previewTitle}>
            {previewTitle}
          </h2>
          <div className="flex items-center gap-2">
            <FullscreenToggleButton />
            <button
                onClick={handleDownload}
                className="p-1.5 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-input)] rounded-full transition-colors"
                aria-label="Download HTML content"
                title="Download HTML"
            >
                <Download size={20} /> 
            </button>
            <button
              onClick={handleRefresh}
              className="p-1.5 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-input)] rounded-full transition-colors"
              aria-label="Refresh HTML content"
              title="Refresh HTML"
            >
              <RotateCw size={20} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-input)] rounded-full transition-colors"
              aria-label="Close HTML preview"
              title="Close (Esc)"
            >
              <X size={22} />
            </button>
          </div>
        </header>
        <div className="flex-grow w-full h-full overflow-hidden bg-white"> 
          <iframe
            ref={iframeRef}
            srcDoc={htmlContent}
            title={previewTitle}
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals" 
            className="w-full h-full border-none"
            aria-label="HTML content preview area"
            allowFullScreen // Important for Fullscreen API
          />
        </div>
      </div>
    </div>
  );
};
