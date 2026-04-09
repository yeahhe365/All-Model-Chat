
import React from 'react';
import { Document } from 'react-pdf';
import { UploadedFile } from '../../../types';
import { usePdfViewer } from '../../../hooks/ui/usePdfViewer';
import { PdfSidebar } from './pdf-viewer/PdfSidebar';
import { PdfMainContent } from './pdf-viewer/PdfMainContent';
import { PdfToolbar } from './pdf-viewer/PdfToolbar';
import { translations } from '../../../utils/appUtils';

interface PdfViewerProps {
    file: UploadedFile;
    t: (key: keyof typeof translations) => string;
}

const PdfViewerContent: React.FC<PdfViewerProps> = ({ file, t }) => {
    const {
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
        toggleSidebar
    } = usePdfViewer(file, t);

    return (
        <div className="w-full h-full relative flex flex-row bg-gray-900 overflow-hidden select-none">
            <Document
                file={file.dataUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={null}
                error={null}
                className="flex w-full h-full min-w-0"
            >
                <PdfSidebar 
                    numPages={numPages}
                    currentPage={currentPage}
                    showSidebar={showSidebar}
                    onPageClick={scrollToPage}
                    sidebarRef={sidebarRef}
                />

                <div className="flex-grow h-full relative flex flex-col min-w-0">
                    <PdfMainContent
                        numPages={numPages}
                        scale={scale}
                        rotation={rotation}
                        isLoading={isLoading}
                        error={error}
                        setPageRef={setPageRef}
                        containerRef={containerRef}
                        t={t}
                    />

                    <PdfToolbar 
                        currentPage={currentPage}
                        numPages={numPages}
                        scale={scale}
                        showSidebar={showSidebar}
                        onPageInputCommit={handlePageInputCommit}
                        onPrevPage={previousPage}
                        onNextPage={nextPage}
                        onZoomIn={handleZoomIn}
                        onZoomOut={handleZoomOut}
                        onRotate={handleRotate}
                        onToggleSidebar={toggleSidebar}
                        t={t}
                    />
                </div>
            </Document>
        </div>
    );
};

export const PdfViewer: React.FC<PdfViewerProps> = (props) => (
    <PdfViewerContent key={props.file.id} {...props} />
);
