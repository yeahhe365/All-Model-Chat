
import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, Loader2, AlertCircle, PanelLeft } from 'lucide-react';
import { UploadedFile } from '../../../types';

// Configure PDF worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
    file: UploadedFile;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ file }) => {
    // Determine responsive initial scale
    const getInitialScale = () => {
        if (typeof window === 'undefined') return 1.0;
        const width = window.innerWidth;
        if (width < 640) return 0.6;
        if (width < 1024) return 0.8;
        return 1.1;
    };

    const [numPages, setNumPages] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageInput, setPageInput] = useState("1");
    const [scale, setScale] = useState(getInitialScale);
    const [rotation, setRotation] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // Initialize sidebar open state based on screen width (>= 1024px defaults to open)
    const [showSidebar, setShowSidebar] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    const inputRef = useRef<HTMLInputElement>(null);
    const sidebarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setNumPages(null);
        setCurrentPage(1);
        setPageInput("1");
        setRotation(0);
        setScale(getInitialScale());
        setIsLoading(true);
        setError(null);
        pageRefs.current.clear();
        // Keep sidebar state as is when switching files, or reset if desired. 
        // Current behavior: persist sidebar state across file navigation in same session.
    }, [file.id]);

    // Intersection Observer to update current page number on scroll
    useEffect(() => {
        const container = containerRef.current;
        if (!container || !numPages || isLoading) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const pageNum = Number(entry.target.getAttribute('data-page-number'));
                        if (!isNaN(pageNum)) {
                            setCurrentPage(pageNum);
                        }
                    }
                });
            },
            {
                root: container,
                threshold: 0.1, // Lower threshold for better detection of large pages
                rootMargin: "-10% 0px -60% 0px" // Focus area near the top
            }
        );

        pageRefs.current.forEach((el) => {
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [numPages, isLoading]);

    // Sync input with current page when scrolling (only if not focused)
    useEffect(() => {
        if (inputRef.current && document.activeElement !== inputRef.current) {
            setPageInput(String(currentPage));
        }
        
        // Auto-scroll sidebar to keep current page thumbnail in view
        if (showSidebar && sidebarRef.current) {
            const thumbnail = sidebarRef.current.querySelector(`[data-thumbnail-page="${currentPage}"]`);
            if (thumbnail) {
                thumbnail.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [currentPage, showSidebar]);

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
        setIsLoading(false);
    };

    const onDocumentLoadError = (err: Error) => {
        setIsLoading(false);
        setError(err.message || 'Failed to load PDF.');
        console.error("PDF Load Error:", err);
    };

    const scrollToPage = (pageNum: number) => {
        const el = pageRefs.current.get(pageNum);
        if (el) {
            el.scrollIntoView({ behavior: 'auto', block: 'start' }); // 'auto' allows immediate jump, avoiding fighting with observer updates during rapid scroll
            setCurrentPage(pageNum);
            setPageInput(String(pageNum));
        }
    };

    const previousPage = () => {
        const prev = Math.max(1, currentPage - 1);
        scrollToPage(prev);
    };

    const nextPage = () => {
        const next = Math.min(numPages || 1, currentPage + 1);
        scrollToPage(next);
    };

    const handlePageInputCommit = () => {
        const page = parseInt(pageInput, 10);
        if (!isNaN(page) && page >= 1 && page <= (numPages || 1)) {
            scrollToPage(page);
        } else {
            setPageInput(String(currentPage)); // Revert if invalid
        }
        inputRef.current?.blur();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handlePageInputCommit();
        }
    };

    const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3.0));
    const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.4));
    const handleRotate = () => setRotation(prev => (prev + 90) % 360);

    const floatingBarBase = "bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl transition-all duration-200";
    const pillButtonClass = "p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-40 disabled:cursor-not-allowed";

    return (
        <div className="w-full h-full relative flex flex-row bg-gray-900 overflow-hidden select-none">
            
            {/* Sidebar (Thumbnails) */}
            <div className={`relative flex-shrink-0 bg-gray-950 border-r border-white/10 transition-all duration-300 ease-in-out flex flex-col ${showSidebar ? 'w-40 sm:w-52' : 'w-0 overflow-hidden'}`}>
                {showSidebar && (
                    <div ref={sidebarRef} className="flex-grow overflow-y-auto custom-scrollbar p-4">
                         <Document 
                            file={file.dataUrl} 
                            loading={null} 
                            error={null}
                            className="flex flex-col gap-5"
                         >
                            {numPages && Array.from(new Array(numPages), (_, index) => {
                                const pageNum = index + 1;
                                return (
                                    <div 
                                        key={pageNum}
                                        data-thumbnail-page={pageNum}
                                        className="cursor-pointer group flex flex-col items-center"
                                        onClick={() => scrollToPage(pageNum)}
                                    >
                                        <div className={`relative transition-all duration-200 ${currentPage === pageNum ? 'ring-2 ring-blue-500 shadow-lg scale-[1.02]' : 'hover:ring-2 hover:ring-white/30 hover:scale-[1.02]'}`}>
                                            <Page 
                                                pageNumber={pageNum} 
                                                width={120} // Fixed thumbnail width
                                                renderTextLayer={false} 
                                                renderAnnotationLayer={false}
                                                className="shadow-sm bg-white"
                                                loading={<div className="w-[120px] h-[160px] bg-white/5 animate-pulse rounded-sm" />}
                                            />
                                            <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded backdrop-blur-sm font-mono">
                                                {pageNum}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </Document>
                    </div>
                )}
            </div>

            {/* Main Content Area */}
            <div className="flex-grow h-full relative flex flex-col min-w-0">
                <div 
                    ref={containerRef}
                    className="flex-grow overflow-y-auto custom-scrollbar p-4 sm:p-8 relative"
                >
                    {/* PDF Content */}
                    <div className={`flex flex-col items-center gap-6 transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
                        <Document
                            file={file.dataUrl}
                            onLoadSuccess={onDocumentLoadSuccess}
                            onLoadError={onDocumentLoadError}
                            loading={null}
                            error={null}
                            className="flex flex-col items-center gap-6"
                        >
                            {numPages && Array.from(new Array(numPages), (_, index) => {
                                const pageNum = index + 1;
                                return (
                                    <div 
                                        key={pageNum}
                                        ref={(el) => {
                                            if (el) pageRefs.current.set(pageNum, el);
                                            else pageRefs.current.delete(pageNum);
                                        }}
                                        data-page-number={pageNum}
                                        className="shadow-2xl"
                                    >
                                        <Page 
                                            pageNumber={pageNum}
                                            scale={scale} 
                                            rotate={rotation}
                                            renderTextLayer={true}
                                            renderAnnotationLayer={true}
                                            className="bg-white"
                                            loading={
                                                <div className="bg-white h-[800px] w-[600px] flex items-center justify-center text-gray-400">
                                                    <Loader2 size={24} className="animate-spin" />
                                                </div>
                                            }
                                        />
                                    </div>
                                );
                            })}
                        </Document>
                    </div>

                    {/* Loading Indicator */}
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="bg-black/50 backdrop-blur-md p-4 rounded-xl flex flex-col items-center gap-2 text-white">
                                <Loader2 size={32} className="animate-spin" />
                                <span className="text-sm font-medium">Loading PDF...</span>
                            </div>
                        </div>
                    )}
                    
                    {/* Error Indicator */}
                    {error && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="bg-red-900/50 backdrop-blur-md p-6 rounded-xl flex flex-col items-center gap-3 text-red-200 border border-red-500/30 max-w-sm text-center">
                                <AlertCircle size={32} />
                                <span className="text-sm font-medium">{error}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom Controls */}
                {numPages && numPages > 0 && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto max-w-[90vw]">
                        <div className={`${floatingBarBase} rounded-full p-2 flex items-center gap-2 sm:gap-3`}>
                            
                            <button onClick={() => setShowSidebar(!showSidebar)} className={`${pillButtonClass} ${showSidebar ? 'bg-white/20 text-white' : ''}`} title="Toggle Thumbnails">
                                <PanelLeft size={18} />
                            </button>

                            <div className="w-px h-5 bg-white/10"></div>

                            <div className="flex items-center gap-1">
                                <button onClick={previousPage} disabled={currentPage <= 1} className={pillButtonClass} title="Previous Page">
                                    <ChevronLeft size={18} />
                                </button>
                                
                                <div className="flex items-center gap-1.5 px-2">
                                    <input 
                                        ref={inputRef}
                                        type="text" 
                                        value={pageInput}
                                        onChange={(e) => setPageInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        onBlur={handlePageInputCommit}
                                        className="w-8 bg-transparent text-center font-mono text-sm text-white border-b border-white/20 focus:border-white/80 outline-none p-0 transition-colors"
                                        aria-label="Page number"
                                    />
                                    <span className="text-xs font-mono text-white/50 select-none">
                                        / {numPages}
                                    </span>
                                </div>

                                <button onClick={nextPage} disabled={currentPage >= numPages} className={pillButtonClass} title="Next Page">
                                    <ChevronRight size={18} />
                                </button>
                            </div>

                            <div className="w-px h-5 bg-white/10"></div>

                            <div className="flex items-center gap-1">
                                <button onClick={handleZoomOut} disabled={scale <= 0.4} className={pillButtonClass} title="Zoom Out">
                                    <ZoomOut size={18} />
                                </button>
                                <span className="text-xs font-mono text-white/90 px-1 min-w-[40px] text-center">
                                    {Math.round(scale * 100)}%
                                </span>
                                <button onClick={handleZoomIn} disabled={scale >= 3.0} className={pillButtonClass} title="Zoom In">
                                    <ZoomIn size={18} />
                                </button>
                            </div>

                            <div className="w-px h-5 bg-white/10"></div>

                            <button onClick={handleRotate} className={pillButtonClass} title="Rotate">
                                <RotateCw size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
