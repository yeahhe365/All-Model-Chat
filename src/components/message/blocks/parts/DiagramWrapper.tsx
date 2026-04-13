import React from 'react';
import { Loader2, AlertTriangle, Download, Maximize, Code, Copy, Check, Sidebar } from 'lucide-react';
import { UploadedFile } from '../../../../types';
import { useCopyToClipboard } from '../../../../hooks/useCopyToClipboard';
import { MESSAGE_BLOCK_BUTTON_CLASS } from '../../../../constants/appConstants';

interface DiagramWrapperProps {
  title: string;
  code: string;
  error: string;
  isRendering: boolean;
  isDownloading: boolean;
  diagramFile: UploadedFile | null;
  showSource: boolean;
  setShowSource: (show: boolean) => void;
  onImageClick: (file: UploadedFile) => void;
  onDownloadJpg: () => void;
  onOpenSidePanel: () => void;
  themeId: string;
  children: React.ReactNode;
  extraActions?: React.ReactNode;
  containerRef?: React.RefObject<HTMLDivElement>;
}

export const DiagramWrapper: React.FC<DiagramWrapperProps> = ({
  title, code, error, isRendering, isDownloading, diagramFile,
  showSource, setShowSource, onImageClick, onDownloadJpg, onOpenSidePanel,
  themeId, children, extraActions, containerRef
}) => {
  const { isCopied, copyToClipboard } = useCopyToClipboard();
  
  const handleCopyCode = () => copyToClipboard(code);

  const containerClasses = "p-2 sm:p-4 border border-[var(--theme-border-secondary)] rounded-md shadow-inner overflow-auto custom-scrollbar flex items-center justify-center min-h-[100px] sm:min-h-[150px] transition-colors duration-300";
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
          <div className={`${containerClasses} bg-red-900/20 mb-2 !p-4`}>
            <div className="text-center text-red-400">
                <AlertTriangle className="mx-auto mb-2" />
                <strong className="font-semibold">{title} Error</strong>
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
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--theme-text-tertiary)] px-1">{title}</span>
          <div className="flex items-center gap-1 flex-shrink-0">
             <button onClick={() => setShowSource(!showSource)} className={MESSAGE_BLOCK_BUTTON_CLASS} title={showSource ? "Hide Source" : "Show Source"}>
                <Code size={14} />
             </button>
             {extraActions}
             <button 
                onClick={onOpenSidePanel}
                className={MESSAGE_BLOCK_BUTTON_CLASS}
                title="Open in Side Panel"
             >
                <Sidebar size={14} />
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
                        onClick={(e) => { e.stopPropagation(); onDownloadJpg(); }}
                        disabled={isDownloading}
                        className={MESSAGE_BLOCK_BUTTON_CLASS}
                        title="Download as JPG"
                    >
                        {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                    </button>
                </>
             )}
          </div>
      </div>
      
      <div
        ref={containerRef}
        className={`${containerClasses} ${bgClass} ${diagramFile ? 'cursor-pointer' : ''} ${showSource ? 'rounded-b-none border-b-0' : 'rounded-b-lg'} !my-0 !border-t-0`}
        onClick={() => diagramFile && onImageClick(diagramFile)}
      >
        {children}
      </div>

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
