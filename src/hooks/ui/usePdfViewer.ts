import { useState, useEffect, useRef, useCallback } from 'react';
import { pdfjs } from 'react-pdf';
import { UploadedFile } from '../../types';
import { configurePdfWorker } from '../../utils/pdfWorker';
import { useI18n } from '../../contexts/I18nContext';

// Configure PDF worker globally
configurePdfWorker(pdfjs);

// Determine responsive initial scale
const getInitialScale = () => {
  if (typeof window === 'undefined') return 1.0;
  const width = window.innerWidth;
  if (width < 640) return 0.6;
  if (width < 1024) return 0.8;
  return 1.1;
};

export const usePdfViewer = (_file: UploadedFile) => {
  const { t } = useI18n();
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(getInitialScale);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const sidebarRef = useRef<HTMLDivElement>(null);

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
        rootMargin: '-10% 0px -60% 0px',
      },
    );

    pageRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [numPages, isLoading]);

  useEffect(() => {
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
    setError(t('pdf_load_failed_with_message').replace('{message}', err.message));
    console.error('PDF Load Error:', err);
  };

  const scrollToPage = (pageNum: number) => {
    const el = pageRefs.current.get(pageNum);
    if (el) {
      el.scrollIntoView({ behavior: 'auto', block: 'start' });
      setCurrentPage(pageNum);
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

  const handlePageInputCommit = (pageInput: string) => {
    const page = parseInt(pageInput, 10);
    if (!isNaN(page) && page >= 1 && page <= (numPages || 1)) {
      scrollToPage(page);
    }
  };

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.2, 3.0));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.2, 0.4));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const toggleSidebar = () => setShowSidebar((prev) => !prev);

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
    toggleSidebar,
  };
};
