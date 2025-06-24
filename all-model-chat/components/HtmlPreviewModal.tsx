
import React, { useEffect, useRef } from 'react';
import { X, Download } from 'lucide-react'; // Added Download icon
import { ThemeColors } from '../constants';

interface HtmlPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  htmlContent: string | null;
  themeColors: ThemeColors;
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
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

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

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="html-preview-modal-title"
      onClick={onClose} 
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
            <button
                onClick={handleDownload}
                className="p-1.5 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-input)] rounded-full transition-colors"
                aria-label="Download HTML content"
                title="Download HTML"
            >
                <Download size={20} /> 
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
          />
        </div>
      </div>
    </div>
  );
};
