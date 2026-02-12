
import React from 'react';
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
                        className="flex flex-col items-center gap-6"
                    >
                        {numPages && Array.from(new Array(numPages), (_, index) => {
                            const pageNum = index + 1;
                            return (
                                <div 
                                    key={pageNum}
                                    ref={(el) => setPageRef(pageNum, el)}
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
        </div>
    );
};
