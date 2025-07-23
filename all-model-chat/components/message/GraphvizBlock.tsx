import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Loader2, AlertTriangle, Download, Maximize, Repeat, X } from 'lucide-react';

declare var Viz: any;
declare var Panzoom: any;

interface GraphvizBlockProps {
  code: string;
}

export const GraphvizBlock: React.FC<GraphvizBlockProps> = ({ code }) => {
  const [svgContent, setSvgContent] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [layout, setLayout] = useState<'LR' | 'TB'>('LR');
  const [isRenderingLayout, setIsRenderingLayout] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const diagramContainerRef = useRef<HTMLDivElement>(null);
  const zoomContentRef = useRef<HTMLDivElement>(null);
  const vizInstanceRef = useRef<any>(null);
  const panzoomInstanceRef = useRef<any>(null);
  const wheelListenerRef = useRef<((e: WheelEvent) => void) | null>(null);

  const renderGraph = useCallback(async (newLayout: 'LR' | 'TB') => {
    if (!vizInstanceRef.current) return;
    setIsRenderingLayout(true);
    setError('');

    try {
      let processedCode = code.replace(/rankdir\s*=\s*"\w+"\s*,?/gi, '');
      const graphMatch = processedCode.match(/(\s*graph\s*\[)([^\]]*?)(\s*\])/);
      if (graphMatch) {
        let attrs = graphMatch[2].trim();
        if (attrs.length > 0 && !attrs.endsWith(',')) attrs += ',';
        processedCode = processedCode.replace(
          /(\s*graph\s*\[)[^\]]*?(\s*\])/,
          `$1 ${attrs} rankdir="${newLayout}" $2`
        );
      }
      
      const svgElement = await vizInstanceRef.current.renderSVGElement(processedCode);
      setSvgContent(svgElement.outerHTML);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to render Graphviz diagram.';
      setError(errorMessage.replace(/.*error:\s*/, ''));
      setSvgContent('');
    } finally {
      setIsRenderingLayout(false);
      setIsLoading(false);
    }
  }, [code]);

  useEffect(() => {
    let intervalId: number;
    if (typeof Viz === 'undefined') {
        intervalId = window.setInterval(() => {
            if (typeof Viz !== 'undefined') {
                clearInterval(intervalId);
                vizInstanceRef.current = new Viz({ worker: undefined });
                renderGraph(layout);
            }
        }, 100);
    } else {
        vizInstanceRef.current = new Viz({ worker: undefined });
        renderGraph(layout);
    }
    return () => clearInterval(intervalId);
  }, [renderGraph, layout]);

  const handleToggleLayout = () => {
    const newLayout = layout === 'LR' ? 'TB' : 'LR';
    setLayout(newLayout);
  };
  
  const handleDownloadPng = () => {
    if (!svgContent || isDownloading || !diagramContainerRef.current) return;
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
    const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;
    const img = new Image();
    img.onload = () => {
        const canvas = document.createElement('canvas');
        const padding = 20;
        const scale = 3;
        canvas.width = (imgWidth + padding * 2) * scale;
        canvas.height = (imgHeight + padding * 2) * scale;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, padding * scale, padding * scale, imgWidth * scale, imgHeight * scale);
            const pngUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = pngUrl;
            link.download = `graphviz-diagram-${Date.now()}.png`;
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

  const handleOpenModal = useCallback(() => setIsModalOpen(true), []);
  const handleCloseModal = useCallback(() => setIsModalOpen(false), []);

  useEffect(() => {
    const zoomContainer = zoomContentRef.current;

    if (isModalOpen && zoomContainer && svgContent) {
      zoomContainer.innerHTML = svgContent;
      const svgEl = zoomContainer.querySelector('svg');

      if (svgEl && typeof Panzoom !== 'undefined') {
        svgEl.style.width = '100%';
        svgEl.style.height = '100%';
        svgEl.style.maxWidth = 'none';
        svgEl.style.maxHeight = 'none';
        svgEl.style.cursor = 'grab';

        if (panzoomInstanceRef.current) {
          panzoomInstanceRef.current.destroy();
        }
        panzoomInstanceRef.current = Panzoom(svgEl, {
          maxZoom: 15,
          minZoom: 0.05,
          contain: "outside",
          canvas: true,
        });

        wheelListenerRef.current = panzoomInstanceRef.current.zoomWithWheel;
        zoomContainer.addEventListener('wheel', wheelListenerRef.current, { passive: false });
      }
    }

    return () => {
      if (panzoomInstanceRef.current) {
        if (zoomContainer && wheelListenerRef.current) {
            zoomContainer.removeEventListener('wheel', wheelListenerRef.current);
        }
        panzoomInstanceRef.current.destroy();
        panzoomInstanceRef.current = null;
      }
      if (zoomContainer) {
          zoomContainer.innerHTML = '';
      }
      wheelListenerRef.current = null;
    };
  }, [isModalOpen, svgContent]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') handleCloseModal(); };
    if (isModalOpen) {
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', handleKeyDown);
    } else {
        document.body.style.overflow = '';
    }
    return () => {
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen, handleCloseModal]);


  const containerClasses = "p-4 my-2 border border-[var(--theme-border-secondary)] rounded-lg shadow-inner overflow-auto custom-scrollbar flex items-center justify-center min-h-[150px]";

  if (isLoading) return <div className={`${containerClasses} bg-[var(--theme-bg-tertiary)]`}><Loader2 size={24} className="animate-spin text-[var(--theme-text-link)]" /></div>;

  if (error) return (
      <div className={`${containerClasses} bg-red-900/20`}>
        <div className="text-center text-red-400">
            <AlertTriangle className="mx-auto mb-2" />
            <strong className="font-semibold">Graphviz Error</strong>
            <pre className="mt-1 text-xs text-left whitespace-pre-wrap">{error}</pre>
        </div>
      </div>
  );

  return (
    <div className="relative group">
      <div ref={diagramContainerRef} className={`${containerClasses} bg-white`} dangerouslySetInnerHTML={{ __html: svgContent }} />
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
        <button onClick={handleOpenModal} className="code-block-utility-button rounded-md" title="Fullscreen View"><Maximize size={14} /></button>
        <button onClick={handleToggleLayout} disabled={isRenderingLayout} className="code-block-utility-button rounded-md" title={`Toggle Layout (Current: ${layout})`}>{isRenderingLayout ? <Loader2 size={14} className="animate-spin"/> : <Repeat size={14} />}</button>
        <button onClick={handleDownloadPng} disabled={isDownloading} className="code-block-utility-button rounded-md" title="Download as PNG">{isDownloading ? <Loader2 size={14} className="animate-spin"/> : <Download size={14} />}</button>
      </div>
      {isModalOpen && (
        <div 
            className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center backdrop-blur"
            onClick={handleCloseModal}
            role="dialog" aria-modal="true" aria-labelledby="graphviz-modal-title"
        >
          <div ref={zoomContentRef} className="relative w-[97%] h-[97%] bg-white overflow-hidden rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()}></div>
          <button onClick={handleCloseModal} className="absolute top-3 right-3 w-12 h-12 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors flex items-center justify-center" title="Close Fullscreen (Esc)" aria-label="Close Fullscreen"><X size={30} /></button>
          <h2 id="graphviz-modal-title" className="sr-only">Interactive Diagram View</h2>
        </div>
      )}
    </div>
  );
};
