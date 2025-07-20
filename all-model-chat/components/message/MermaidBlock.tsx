import React, { useEffect, useState, useRef } from 'react';
import mermaid from 'mermaid';
import { Loader2, AlertTriangle, Maximize } from 'lucide-react';
import { UploadedFile } from '../../types';
import { generateUniqueId } from '../../utils/appUtils';

interface MermaidBlockProps {
  code: string;
  onImageClick: (file: UploadedFile) => void;
}

export const MermaidBlock: React.FC<MermaidBlockProps> = ({ code, onImageClick }) => {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const svgDataUrl = useRef<string | null>(null);

  useEffect(() => {
    const renderMermaid = async () => {
      setIsLoading(true);
      setError('');
      try {
        const id = `mermaid-svg-${generateUniqueId()}`;
        const { svg: renderedSvg } = await mermaid.render(id, code);
        setSvg(renderedSvg);
        // This is a robust way to base64 encode strings with potential UTF-8 characters
        const base64 = btoa(unescape(encodeURIComponent(renderedSvg)));
        svgDataUrl.current = `data:image/svg+xml;base64,${base64}`;
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Failed to render Mermaid diagram.';
        setError(errorMessage.replace(/.*error:\s*/, ''));
        setSvg('');
        svgDataUrl.current = null;
      } finally {
        setIsLoading(false);
      }
    };

    if (code) {
      setTimeout(renderMermaid, 50); // Small delay to prevent blocking UI thread
    }
  }, [code]);

  const handleZoomClick = (event?: React.MouseEvent) => {
    event?.stopPropagation();
    if (!svgDataUrl.current) return;

    const pseudoFile: UploadedFile = {
      id: generateUniqueId(),
      name: 'Mermaid Diagram.svg',
      type: 'image/svg+xml',
      size: svg.length,
      dataUrl: svgDataUrl.current,
      uploadState: 'active',
    };
    onImageClick(pseudoFile);
  };

  const containerClasses = "p-4 my-2 border border-[var(--theme-border-secondary)] rounded-lg shadow-inner overflow-auto custom-scrollbar flex items-center justify-center min-h-[150px] relative group";

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
    <div
      className={`${containerClasses} bg-white cursor-zoom-in`}
      onClick={() => handleZoomClick()}
      title="Click to zoom"
    >
      <div dangerouslySetInnerHTML={{ __html: svg }} className="w-full h-full" />
      <button 
        onClick={handleZoomClick} 
        className="absolute top-2 right-2 p-1.5 bg-black/30 text-white rounded-full opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-black/50"
        title="Zoom Diagram"
      >
        <Maximize size={14} />
      </button>
    </div>
  );
};
