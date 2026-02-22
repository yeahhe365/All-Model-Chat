import React, { useState, useEffect, useRef } from 'react';
import { Document, Page } from 'react-pdf';
import { Loader2, AlertCircle } from 'lucide-react';

interface PdfMainContentProps {
    fileUrl: string | undefined;
    numPages: number | null;
    scale: number;
    rotation: number;
    isLoading: boolean;
    error: string | null;
    onLoadSuccess: (data: { numPages: number }) => void;
    onLoadError: (err: Error) => void;
    setPageRef: (pageNum: number, element: HTMLDivElement | null) => void;
    containerRef: React.RefObject<HTMLDivElement>;
}

// 核心优化：懒加载/虚拟化 PDF 页面
const LazyPdfPage = ({
    pageNum,
    scale,
    rotation,
    setPageRef,
    containerRef
}: {
    pageNum: number;
    scale: number;
    rotation: number;
    setPageRef: (pageNum: number, element: HTMLDivElement | null) => void;
    containerRef: React.RefObject<HTMLDivElement>;
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const wrapperRef = useRef<HTMLDivElement>(null);

    // 标准 A4 纸比例估算，用于首次加载前的占位高度，防止滚动条严重跳动
    const isRotated = rotation === 90 || rotation === 270;
    const estimatedWidth = (isRotated ? 842 : 595) * scale;
    const estimatedHeight = (isRotated ? 595 : 842) * scale;

    useEffect(() => {
        const el = wrapperRef.current;
        const container = containerRef.current;
        if (!el || !container) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                } else {
                    // 当页面离开视口时，记录它准确的宽高，然后卸载 Canvas 释放内存
                    const rect = el.getBoundingClientRect();
                    if (rect.height > 0 && rect.width > 0) {
                        setDimensions({ width: rect.width, height: rect.height });
                    }
                    setIsVisible(false);
                }
            },
            {
                root: container,
                // 上下预加载 1.5 个视口的高度，保证滚动平滑且不闪烁
                rootMargin: '150% 0px 150% 0px',
                threshold: 0
            }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [containerRef]);

    // 当缩放或旋转改变时，清空缓存的尺寸，让 react-pdf 重新计算新尺寸
    useEffect(() => {
        setDimensions({ width: 0, height: 0 });
    }, [scale, rotation]);

    return (
        <div 
            ref={(el) => {
                wrapperRef.current = el;
                setPageRef(pageNum, el);
            }}
            data-page-number={pageNum}
            className="shadow-2xl relative bg-white flex items-center justify-center transition-all duration-200"
            style={{ 
                // 如果 Canvas 被卸载，使用缓存的尺寸或估算尺寸撑起高度，防止滚动条乱跳
                height: isVisible ? 'auto' : (dimensions.height ? `${dimensions.height}px` : `${estimatedHeight}px`),
                width: isVisible ? 'auto' : (dimensions.width ? `${dimensions.width}px` : `${estimatedWidth}px`),
            }}
        >
            {isVisible ? (
                <Page 
                    pageNumber={pageNum}
                    scale={scale} 
                    rotate={rotation}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    className="bg-white"
                    loading={
                        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                            <Loader2 size={24} className="animate-spin" />
                        </div>
                    }
                />
            ) : (
                // Canvas 卸载后的占位 UI，极低内存消耗
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50 text-gray-300">
                    <span className="text-sm font-mono font-medium tracking-widest">PAGE {pageNum}</span>
                </div>
            )}
        </div>
    );
};

export const PdfMainContent: React.FC<PdfMainContentProps> = ({
    fileUrl,
    numPages,
    scale,
    rotation,
    isLoading,
    error,
    onLoadSuccess,
    onLoadError,
    setPageRef,
    containerRef
}) => {
    return (
        <div className="flex-grow h-full relative flex flex-col min-w-0">
            <div 
                ref={containerRef}
                className="flex-grow overflow-y-auto custom-scrollbar p-4 sm:p-8 relative"
            >
                {/* PDF Content */}
                <div className={`flex flex-col items-center gap-6 transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
                    <Document
                        file={fileUrl}
                        onLoadSuccess={onLoadSuccess}
                        onLoadError={onLoadError}
                        loading={null}
                        error={null}
                        className="flex flex-col items-center gap-6 w-full"
                    >
                        {numPages && Array.from(new Array(numPages), (_, index) => {
                            const pageNum = index + 1;
                            return (
                                <LazyPdfPage 
                                    key={pageNum}
                                    pageNum={pageNum}
                                    scale={scale}
                                    rotation={rotation}
                                    setPageRef={setPageRef}
                                    containerRef={containerRef}
                                />
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
        </div>
    );
};

