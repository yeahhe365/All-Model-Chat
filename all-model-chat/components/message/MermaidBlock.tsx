import React, { useEffect, useState, useRef } from 'react';
import mermaid from 'mermaid';
import { Loader2, AlertTriangle, Download } from 'lucide-react';
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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const renderMermaid = async () => {
      setIsLoading(true);
      setError('');
      try {
        const id = `mermaid-svg-${Math.random().toString(36).substring(2, 9)}`;
        const { svg: renderedSvg } = await mermaid.render(id, code);
        setSvg(renderedSvg);
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Failed to render Mermaid diagram.';
        setError(errorMessage.replace(/.*error:\s*/, '')); // Clean up mermaid's error prefix
        setSvg('');
      } finally {
        setIsLoading(false);
      }
    };

    if (code) {
      setTimeout(renderMermaid, 50);
    }
  }, [code]);

  const getSvgElement = (): SVGSVGElement | null => {
    if (!containerRef.current) return null;
    return containerRef.current.querySelector('svg');
  };

  const handleZoom = () => {
    const svgEl = getSvgElement();
    if (!svgEl) return;
    
    const svgHtml = svgEl.outerHTML;
    // Handle UTF-8 characters correctly for btoa
    const base64Svg = btoa(unescape(encodeURIComponent(svgHtml)));
    const dataUrl = `data:image/svg+xml;base64,${base64Svg}`;

    const tempFile: UploadedFile = {
      id: `mermaid-diagram-${Date.now()}`,
      name: 'Mermaid Diagram.svg',
      type: 'image/svg+xml',
      size: svgHtml.length,
      dataUrl: dataUrl,
      uploadState: 'active'
    };
    onImageClick(tempFile);
  };

  const handleDownload = async () => {
    const svgEl = getSvgElement();
    if (!svgEl || isDownloading) return;

    setIsDownloading(true);

    try {
      const svgHtml = svgEl.outerHTML;
      const image = new Image();
      const svgBlob = new Blob([svgHtml], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const margin = 20;
        const bbox = svgEl.getBBox();
        canvas.width = bbox.width + margin * 2;
        canvas.height = bbox.height + margin * 2;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(image, margin, margin, bbox.width, bbox.height);
          
          const pngUrl = canvas.toDataURL('image/png');
          const a = document.createElement('a');
          a.href = pngUrl;
          a.download = 'mermaid-diagram.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
        URL.revokeObjectURL(url);
        setIsDownloading(false);
      };
      
      image.onerror = () => {
        setError('Failed to load SVG for PNG conversion.');
        URL.revokeObjectURL(url);
        setIsDownloading(false);
      };

      image.src = url;
    } catch(e) {
      const errorMessage = e instanceof Error ? e.message : 'An error occurred during download.';
      setError(errorMessage);
      setIsDownloading(false);
    }
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
        ref={containerRef}
        className={`${containerClasses} bg-white cursor-pointer`}
        onClick={handleZoom}
        title="Click to zoom"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
       {!isLoading && !error && (
        <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={(e) => { e.stopPropagation(); handleDownload(); }}
            disabled={isDownloading}
            className="p-1.5 bg-black/40 hover:bg-black/60 text-white rounded-full focus:outline-none focus:ring-2 focus:ring-white/50"
            title="Download as PNG"
          >
            {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          </button>
        </div>
      )}
    </div>
  );
};
