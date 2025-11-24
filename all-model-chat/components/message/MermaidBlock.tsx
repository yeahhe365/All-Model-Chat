
import React, { useEffect, useState, useRef } from 'react';
import mermaid from 'mermaid';
import { Loader2, AlertTriangle, Download, Maximize, Code, Copy, Check } from 'lucide-react';
import { UploadedFile } from '../../types';
import { exportSvgAsPng } from '../../utils/exportUtils';

interface MermaidBlockProps {
  code: string;
  onImageClick: (file: UploadedFile) => void;
  isLoading: boolean;
  themeId: string;
}

export const MermaidBlock: React.FC<MermaidBlockProps> = ({ code, onImageClick, isLoading: isMessageLoading, themeId }) => {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');
  const [isRendering, setIsRendering] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [diagramFile, setDiagramFile] = useState<UploadedFile | null>(null);
  const [showSource, setShowSource] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const diagramContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const renderMermaid = async () => {
      setIsRendering(true);
      setError('');
      setDiagramFile(null);
      try {
        const id = `mermaid-svg-${Math.random().toString(36).substring(2, 9)}`;
        
        mermaid.initialize({ 
            startOnLoad: false, 
            theme: themeId === 'onyx' ? 'dark' : 'default',
            securityLevel: 'loose',
            fontFamily: 'inherit'
        });
        
        const { svg: renderedSvg } = await mermaid.render(id, code);
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

      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Failed to render Mermaid diagram.';
        setError(errorMessage.replace(/.*error:\s*/, '')); 
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
        setTimeout(renderMermaid, 100);
    }
  }, [code, isMessageLoading, themeId]);

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

  const handleCopyCode = () => {
      navigator.clipboard.writeText(code).then(() => {
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
      });
  };

  const containerClasses = "p-4 border border-[var(--theme-border-secondary)] rounded-md shadow-inner overflow-auto custom-scrollbar flex items-center justify-center min-h-[150px] transition-colors duration-300";
  const bgClass = themeId === 'onyx' ? 'bg-[var(--theme-bg-secondary)]' : 'bg-white';
  const buttonClass = "p-1.5 rounded-md text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)]/50 transition-all duration-200 focus:outline-none opacity-70 hover:opacity-100";

  if (isRendering) {
    return (
      <div className={`${containerClasses} bg-[var(--theme-bg-tertiary)] my-2`}>
        <Loader2 size={24} className="animate-spin text-[var(--theme-text-link)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-2">
          <div className={`${containerClasses} bg-red-900/20 mb-2`}>
            <div className="text-center text-red-400">
                <AlertTriangle className="mx-auto mb-2" />
                <strong className="font-semibold">Mermaid Error</strong>
                <pre className="mt-1 text-xs text-left whitespace-pre-wrap">{error}</pre>
            </div>
          </div>
          {/* Always show code on error so user can debug */}
          <div className="relative rounded-lg border border-[var(--theme-border-primary)] bg-[var(--theme-bg-code-block)] p-4 overflow-auto">
             <pre className="text-xs font-mono text-[var(--theme-text-secondary)]">{code}</pre>
          </div>
      </div>
    );
  }

  return (
    <div className="relative group my-3">
      <div className="flex items-center justify-between px-3 py-2 border border-[var(--theme-border-secondary)] border-b-0 rounded-t-lg bg-[var(--theme-bg-tertiary)]/30 backdrop-blur-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--theme-text-tertiary)] px-1">Mermaid</span>
          <div className="flex items-center gap-1">
             <button onClick={() => setShowSource(!showSource)} className={buttonClass} title={showSource ? "Hide Source" : "Show Source"}>
                <Code size={14} />
             </button>
             {diagramFile && (
                <>
                    <button
                        onClick={(e) => { e.stopPropagation(); onImageClick(diagramFile); }}
                        className={buttonClass}
                        title="Zoom Diagram"
                    >
                        <Maximize size={14} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleDownloadPng(); }}
                        disabled={isDownloading}
                        className={buttonClass}
                        title="Download as PNG"
                    >
                        {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                    </button>
                </>
             )}
          </div>
      </div>
      
      <div
        ref={diagramContainerRef}
        className={`${containerClasses} ${bgClass} ${diagramFile ? 'cursor-pointer' : ''} ${showSource ? 'rounded-b-none border-b-0' : 'rounded-b-lg'} !my-0 !border-t-0`}
        onClick={() => diagramFile && onImageClick(diagramFile)}
        dangerouslySetInnerHTML={{ __html: svg }}
      />

      {showSource && (
          <div className="relative rounded-b-lg border border-[var(--theme-border-secondary)] border-t-0 bg-[var(--theme-bg-code-block)] overflow-hidden">
              <div className="absolute top-2 right-2 z-10">
                  <button onClick={handleCopyCode} className={buttonClass} title="Copy Code">
                      {isCopied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  </button>
              </div>
              <pre className="p-4 text-xs font-mono !text-[var(--theme-text-primary)] !bg-[var(--theme-bg-code-block)] overflow-auto max-h-[300px] custom-scrollbar outline-none">
                  {code}
              </pre>
          </div>
      )}
    </div>
  );
};
