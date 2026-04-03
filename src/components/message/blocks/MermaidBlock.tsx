import React, { useEffect, useState, useRef } from 'react';
import mermaid from 'mermaid';
import { SideViewContent, UploadedFile } from '../../../types';
import { exportSvgAsImage } from '../../../utils/exportUtils';
import { DiagramWrapper } from './parts/DiagramWrapper';

interface MermaidBlockProps {
  code: string;
  onImageClick: (file: UploadedFile) => void;
  isLoading: boolean;
  themeId: string;
  onOpenSidePanel: (content: SideViewContent) => void;
}

export const MermaidBlock: React.FC<MermaidBlockProps> = ({ code, onImageClick, isLoading: isMessageLoading, themeId, onOpenSidePanel }) => {
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
            fontFamily: 'inherit'
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
            uploadState: 'active'
        });
        setError('');
        setIsRendering(false);

      } catch (e) {
        if (!isMounted) return;

        if (isMessageLoading) {
            setIsRendering(true);
        } else {
            const errorMessage = e instanceof Error ? e.message : 'Failed to render Mermaid diagram.';
            setError(errorMessage.replace(/.*error:\s*/, '')); 
            setSvg('');
            setIsRendering(false);
        }
      }
    }, 500);

    return () => {
        isMounted = false;
        clearTimeout(timeoutId);
    };
  }, [code, isMessageLoading, themeId]);

  const handleDownloadJpg = async () => {
    if (!svg || isDownloading) return;
    setIsDownloading(true);
    try {
        await exportSvgAsImage(svg, `mermaid-diagram-${Date.now()}.jpg`, 3, 'image/jpeg');
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Failed to export diagram as JPG.';
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
        onOpenSidePanel={() => onOpenSidePanel({ type: 'mermaid', content: code, title: 'Mermaid Diagram' })}
        themeId={themeId}
        containerRef={diagramContainerRef}
    >
        <div dangerouslySetInnerHTML={{ __html: svg }} />
    </DiagramWrapper>
  );
};
