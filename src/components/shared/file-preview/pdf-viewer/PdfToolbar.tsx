import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, PanelLeft } from 'lucide-react';
import { FloatingToolbar, ToolbarButton, ToolbarDivider, ToolbarLabel } from '../FloatingToolbar';
import { useI18n } from '../../../../contexts/I18nContext';

interface PdfToolbarProps {
  currentPage: number;
  numPages: number | null;
  scale: number;
  showSidebar: boolean;
  onPageInputCommit: (value: string) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRotate: () => void;
  onToggleSidebar: () => void;
}

export const PdfToolbar: React.FC<PdfToolbarProps> = ({
  currentPage,
  numPages,
  scale,
  showSidebar,
  onPageInputCommit,
  onPrevPage,
  onNextPage,
  onZoomIn,
  onZoomOut,
  onRotate,
  onToggleSidebar,
}) => {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pageInputDraft, setPageInputDraft] = useState(String(currentPage));
  const [isEditingPageInput, setIsEditingPageInput] = useState(false);

  const pageInput = isEditingPageInput ? pageInputDraft : String(currentPage);

  const handlePageInputChange = (value: string) => {
    if (!isEditingPageInput) {
      setIsEditingPageInput(true);
    }
    setPageInputDraft(value);
  };

  const handlePageInputFocus = () => {
    setIsEditingPageInput(true);
    setPageInputDraft(String(currentPage));
  };

  const commitPageInput = () => {
    onPageInputCommit(pageInputDraft);
    setIsEditingPageInput(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitPageInput();
      inputRef.current?.blur();
    }
  };

  if (!numPages || numPages <= 0) return null;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto max-w-[90vw]">
      <FloatingToolbar className="p-2 gap-2 sm:gap-3">
        <ToolbarButton onClick={onToggleSidebar} active={showSidebar} title={t('pdf_toggle_thumbnails')}>
          <PanelLeft size={18} />
        </ToolbarButton>

        <ToolbarDivider />

        <div className="flex items-center gap-1">
          <ToolbarButton onClick={onPrevPage} disabled={currentPage <= 1} title={t('pdf_previous_page')}>
            <ChevronLeft size={18} />
          </ToolbarButton>

          <div className="flex items-center gap-1.5 px-2">
            <input
              ref={inputRef}
              type="text"
              value={pageInput}
              onChange={(e) => handlePageInputChange(e.target.value)}
              onFocus={handlePageInputFocus}
              onKeyDown={handleKeyDown}
              onBlur={commitPageInput}
              className="w-8 bg-transparent text-center font-mono text-sm text-white border-b border-white/20 focus:border-white/80 outline-none p-0 transition-colors"
              aria-label={t('pdf_page_number_aria')}
            />
            <span className="text-xs font-mono text-white/50 select-none">/ {numPages}</span>
          </div>

          <ToolbarButton onClick={onNextPage} disabled={currentPage >= numPages} title={t('pdf_next_page')}>
            <ChevronRight size={18} />
          </ToolbarButton>
        </div>

        <ToolbarDivider />

        <div className="flex items-center gap-1">
          <ToolbarButton onClick={onZoomOut} disabled={scale <= 0.4} title={t('filePreview_zoom_out')}>
            <ZoomOut size={18} />
          </ToolbarButton>
          <ToolbarLabel className="min-w-[40px] text-center px-1">{Math.round(scale * 100)}%</ToolbarLabel>
          <ToolbarButton onClick={onZoomIn} disabled={scale >= 3.0} title={t('filePreview_zoom_in')}>
            <ZoomIn size={18} />
          </ToolbarButton>
        </div>

        <ToolbarDivider />

        <ToolbarButton onClick={onRotate} title={t('pdf_rotate')}>
          <RotateCw size={18} />
        </ToolbarButton>
      </FloatingToolbar>
    </div>
  );
};
