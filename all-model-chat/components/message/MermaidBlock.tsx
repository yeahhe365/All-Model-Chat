import React, { useEffect, useState, useRef } from 'react';
import mermaid from 'mermaid';
import { Loader2, AlertTriangle, Expand, Download, X } from 'lucide-react';
import { Modal } from '../shared/Modal';

interface MermaidBlockProps {
  code: string;
}

export const MermaidBlock: React.FC<MermaidBlockProps> = ({ code }) => {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);

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
  
  const attachPanZoomEvents = (container: HTMLDivElement | null) => {
    if (!container) return;
    const svgEl = container.querySelector('svg');
    if (!svgEl) return;

    svgEl.style.cursor = 'grab';
    let isPanning = false;
    let startPoint = { x: 0, y: 0 };
    let viewBox = { 
        x: svgEl.viewBox.baseVal.x, 
        y: svgEl.viewBox.baseVal.y, 
        width: svgEl.viewBox.baseVal.width, 
        height: svgEl.viewBox.baseVal.height 
    };

    const onPointerDown = (e: PointerEvent) => {
        if (e.button !== 0) return;
        e.preventDefault();
        isPanning = true;
        startPoint = { x: e.clientX, y: e.clientY };
        viewBox = { x: svgEl.viewBox.baseVal.x, y: svgEl.viewBox.baseVal.y, width: svgEl.viewBox.baseVal.width, height: svgEl.viewBox.baseVal.height };
        svgEl.style.cursor = 'grabbing';
    };

    const onPointerUp = () => {
        isPanning = false;
        svgEl.style.cursor = 'grab';
    };

    const onPointerMove = (e: PointerEvent) => {
        if (!isPanning) return;
        e.preventDefault();
        const clientRect = svgEl.getBoundingClientRect();
        if (clientRect.width === 0 || clientRect.height === 0) return;
        const dx = (startPoint.x - e.clientX) * (viewBox.width / clientRect.width);
        const dy = (startPoint.y - e.clientY) * (viewBox.height / clientRect.height);
        svgEl.setAttribute('viewBox', `${viewBox.x + dx} ${viewBox.y + dy} ${viewBox.width} ${viewBox.height}`);
    };
    
    const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        const { width, height, x, y } = svgEl.viewBox.baseVal;
        const clientRect = svgEl.getBoundingClientRect();
        if (clientRect.width === 0 || clientRect.height === 0) return;
        const mx = e.offsetX;
        const my = e.offsetY;

        const mouseXRatio = mx / clientRect.width;
        const mouseYRatio = my / clientRect.height;
        
        const dw = width * Math.sign(e.deltaY) * 0.05;
        const dh = height * Math.sign(e.deltaY) * 0.05;
        
        const newWidth = Math.max(1, width + dw);
        const newHeight = Math.max(1, height + dh);
        
        const newX = x - (newWidth - width) * mouseXRatio;
        const newY = y - (newHeight - height) * mouseYRatio;
        
        svgEl.setAttribute('viewBox', `${newX} ${newY} ${newWidth} ${newHeight}`);
    };

    svgEl.addEventListener('wheel', onWheel);
    svgEl.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointerleave', onPointerUp);
    container.addEventListener('pointermove', onPointerMove);

    return () => {
        svgEl.removeEventListener('wheel', onWheel);
        svgEl.removeEventListener('pointerdown', onPointerDown);
        container.removeEventListener('pointerup', onPointerUp);
        container.removeEventListener('pointerleave', onPointerUp);
        container.removeEventListener('pointermove', onPointerMove);
    };
  };

  useEffect(() => {
    return attachPanZoomEvents(containerRef.current);
  }, [svg]);

  useEffect(() => {
    if (isModalOpen) {
      return attachPanZoomEvents(modalContainerRef.current);
    }
  }, [isModalOpen, svg]);


  const handleDownload = () => {
    if (!svg) return;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = svg;
    const svgEl = tempDiv.querySelector('svg');
    if (!svgEl) return;
    svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const svgString = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const image = new Image();
    image.onload = () => {
        const canvas = document.createElement('canvas');
        const padding = 40;
        canvas.width = image.width + padding * 2;
        canvas.height = image.height + padding * 2;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, padding, padding);
        const pngUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = `mermaid-diagram-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
    };
    image.src = url;
  };

  const containerClasses = "p-4 my-2 border border-[var(--theme-border-secondary)] rounded-lg shadow-inner overflow-auto custom-scrollbar flex items-center justify-center min-h-[150px] relative group";
  const buttonClasses = "p-1.5 bg-black/30 hover:bg-black/50 text-white rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-[var(--theme-border-focus)]";
  
  const content = (
    <div className={`${containerClasses} bg-white`}>
      {isLoading && <Loader2 size={24} className="animate-spin text-[var(--theme-text-link)]" />}
      {error && (
        <div className="text-center text-[var(--theme-text-danger)] bg-[var(--theme-bg-danger)] bg-opacity-10 p-3 rounded-md">
            <AlertTriangle className="mx-auto mb-2" />
            <strong className="font-semibold">Mermaid Error</strong>
            <pre className="mt-1 text-xs text-left whitespace-pre-wrap text-[var(--theme-text-secondary)]">{error}</pre>
        </div>
      )}
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {!isLoading && !error && svg && (
        <div className="absolute top-2 right-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity z-10">
            <button onClick={() => setIsModalOpen(true)} title="Fullscreen" className={buttonClasses}><Expand size={14} /></button>
            <button onClick={handleDownload} title="Download as PNG" className={buttonClasses}><Download size={14} /></button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {content}
      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} noPadding contentClassName="w-full h-full">
            <div className="w-full h-full bg-black/80 flex items-center justify-center relative p-4 sm:p-8">
                <div
                    ref={modalContainerRef}
                    className="w-full h-full"
                    dangerouslySetInnerHTML={{ __html: svg }}
                />
                <button
                    onClick={() => setIsModalOpen(false)}
                    className="absolute top-2 right-2 sm:top-4 sm:right-4 p-2 bg-gray-700/50 text-white rounded-full hover:bg-gray-600/70 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-white"
                    title="Close Fullscreen (Esc)"
                    aria-label="Close fullscreen"
                >
                    <X size={24} />
                </button>
            </div>
        </Modal>
      )}
    </>
  );
};
