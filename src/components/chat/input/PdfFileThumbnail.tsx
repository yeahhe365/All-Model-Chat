import React, { useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { UploadedFile } from '../../../types';
import { configurePdfWorker } from '../../../utils/pdfWorker';

configurePdfWorker(pdfjs);

const pdfThumbnailImageCache = new Map<string, string>();

const getPdfThumbnailCacheKey = (file: UploadedFile) =>
  file.dataUrl ?? file.fileApiName ?? `${file.name}:${file.size}:${file.type}`;

interface PdfFileThumbnailProps {
  file: UploadedFile;
  fallback: React.ReactNode;
}

export const PdfFileThumbnail: React.FC<PdfFileThumbnailProps> = ({ file, fallback }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cacheKey = useMemo(() => getPdfThumbnailCacheKey(file), [file]);
  const [cachedImageUrl, setCachedImageUrl] = useState(() => pdfThumbnailImageCache.get(cacheKey) ?? null);
  const [hasError, setHasError] = useState(false);

  if (!file.dataUrl || hasError) {
    return <>{fallback}</>;
  }

  if (cachedImageUrl) {
    return <img src={cachedImageUrl} alt={file.name} className="h-full w-full object-cover" />;
  }

  const handleRenderSuccess = () => {
    const canvas = containerRef.current?.querySelector('canvas');
    if (!canvas) {
      return;
    }

    try {
      const imageUrl = canvas.toDataURL('image/png');
      pdfThumbnailImageCache.set(cacheKey, imageUrl);
      setCachedImageUrl(imageUrl);
    } catch {
      // Keep the rendered PDF canvas in place if the browser refuses canvas export.
    }
  };

  return (
    <div ref={containerRef} className="h-full w-full overflow-hidden bg-white">
      <Document
        file={file.dataUrl}
        loading={fallback}
        error={fallback}
        onLoadError={() => setHasError(true)}
        className="flex h-full w-full items-start justify-center overflow-hidden"
      >
        <Page
          pageNumber={1}
          width={92}
          renderAnnotationLayer={false}
          renderTextLayer={false}
          loading={fallback}
          onRenderSuccess={handleRenderSuccess}
          className="origin-top scale-[0.98]"
        />
      </Document>
    </div>
  );
};
