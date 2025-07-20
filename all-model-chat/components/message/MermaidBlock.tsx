import React, { useEffect, useState, useRef } from 'react';
import mermaid from 'mermaid';
import { Loader2, AlertTriangle } from 'lucide-react';
import { UploadedFile } from '../../types';

interface MermaidBlockProps {
  code: string;
  onImageClick?: (file: UploadedFile) => void;
}

export const MermaidBlock: React.FC<MermaidBlockProps> = ({ code, onImageClick }) => {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
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

  const handleContainerClick = () => {
    if (!onImageClick || !svg) return;

    let dataUrl = '';
    try {
      // This is the robust way to handle Unicode characters in the string to be base64 encoded.
      dataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
    } catch (e) {
      console.warn("UTF-8 to Base64 conversion failed, falling back to direct btoa:", e);
      try {
        dataUrl = `data:image/svg+xml;base64,${btoa(svg)}`;
      } catch (e2) {
        console.error("Direct btoa conversion also failed for Mermaid SVG:", e2);
        return; // Can't create a data URL, so can't open the modal.
      }
    }

    const syntheticFile: UploadedFile = {
      id: `mermaid-${Math.random().toString(36).substring(2, 9)}`,
      name: 'Mermaid Diagram.svg',
      type: 'image/svg+xml',
      size: svg.length,
      dataUrl,
      uploadState: 'active',
    };
    onImageClick(syntheticFile);
  };

  const containerClasses = "p-4 my-2 border border-[var(--theme-border-secondary)] rounded-lg shadow-inner overflow-auto custom-scrollbar flex items-center justify-center min-h-[150px]";
  const clickableClass = onImageClick ? 'cursor-zoom-in' : '';

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
      ref={containerRef}
      className={`${containerClasses} bg-white ${clickableClass}`}
      onClick={handleContainerClick}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};
