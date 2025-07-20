import React, { useEffect, useState, useRef } from 'react';
import mermaid from 'mermaid';
import { Loader2, AlertTriangle, Download, Maximize } from 'lucide-react';
import { UploadedFile } from '../../types';

interface MermaidBlockProps {
  code: string;
  onImageClick: (file: UploadedFile) => void;
}

export const MermaidBlock: React.FC<MermaidBlockProps> = ({ code, onImageClick }) => {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [diagramFile, setDiagramFile] = useState<UploadedFile | null>(null);
  const diagramContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const renderMermaid = async () => {
      setIsLoading(true);
      setError('');
      setDiagramFile(null);
      try {
        // First, validate the syntax. This throws a detailed error on failure.
        await mermaid.parse(code);

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
        // Clean up verbose mermaid error prefixes and get the core message.
        const cleanError = errorMessage.replace(/.*error:\s*/, '').split('\n\n')[0];
        setError(cleanError);
        setSvg('');
      } finally {
        setIsLoading(false);
      }
    };

    if (code) {
      // Delay slightly to ensure mermaid has initialized
      setTimeout(renderMermaid, 50);
    }
  }, [code]);

  const handleDownloadPng = () => {
    if (!svg || isDownloading || !diagramContainerRef.current) return;
    setIsDownloading(true);
    
    const svgElement = diagramContainerRef.current.querySelector('svg');
    if (!svgElement) {
        setError("Could not find the rendered diagram to export.");
        setIsDownloading(false);
        return;
    }

    const rect = svgElement.getBoundingClientRect();
    const imgWidth = rect.width;
    const imgHeight = rect.height;

    if (imgWidth === 0 || imgHeight === 0) {
        setError("Diagram has zero dimensions, cannot export.");
        setIsDownloading(false);
        return;
    }

    const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    const img = new Image();

    img.onload = () => {
        const canvas = document.createElement('canvas');
        const padding = 20;
        
        canvas.width = imgWidth + padding * 2;
        canvas.height = imgHeight + padding * 2;
        const ctx = canvas.getContext('2d');

        if (ctx) {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Draw using the measured dimensions, not naturalWidth/Height which can be unreliable for SVG
            ctx.drawImage(img, padding, padding, imgWidth, imgHeight);

            const pngUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = pngUrl;
            link.download = `mermaid-diagram-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        setIsDownloading(false);
    };
    
    img.onerror = () => {
        setError("Failed to convert diagram to PNG.");
        setIsDownloading(false);
    };

    img.src = svgDataUrl;
  };


  const containerClasses = "p-4 my-2 border border-[var(--theme-border-secondary)] rounded-lg shadow-inner overflow-auto custom-scrollbar flex items-center justify-center min-h-[150px]";

  if (isLoading) {
    return (
      <div className={`${containerClasses} bg-[var(--theme-bg-tertiary)]`}>
        <Loader2 size={24} className="animate-spin text-[var(--theme-text-link)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 my-2 border border-[var(--theme-bg-danger)] border-opacity-50 bg-[var(--theme-bg-danger)] bg-opacity-10 rounded-lg text-sm">
        <div className="flex items-start gap-2">
            <AlertTriangle size={18} className="flex-shrink-0 mt-0.5 text-[var(--theme-bg-danger)]" />
            <div>
                <strong className="font-semibold text-[var(--theme-text-primary)]">Mermaid Diagram Error</strong>
                <pre className="mt-1 text-xs whitespace-pre-wrap font-mono bg-black/20 p-2 rounded-md custom-scrollbar text-[var(--theme-text-secondary)]">
                    {error}
                </pre>
            </div>
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