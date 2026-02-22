import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Loader2, Repeat } from 'lucide-react';
import { SideViewContent, UploadedFile } from '../../../types';
import { exportSvgAsImage } from '../../../utils/exportUtils';
import { MESSAGE_BLOCK_BUTTON_CLASS } from '../../../constants/appConstants';
import { DiagramWrapper } from './parts/DiagramWrapper';

declare var Viz: any;

const graphvizCache = new Map<string, string>();

interface GraphvizBlockProps {
  code: string;
  onImageClick: (file: UploadedFile) => void;
  isLoading: boolean;
  themeId: string;
  onOpenSidePanel: (content: SideViewContent) => void;
}

export const GraphvizBlock: React.FC<GraphvizBlockProps> = ({ code, onImageClick, isLoading: isMessageLoading, themeId, onOpenSidePanel }) => {
  const [manualLayout, setManualLayout] = useState<'LR' | 'TB' | null>(null);

  const effectiveLayout = useMemo(() => {
      if (manualLayout) return manualLayout;
      const match = code.match(/rankdir\s*=\s*(["']?)(LR|TB|RL|BT)\1/i);
      if (match) {
          const dir = match[2].toUpperCase();
          if (dir === 'TB' || dir === 'BT') return 'TB';
          if (dir === 'LR' || dir === 'RL') return 'LR';
      }
      return 'LR';
  }, [code, manualLayout]);

  const cacheKey = useMemo(() => `${themeId}::${effectiveLayout}::${code}`, [themeId, effectiveLayout, code]);

  const [svgContent, setSvgContent] = useState(() => graphvizCache.get(cacheKey) || '');
  const [error, setError] = useState('');
  const [isRendering, setIsRendering] = useState(() => !graphvizCache.has(cacheKey));
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [diagramFile, setDiagramFile] = useState<UploadedFile | null>(null);
  const [showSource, setShowSource] = useState(false);

  const diagramContainerRef = useRef<HTMLDivElement>(null);
  const vizInstanceRef = useRef<any>(null);

  useEffect(() => {
      if (typeof Viz !== 'undefined' && !vizInstanceRef.current) {
          try {
              vizInstanceRef.current = new Viz();
          } catch (e) {
              console.error("Failed to initialize Viz", e);
          }
      }
  }, []);

  const renderGraph = useCallback(async () => {
    if (graphvizCache.has(cacheKey)) {
        const cachedSvg = graphvizCache.get(cacheKey)!;
        setSvgContent(cachedSvg);
        setIsRendering(false);
        setError('');
        
        const id = `graphviz-svg-${Math.random().toString(36).substring(2, 9)}`;
        const svgDataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(cachedSvg)))}`;
        setDiagramFile({
            id: id,
            name: 'graphviz-diagram.svg',
            type: 'image/svg+xml',
            size: cachedSvg.length,
            dataUrl: svgDataUrl,
            uploadState: 'active'
        });
        return;
    }

    if (!vizInstanceRef.current || !code) return;
    
    setIsRendering(true);

    try {
      let processedCode = code;
      
      const rankdirRegex = /(rankdir\s*=\s*)(["']?)(LR|TB|RL|BT)\2/gi;
      
      if (rankdirRegex.test(processedCode)) {
          processedCode = processedCode.replace(rankdirRegex, `$1"${effectiveLayout}"`);
      } else {
          const digraphMatch = processedCode.match(/(\s*(?:di)?graph\s+[\w\d_"]*\s*\{)/i);
          if (digraphMatch) {
              processedCode = processedCode.replace(digraphMatch[0], `${digraphMatch[0]}\n  rankdir="${effectiveLayout}";`);
          }
      }

      const isDark = themeId === 'onyx';
      const color = isDark ? '#e4e4e7' : '#374151';
      const themeDefaults = `
        graph [bgcolor="transparent" fontcolor="${color}" margin="0"];
        node [color="${color}" fontcolor="${color}"];
        edge [color="${color}" fontcolor="${color}"];
      `;
      
      const openBraceIndex = processedCode.indexOf('{');
      if (openBraceIndex !== -1) {
          processedCode = processedCode.slice(0, openBraceIndex + 1) + themeDefaults + processedCode.slice(openBraceIndex + 1);
      }

      const svgElement = await vizInstanceRef.current.renderSVGElement(processedCode);
      
      // 【修复关键点 1】：不要移除原生的 width 和 height，以防止在 Flexbox 中被压缩为 0
      // svgElement.removeAttribute('width');
      // svgElement.removeAttribute('height');
      
      // 依靠 max-width 依然可以保持图片在小屏幕的响应式缩小（不会撑破容器）
      svgElement.style.maxWidth = "100%";
      svgElement.style.height = "auto";
      svgElement.style.display = "block";

      const svgString = svgElement.outerHTML;
      graphvizCache.set(cacheKey, svgString);
      setSvgContent(svgString);

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
      
      setError('');
      setIsRendering(false);

    } catch (e) {
        if (isMessageLoading) {
            setIsRendering(true);
        } else {
            const errorMessage = e instanceof Error ? e.message : 'Failed to render Graphviz diagram.';
            setError(errorMessage.replace(/.*error:\s*/, ''));
            setSvgContent('');
            setIsRendering(false);
        }
    }
  }, [code, effectiveLayout, themeId, isMessageLoading, cacheKey]);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const performRender = async () => {
        if (!isMounted) return;
        if (!vizInstanceRef.current) {
             if (typeof Viz !== 'undefined') {
                 vizInstanceRef.current = new Viz();
             } else {
                 return;
             }
        }
        await renderGraph();
    };

    timeoutId = setTimeout(performRender, 500);

    let pollInterval: number;
    if (typeof Viz === 'undefined') {
        pollInterval = window.setInterval(() => {
            if (typeof Viz !== 'undefined') {
                clearInterval(pollInterval);
                performRender();
            }
        }, 100);
    }

    return () => {
        isMounted = false;
        clearTimeout(timeoutId);
        if (pollInterval) clearInterval(pollInterval);
    };
  }, [renderGraph]);

  const handleToggleLayout = () => {
    setManualLayout(effectiveLayout === 'LR' ? 'TB' : 'LR');
  };
  
  const handleDownloadJpg = async () => {
    if (!svgContent || isDownloading) return;
    setIsDownloading(true);
    try {
        await exportSvgAsImage(svgContent, `graphviz-diagram-${Date.now()}.jpg`, 5, 'image/jpeg');
    } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to export diagram.');
    } finally {
        setIsDownloading(false);
    }
  };

  const layoutToggleBtn = (
    <button onClick={handleToggleLayout} disabled={isRendering} className={MESSAGE_BLOCK_BUTTON_CLASS} title={`Toggle Layout (Current: ${effectiveLayout})`}>
        {isRendering ? <Loader2 size={14} className="animate-spin"/> : <Repeat size={14} />}
    </button>
  );

  return (
    <DiagramWrapper
        title="Graphviz"
        code={code}
        error={error}
        isRendering={isRendering}
        isDownloading={isDownloading}
        diagramFile={diagramFile}
        showSource={showSource}
        setShowSource={setShowSource}
        onImageClick={onImageClick}
        onDownloadJpg={handleDownloadJpg}
        onOpenSidePanel={() => onOpenSidePanel({ type: 'graphviz', content: code, title: 'Graphviz Diagram' })}
        themeId={themeId}
        containerRef={diagramContainerRef}
        extraActions={layoutToggleBtn}
    >
        {/* 【修复关键点 2】：添加 w-full 占满空间，并加上 custom-scrollbar 防止超宽图溢出 */}
        <div className="w-full flex justify-center overflow-x-auto custom-scrollbar" dangerouslySetInnerHTML={{ __html: svgContent }} />
    </DiagramWrapper>
  );
};
