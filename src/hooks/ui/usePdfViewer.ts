
import { useState, useEffect, useRef, useCallback } from 'react';
import { pdfjs } from 'react-pdf';
import { UploadedFile } from '../../types';

// Configure PDF worker globally
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

// Determine responsive initial scale
const getInitialScale = () => {
    if (typeof window === 'undefined') return 1.0;
    const width = window.innerWidth;
    if (width < 640) return 0.6;
    if (width < 1024) return 0.8;
    return 1.1;
};

export const usePdfViewer = (file: UploadedFile) => {
    const [numPages, setNumPages] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageInput, setPageInput] = useState("1");
    const [scale, setScale] = useState(getInitialScale);
    const [rotation, setRotation] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showSidebar, setShowSidebar] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    const sidebarRef = useRef<HTMLDivElement>(null);

    // Reset state when file changes
    useEffect(() => {
        setNumPages(null);
        setCurrentPage(1);
        setPageInput("1");
        setRotation(0);
        setScale(getInitialScale());
        setIsLoading(true);
        setError(null);
        pageRefs.current.clear();
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
                threshold: 0.1,
                rootMargin: "-10% 0px -60% 0px"
            }
        );

        pageRefs.current.forEach((el) => {
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [numPages, isLoading]);

    // Sync input with current page when scrolling (auto-update input value if not user-focused)
    useEffect(() => {
        // We use a simplified check here since we don't have direct access to the input ref in the hook easily 
        // without passing it back and forth. Instead, we just update the state.
        // The Toolbar component handles not overwriting if focused via its own logic or simply responding to this state update.
        setPageInput(String(currentPage));
        
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
            el.scrollIntoView({ behavior: 'auto', block: 'start' });
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
            setPageInput(String(currentPage));
        }
    };

    const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3.0));
    const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.4));
    const handleRotate = () => setRotation(prev => (prev + 90) % 360);
    const toggleSidebar = () => setShowSidebar(prev => !prev);

    // Helper to register page refs
    const setPageRef = useCallback((pageNum: number, element: HTMLDivElement | null) => {
        if (element) {
            pageRefs.current.set(pageNum, element);
        } else {
            pageRefs.current.delete(pageNum);
        }
    }, []);

    return {
        numPages,
        currentPage,
        pageInput,
        setPageInput,
        scale,
        rotation,
        isLoading,
        error,
        showSidebar,
        containerRef,
        sidebarRef,
        setPageRef,
        onDocumentLoadSuccess,
        onDocumentLoadError,
        scrollToPage,
        previousPage,
        nextPage,
        handlePageInputCommit,
        handleZoomIn,
        handleZoomOut,
        handleRotate,
        toggleSidebar
    };
};
