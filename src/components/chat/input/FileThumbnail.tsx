import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { UploadedFile } from '@/types';
import { SUPPORTED_IMAGE_MIME_TYPES } from '@/constants/fileConstants';
import { getFileTypeCategory } from '@/utils/uiUtils';
import { isTextFile } from '@/utils/fileTypeUtils';

const LazyPdfFileThumbnail = lazy(() =>
  import('./PdfFileThumbnail').then((module) => ({ default: module.PdfFileThumbnail })),
);

interface FileThumbnailProps {
  file: UploadedFile;
  Icon: React.ElementType;
  colorClass: string;
  bgClass: string;
}

const getDisplayExtension = (file: UploadedFile) => {
  const extension = file.name.split('.').pop()?.trim();
  if (extension && extension !== file.name) {
    return extension.slice(0, 4).toUpperCase();
  }

  const mimeSuffix = file.type.split('/').pop()?.split(/[+;]/)[0];
  return (mimeSuffix || 'FILE').slice(0, 4).toUpperCase();
};

const buildTextLines = (text: string | null) =>
  (text || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5);

const getWaveformBars = (file: UploadedFile) => {
  const seed = `${file.name}:${file.size}:${file.type}`;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 9973;
  }

  return Array.from({ length: 18 }, (_, index) => {
    const wave = Math.sin((hash + index * 29) / 13);
    const stepped = (hash + index * 37) % 41;
    return 24 + Math.round(Math.abs(wave) * 42) + stepped;
  });
};

const useVisibleThumbnailGate = (enabled: boolean) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(() => !enabled || typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    if (!enabled || isVisible) {
      return undefined;
    }

    const element = containerRef.current;
    if (!element || typeof IntersectionObserver === 'undefined') {
      queueMicrotask(() => setIsVisible(true));
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '120px' },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [enabled, isVisible]);

  return { containerRef, isVisible };
};

const TextThumbnail = ({ file }: { file: UploadedFile }) => {
  const [previewText, setPreviewText] = useState(file.textContent ?? null);

  useEffect(() => {
    let isCancelled = false;

    const loadTextPreview = async () => {
      if (typeof file.textContent === 'string') {
        setPreviewText(file.textContent);
        return;
      }

      try {
        if (file.rawFile && 'text' in file.rawFile) {
          const text = await file.rawFile.text();
          if (!isCancelled) setPreviewText(text);
          return;
        }

        if (file.dataUrl) {
          const response = await fetch(file.dataUrl);
          const text = await response.text();
          if (!isCancelled) setPreviewText(text);
        }
      } catch {
        if (!isCancelled) setPreviewText(null);
      }
    };

    loadTextPreview();

    return () => {
      isCancelled = true;
    };
  }, [file.dataUrl, file.rawFile, file.textContent]);

  const lines = buildTextLines(previewText);
  const fallbackLines = ['{', '  ...', '}'];
  const displayLines = lines.length > 0 ? lines : fallbackLines;

  return (
    <div
      data-thumbnail-kind="text"
      className="h-full w-full overflow-hidden bg-[var(--theme-bg-primary)] text-[var(--theme-text-secondary)]"
    >
      <div className="flex h-full flex-col gap-1 p-2 text-[8px] leading-tight">
        {displayLines.map((line, index) => (
          <div key={`${index}:${line}`} className="flex items-center gap-1">
            <span className="w-2 flex-shrink-0 text-[var(--theme-text-tertiary)]">{index + 1}</span>
            <span className="truncate font-mono">{line}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const PdfThumbnail = ({ file, fallback }: { file: UploadedFile; fallback: React.ReactNode }) => {
  const shouldLoadPreview = !!file.dataUrl;
  const { containerRef, isVisible } = useVisibleThumbnailGate(shouldLoadPreview);

  return (
    <div ref={containerRef} data-thumbnail-kind="pdf" className="h-full w-full overflow-hidden">
      {shouldLoadPreview && isVisible ? (
        <Suspense fallback={fallback}>
          <LazyPdfFileThumbnail file={file} fallback={fallback} />
        </Suspense>
      ) : (
        fallback
      )}
    </div>
  );
};

const VideoThumbnail = ({ file, fallback }: { file: UploadedFile; fallback: React.ReactNode }) => {
  if (!file.dataUrl) {
    return (
      <div data-thumbnail-kind="video" className="h-full w-full">
        {fallback}
      </div>
    );
  }

  return (
    <div data-thumbnail-kind="video" className="relative h-full w-full overflow-hidden bg-black">
      <video
        src={`${file.dataUrl}#t=0.1`}
        className="h-full w-full object-cover"
        muted
        playsInline
        preload="metadata"
        aria-label={file.name}
      />
      <div className="absolute inset-x-2 bottom-2 h-1 rounded-full bg-white/20">
        <div className="h-full w-1/3 rounded-full bg-white/70" />
      </div>
    </div>
  );
};

const AudioThumbnail = ({ file }: { file: UploadedFile }) => {
  const bars = useMemo(() => getWaveformBars(file), [file]);

  return (
    <div
      data-thumbnail-kind="audio"
      className="flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-purple-950 via-slate-950 to-cyan-950 px-2"
    >
      <div className="flex h-12 w-full items-center justify-center gap-0.5">
        {bars.map((height, index) => (
          <span
            key={index}
            data-waveform-bar="true"
            className="w-1 rounded-full bg-cyan-200/80 shadow-[0_0_8px_rgba(103,232,249,0.35)]"
            style={{ height: `${Math.min(88, height)}%` }}
          />
        ))}
      </div>
    </div>
  );
};

const CoverThumbnail = ({ file, Icon, colorClass, bgClass }: FileThumbnailProps) => {
  const category = getFileTypeCategory(file.type, file.error);
  const extension = getDisplayExtension(file);

  return (
    <div data-thumbnail-kind={category} className={`relative h-full w-full overflow-hidden ${bgClass} p-2`}>
      <div className="absolute inset-0 opacity-50">
        {category === 'spreadsheet' ? (
          <div className="grid h-full w-full grid-cols-4 grid-rows-5 gap-px p-2">
            {Array.from({ length: 20 }, (_, index) => (
              <span key={index} className="rounded-[2px] bg-white/25" />
            ))}
          </div>
        ) : category === 'presentation' ? (
          <div className="flex h-full w-full items-center justify-center p-3">
            <span className="h-10 w-14 rounded border border-white/35 bg-white/20" />
          </div>
        ) : category === 'archive' ? (
          <div className="flex h-full w-full flex-col gap-1 p-3">
            {Array.from({ length: 5 }, (_, index) => (
              <span key={index} className="h-1.5 rounded-full bg-white/25" />
            ))}
          </div>
        ) : (
          <div className="flex h-full w-full flex-col gap-1.5 p-3">
            {Array.from({ length: 4 }, (_, index) => (
              <span key={index} className="h-1.5 rounded-full bg-white/25" />
            ))}
          </div>
        )}
      </div>
      <div className="relative flex h-full flex-col items-center justify-center gap-1">
        <div className="rounded-lg bg-[var(--theme-bg-primary)]/80 p-1.5 shadow-sm">
          <Icon size={19} className={colorClass} strokeWidth={1.6} />
        </div>
        <span className="max-w-full rounded bg-[var(--theme-bg-primary)]/80 px-1.5 py-0.5 text-[8px] font-semibold leading-none text-[var(--theme-text-secondary)]">
          {extension}
        </span>
      </div>
    </div>
  );
};

export const FileThumbnail: React.FC<FileThumbnailProps> = (props) => {
  const { file } = props;
  const category = getFileTypeCategory(file.type, file.error);
  const fallback = <CoverThumbnail {...props} />;

  if (file.dataUrl && SUPPORTED_IMAGE_MIME_TYPES.includes(file.type)) {
    return (
      <img
        data-thumbnail-kind="image"
        src={file.dataUrl}
        alt={file.name}
        className="h-full w-full rounded-lg object-cover shadow-sm"
      />
    );
  }

  if (category === 'pdf') {
    return <PdfThumbnail file={file} fallback={fallback} />;
  }

  if (category === 'video') {
    return <VideoThumbnail file={file} fallback={fallback} />;
  }

  if (category === 'audio') {
    return <AudioThumbnail file={file} />;
  }

  if (category === 'spreadsheet') {
    return fallback;
  }

  if (isTextFile(file)) {
    return <TextThumbnail file={file} />;
  }

  return fallback;
};
