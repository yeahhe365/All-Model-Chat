import React from 'react';
import { type UploadedFile } from '@/types';
import { usePdfViewer } from '@/hooks/ui/usePdfViewer';
import { PdfSidebar } from './pdf-viewer/PdfSidebar';
import { PdfMainContent } from './pdf-viewer/PdfMainContent';
import { PdfToolbar } from './pdf-viewer/PdfToolbar';

interface PdfViewerProps {
  file: UploadedFile;
}

const PdfViewerContent: React.FC<PdfViewerProps> = ({ file }) => {
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
    toggleSidebar,
  } = usePdfViewer(file);

  return (
    <div className="w-full h-full relative flex flex-row bg-gray-900 overflow-hidden select-none">
      <PdfSidebar
        fileUrl={file.dataUrl}
        numPages={numPages}
        currentPage={currentPage}
        showSidebar={showSidebar}
        onPageClick={scrollToPage}
        sidebarRef={sidebarRef}
      />

      <div className="flex-grow h-full relative flex flex-col min-w-0">
        <PdfMainContent
          fileUrl={file.dataUrl}
          numPages={numPages}
          scale={scale}
          rotation={rotation}
          isLoading={isLoading}
          error={error}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          setPageRef={setPageRef}
          containerRef={containerRef}
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
        />
      </div>
    </div>
  );
};

export const PdfViewer: React.FC<PdfViewerProps> = (props) => <PdfViewerContent key={props.file.id} {...props} />;
