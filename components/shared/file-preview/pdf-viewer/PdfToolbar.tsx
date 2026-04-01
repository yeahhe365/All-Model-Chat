
import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, PanelLeft } from 'lucide-react';
import { FloatingToolbar, ToolbarButton, ToolbarDivider, ToolbarLabel } from '../FloatingToolbar';

interface PdfToolbarProps {
    currentPage: number;
    numPages: number | null;
    scale: number;
    showSidebar: boolean;
    pageInput: string;
    onPageInputChange: (value: string) => void;
    onPageInputCommit: () => void;
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
    pageInput,
    onPageInputChange,
    onPageInputCommit,
    onPrevPage,
    onNextPage,
    onZoomIn,
    onZoomOut,
    onRotate,
    onToggleSidebar
}) => {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            onPageInputCommit();
            inputRef.current?.blur();
        }
    };

    if (!numPages || numPages <= 0) return null;

    return (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto max-w-[90vw]">
            <FloatingToolbar className="p-2 gap-2 sm:gap-3">
                <ToolbarButton onClick={onToggleSidebar} active={showSidebar} title="Toggle Thumbnails">
                    <PanelLeft size={18} />
                </ToolbarButton>

                <ToolbarDivider />

                <div className="flex items-center gap-1">
                    <ToolbarButton onClick={onPrevPage} disabled={currentPage <= 1} title="Previous Page">
                        <ChevronLeft size={18} />
                    </ToolbarButton>
                    
                    <div className="flex items-center gap-1.5 px-2">
                        <input 
                            ref={inputRef}
                            type="text" 
                            value={pageInput}
                            onChange={(e) => onPageInputChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={onPageInputCommit}
                            className="w-8 bg-transparent text-center font-mono text-sm text-white border-b border-white/20 focus:border-white/80 outline-none p-0 transition-colors"
                            aria-label="Page number"
                        />
                        <span className="text-xs font-mono text-white/50 select-none">
                            / {numPages}
                        </span>
                    </div>

                    <ToolbarButton onClick={onNextPage} disabled={currentPage >= numPages} title="Next Page">
                        <ChevronRight size={18} />
                    </ToolbarButton>
                </div>

                <ToolbarDivider />

                <div className="flex items-center gap-1">
                    <ToolbarButton onClick={onZoomOut} disabled={scale <= 0.4} title="Zoom Out">
                        <ZoomOut size={18} />
                    </ToolbarButton>
                    <ToolbarLabel className="min-w-[40px] text-center px-1">
                        {Math.round(scale * 100)}%
                    </ToolbarLabel>
                    <ToolbarButton onClick={onZoomIn} disabled={scale >= 3.0} title="Zoom In">
                        <ZoomIn size={18} />
                    </ToolbarButton>
                </div>

                <ToolbarDivider />

                <ToolbarButton onClick={onRotate} title="Rotate">
                    <RotateCw size={18} />
                </ToolbarButton>
            </FloatingToolbar>
        </div>
    );
};
