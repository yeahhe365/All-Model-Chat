
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Loader2, AlertTriangle, Download, Maximize, Repeat, Code, Copy, Check } from 'lucide-react';
import { UploadedFile } from '../../types';
import { exportSvgAsPng } from '../../utils/exportUtils';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import { MESSAGE_BLOCK_BUTTON_CLASS } from '../../constants/appConstants';

declare var Viz: any;

interface GraphvizBlockProps {
  code: string;
  onImageClick: (file: UploadedFile) => void;
  isLoading: boolean;
  themeId: string;
}

export const GraphvizBlock: React.FC<GraphvizBlockProps> = ({ code, onImageClick, isLoading: isMessageLoading, themeId }) => {
  const [svgContent, setSvgContent] = useState('');
  const [error, setError] = useState('');
  const [isRendering, setIsRendering] = useState(true);
  const [layout, setLayout] = useState<'LR' | 'TB'>('LR');
  const [isDownloading, setIsDownloading] = useState(false);
  const [diagramFile, setDiagramFile] = useState<UploadedFile | null>(null);
  const [showSource, setShowSource] = useState(false);
  const { isCopied, copyToClipboard } = useCopyToClipboard();

  const diagramContainerRef = useRef<HTMLDivElement>(null);
  const vizInstanceRef = useRef<any>(null);

  const renderGraph = useCallback(async (currentLayout: 'LR' | 'TB') => {
    if (!vizInstanceRef.current) return;
    setIsRendering(true);
    setError('');
    setDiagramFile(null);

    try {
      let processedCode = code;
      
      // 1. Layout Injection
      const rankdirRegex = /rankdir\s*=\s*"(LR|TB)"/i;
      const graphAttrsRegex = /(\s*(?:di)?graph\s*.*?\[)([^\]]*)(\])/i;
      if (rankdirRegex.test(processedCode)) {
          processedCode = processedCode.replace(rankdirRegex, `rankdir="${currentLayout}"`);
      } else if (graphAttrsRegex.test(processedCode)) {
          processedCode = processedCode.replace(graphAttrsRegex, (match, p1, p2, p3) => {
              const attrs = p2.trim();
              const separator = attrs && !attrs.endsWith(',') ? ', ' : ' ';
              return `${p1}${attrs}${separator}rankdir="${currentLayout}"${p3}`;
          });
      } else {
          const digraphMatch = processedCode.match(/(\s*(?:di)?graph\s+[\w\d_"]*\s*\{)/i);
          if (digraphMatch) {
              processedCode = processedCode.replace(digraphMatch[0], `${digraphMatch[0]}\n  graph [rankdir="${currentLayout}"];`);
          }
      }

      // 2. Theme Injection
      const isDark = themeId === 'onyx';
      const color = isDark ? '#e4e4e7' : '#374151'; // zinc-200 : gray-700
      const themeDefaults = `
        graph [bgcolor="transparent" fontcolor="${color}"];
        node [color="${color}" fontcolor="${color}"];
        edge [color="${color}" fontcolor="${color}"];
      `;
      
      // Insert defaults right after the opening brace
      const openBraceIndex = processedCode.indexOf('{');
      if (openBraceIndex !== -1) {
          processedCode = processedCode.slice(0, openBraceIndex + 1) + themeDefaults + processedCode.slice(openBraceIndex + 1);
      }

      const svgElement = await vizInstanceRef.current.renderSVGElement(processedCode);
      const svgString = svgElement.outerHTML;
      setSvgContent(svgString);

      // Create UploadedFile object for preview (matches MermaidBlock pattern)
      const id = `graphviz-svg-${Math.random().toString(36).substring(2, 9)}`;
      const svgDataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgString)))}`;
      
      setDiagramFile({
          id: id,
          name: 'graphviz-diagram.svg',
          type: 'image/svg+xml',
          size: svgString.length,
          dataUrl: svgDataUrl,
          uploadState: 'active'
      });

    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to render Graphviz diagram.';
      setError(errorMessage.replace(/.*error:\s*/, ''));
      setSvgContent('');
    } finally {
      setIsRendering(false);
    }
  }, [code, themeId]);

  useEffect(() => {
    let intervalId: number;
    
    if (isMessageLoading) {
        setIsRendering(true);
        setError('');
        setSvgContent('');
    } else if (code) {
        const initAndRender = () => {
            vizInstanceRef.current = new Viz({ worker: undefined });
            renderGraph(layout);
        };
        if (typeof Viz === 'undefined') {
            intervalId = window.setInterval(() => {
                if (typeof Viz !== 'undefined') {
                    clearInterval(intervalId);
                    initAndRender();
                }
            }, 100);
        } else {
            initAndRender();
        }
    }
    return () => clearInterval(intervalId);
  }, [renderGraph, layout, code, isMessageLoading]);

  const handleToggleLayout = () => {
    const newLayout = layout === 'LR' ? 'TB' : 'LR';
    setLayout(newLayout);
  };
  
  const handleDownloadPng = async () => {
    if (!svgContent || isDownloading) return;
    setIsDownloading(true);
    try {
        await exportSvgAsPng(svgContent, `graphviz-diagram-${Date.now()}.png`);
    } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to export diagram.');
    } finally {
        setIsDownloading(false);
    }
  };

  const handleCopyCode = () => {
      copyToClipboard(code);
  };

  const containerClasses = "p-4 border border-[var(--theme-border-secondary)] rounded-md shadow-inner overflow-auto custom-scrollbar flex items-center justify-center min-h-[150px] transition-colors duration-300";
  const bgClass = themeId === 'onyx' ? 'bg-[var(--theme-bg-secondary)]' : 'bg-white';

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
                    <strong className="font-semibold">Graphviz Error</strong>
                    <pre className="mt-1 text-xs text-left whitespace-pre-wrap">{error}</pre>
                </div>
            </div>
            <div className="relative rounded-lg border border-[var(--theme-border-primary)] bg-[var(--theme-bg-code-block)] p-4 overflow-auto">
                <pre className="text-xs font-mono text-[var(--theme-text-secondary)]">{code}</pre>
            </div>
        </div>
      );
  }

  return (
    <div className="relative group my-3">
      <div className="flex items-center justify-between px-3 py-2 border border-[var(--theme-border-secondary)] border-b-0 rounded-t-lg bg-[var(--theme-bg-tertiary)]/30 backdrop-blur-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--theme-text-tertiary)] px-1">Graphviz</span>
          <div className="flex items-center gap-1 flex-shrink-0">
             <button onClick={() => setShowSource(!showSource)} className={MESSAGE_BLOCK_BUTTON_CLASS} title={showSource ? "Hide Source" : "Show Source"}>
                <Code size={14} />
             </button>
             <button onClick={handleToggleLayout} disabled={isRendering} className={MESSAGE_BLOCK_BUTTON_CLASS} title={`Toggle Layout (Current: ${layout})`}>
                {isRendering ? <Loader2 size={14} className="animate-spin"/> : <Repeat size={14} />}
             </button>
             {diagramFile && (
                <>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onImageClick(diagramFile); }}
                        className={MESSAGE_BLOCK_BUTTON_CLASS} 
                        title="Zoom Diagram"
                    >
                        <Maximize size={14} />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleDownloadPng(); }}
                        disabled={isDownloading} 
                        className={MESSAGE_BLOCK_BUTTON_CLASS} 
                        title="Download as PNG"
                    >
                        {isDownloading ? <Loader2 size={14} className="animate-spin"/> : <Download size={14} />}
                    </button>
                </>
             )}
          </div>
      </div>

      <div 
        ref={diagramContainerRef} 
        className={`${containerClasses} ${bgClass} ${diagramFile ? 'cursor-pointer' : ''} ${showSource ? 'rounded-b-none border-b-0' : 'rounded-b-lg'} !my-0 !border-t-0`}
        dangerouslySetInnerHTML={{ __html: svgContent }} 
        onClick={() => diagramFile && onImageClick(diagramFile)}
      />

      {showSource && (
          <div className="relative rounded-b-lg border border-[var(--theme-border-secondary)] border-t-0 bg-[var(--theme-bg-code-block)] overflow-hidden">
              <div className="absolute top-2 right-2 z-10">
                  <button onClick={handleCopyCode} className={MESSAGE_BLOCK_BUTTON_CLASS} title="Copy Code">
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
