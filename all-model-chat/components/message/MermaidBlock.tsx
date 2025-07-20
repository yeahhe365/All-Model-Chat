import React, { useEffect, useState, useRef } from 'react';
import mermaid from 'mermaid';
import { Loader2, AlertTriangle } from 'lucide-react';

interface MermaidBlockProps {
  code: string;
}

export const MermaidBlock: React.FC<MermaidBlockProps> = ({ code }) => {
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

  useEffect(() => {
    if (!svg || !containerRef.current) return;
    const svgEl = containerRef.current.querySelector('svg');
    if (!svgEl) return;

    svgEl.style.cursor = 'grab';
    let isPanning = false;
    let startPoint = { x: 0, y: 0 };
    let viewBox = { x: 0, y: 0, width: svgEl.width.baseVal.value, height: svgEl.height.baseVal.value };

    const onPointerDown = (e: PointerEvent) => {
        isPanning = true;
        startPoint = { x: e.clientX, y: e.clientY };
        svgEl.style.cursor = 'grabbing';
    };

    const onPointerUp = () => {
        isPanning = false;
        svgEl.style.cursor = 'grab';
    };

    const onPointerMove = (e: PointerEvent) => {
        if (!isPanning) return;
        const dx = startPoint.x - e.clientX;
        const dy = startPoint.y - e.clientY;
        svgEl.setAttribute('viewBox', `${viewBox.x + dx} ${viewBox.y + dy} ${viewBox.width} ${viewBox.height}`);
    };
    
    const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        const { width, height } = svgEl.viewBox.baseVal;
        const dw = width * Math.sign(e.deltaY) * 0.05;
        const dh = height * Math.sign(e.deltaY) * 0.05;
        viewBox = { x: svgEl.viewBox.baseVal.x, y: svgEl.viewBox.baseVal.y, width: width + dw, height: height + dh };
        svgEl.setAttribute('viewBox', `${viewBox.x - dw/2} ${viewBox.y - dh/2} ${viewBox.width} ${viewBox.height}`);
    };

    svgEl.addEventListener('wheel', onWheel);
    svgEl.addEventListener('pointerdown', onPointerDown);
    svgEl.addEventListener('pointerup', onPointerUp);
    svgEl.addEventListener('pointerleave', onPointerUp);
    svgEl.addEventListener('pointermove', onPointerMove);

    return () => {
        svgEl.removeEventListener('wheel', onWheel);
        svgEl.removeEventListener('pointerdown', onPointerDown);
        svgEl.removeEventListener('pointerup', onPointerUp);
        svgEl.removeEventListener('pointerleave', onPointerUp);
        svgEl.removeEventListener('pointermove', onPointerMove);
    }
  }, [svg]);

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
    <div
      ref={containerRef}
      className={`${containerClasses} bg-white`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};
