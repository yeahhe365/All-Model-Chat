import React, { useEffect, useState, useRef } from 'react';
import mermaid from 'mermaid';
import { type SideViewContent, type UploadedFile } from '@/types';
import { DiagramWrapper } from './parts/DiagramWrapper';
import { useI18n } from '@/contexts/I18nContext';

interface MermaidBlockProps {
  code: string;
  onImageClick: (file: UploadedFile) => void;
  isLoading: boolean;
  themeId: string;
  onOpenSidePanel: (content: SideViewContent) => void;
  renderDelayMs?: number;
}

export const MermaidBlock: React.FC<MermaidBlockProps> = ({
  code,
  onImageClick,
  isLoading: isMessageLoading,
  themeId,
  onOpenSidePanel,
  renderDelayMs = 500,
}) => {
  const { t } = useI18n();
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');
  const [isRendering, setIsRendering] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [diagramFile, setDiagramFile] = useState<UploadedFile | null>(null);
  const [showSource, setShowSource] = useState(false);
  const diagramContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    // Debounce rendering to avoid syntax errors while typing
    const timeoutId = setTimeout(async () => {
      if (!code) return;

      try {
        const id = `mermaid-svg-${Math.random().toString(36).substring(2, 9)}`;

        mermaid.initialize({
          startOnLoad: false,
          theme: themeId === 'onyx' ? 'dark' : 'default',
          securityLevel: 'loose',
          fontFamily: 'inherit',
        });

        const { svg: renderedSvg } = await mermaid.render(id, code);

        if (!isMounted) return;

        setSvg(renderedSvg);

        const svgDataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(renderedSvg)))}`;
        setDiagramFile({
          id: id,
          name: 'mermaid-diagram.svg',
          type: 'image/svg+xml',
          size: renderedSvg.length,
          dataUrl: svgDataUrl,
          uploadState: 'active',
        });
        setError('');
        setIsRendering(false);
      } catch (e) {
        if (!isMounted) return;

        if (isMessageLoading) {
          setIsRendering(true);
        } else {
          const errorMessage = e instanceof Error ? e.message : t('diagram_render_mermaid_failed');
          setError(errorMessage.replace(/.*error:\s*/, ''));
          setSvg('');
          setIsRendering(false);
        }
      }
    }, renderDelayMs);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [code, isMessageLoading, themeId, renderDelayMs, t]);

  const handleDownloadJpg = async () => {
    if (!svg || isDownloading) return;
    setIsDownloading(true);
    try {
      const { exportSvgAsImage } = await import('@/utils/export/image');
      await exportSvgAsImage(svg, `mermaid-diagram-${Date.now()}.jpg`, 3, 'image/jpeg');
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : t('diagram_export_jpg_failed');
      setError(errorMessage);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <DiagramWrapper
      title="Mermaid"
      code={code}
      error={error}
      isRendering={isRendering}
      isDownloading={isDownloading}
      diagramFile={diagramFile}
      showSource={showSource}
      setShowSource={setShowSource}
      onImageClick={onImageClick}
      onDownloadJpg={handleDownloadJpg}
      onOpenSidePanel={() => onOpenSidePanel({ type: 'mermaid', content: code, title: t('diagram_mermaid_title') })}
      themeId={themeId}
      containerRef={diagramContainerRef}
    >
      <div dangerouslySetInnerHTML={{ __html: svg }} />
    </DiagramWrapper>
  );
};
