


import React, { useEffect, useState, useRef } from 'react';
import mermaid from 'mermaid';
import { Loader2, AlertTriangle, Download, Maximize } from 'lucide-react';
import { UploadedFile } from '../../types';
import { exportSvgAsPng } from '../../utils/exportUtils';

interface MermaidBlockProps {
  code: string;
  onImageClick: (file: UploadedFile) => void;
  isLoading: boolean;
}

export const MermaidBlock: React.FC<MermaidBlockProps> = ({ code, onImageClick, isLoading: isMessageLoading }) => {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');
  const [isRendering, setIsRendering] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [diagramFile, setDiagramFile] = useState<UploadedFile | null>(null);
  const diagramContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const renderMermaid = async () => {
      setIsRendering(true);
      setError('');
      setDiagramFile(null);
      try {
        const id = `mermaid-svg-${Math.random().toString(36).substring(2, 9)}`;
        // Ensure theme is appropriate for white background rendering
        mermaid.initialize({ startOnLoad: false, theme: 'default' });
        const { svg: renderedSvg } = await mermaid.render(id, code);
        setSvg(renderedSvg);
        
        // Create a data URL for the SVG to be used in the image zoom modal
        const svgDataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(renderedSvg)))}`;
        setDiagramFile({
            id: id,
            name: 'mermaid-diagram.svg',
            type: 'image/svg+xml',
            size: renderedSvg.length,
            dataUrl: svgDataUrl,
            uploadState: 'active'
        });

      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Failed to render Mermaid diagram.';
        setError(errorMessage.replace(/.*error:\s*/, '')); // Clean up mermaid's error prefix
        setSvg('');
      } finally {
        setIsRendering(false);
      }
    };

    if (isMessageLoading) {
        setIsRendering(true);
        setError('');
        setSvg('');
    } else if (code) {
        // Delay slightly to ensure mermaid has initialized and to prevent race conditions on fast streams
        setTimeout(renderMermaid, 100);
    }
  }, [code, isMessageLoading]);

  const handleDownloadPng = async () => {
    if (!svg || isDownloading) return;
    setIsDownloading(true);
    try {
        await exportSvgAsPng(svg, `mermaid-diagram-${Date.now()}.png`);
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Failed to export diagram as PNG.';
        setError(errorMessage);
    } finally {
        setIsDownloading(false);
    }
  };


  const containerClasses = "p-4 my-2 border border-[var(--theme-border-secondary)] rounded-md shadow-inner overflow-auto custom-scrollbar flex items-center justify-center min-h-[150px]";

  if (isRendering) {
    return (
      <div className={`${containerClasses} bg-[var(--theme-bg-tertiary)]`}>
        <Loader2 size={24} className="animate-spin text-[var(--theme-text-link)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${containerClasses} bg-red-900/20`}>
        <div className="text-center text-red-400">
            <AlertTriangle className="mx-auto mb-2" />
            <strong className="font-semibold">Mermaid Error</strong>
            <pre className="mt-1 text-xs text-left whitespace-pre-wrap">{error}</pre>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group">
      <div
        ref={diagramContainerRef}
        className={`${containerClasses} bg-white ${diagramFile ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
        onClick={() => diagramFile && onImageClick(diagramFile)}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {diagramFile && (
         <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
            <button
                onClick={(e) => { e.stopPropagation(); onImageClick(diagramFile); }}
                className="code-block-utility-button rounded-md"
                title="Zoom Diagram"
            >
                <Maximize size={14} />
            </button>
            <button
                onClick={(e) => { e.stopPropagation(); handleDownloadPng(); }}
                disabled={isDownloading}
                className="code-block-utility-button rounded-md"
                title="Download as PNG"
            >
                {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            </button>
        </div>
      )}
    </div>
  );
};