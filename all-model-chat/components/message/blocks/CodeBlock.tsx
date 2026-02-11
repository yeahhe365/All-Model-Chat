
import React, { useMemo } from 'react';
import { ChevronDown, ChevronUp, X, Terminal, AlertTriangle, FileOutput } from 'lucide-react';
import { translations } from '../../../utils/appUtils';
import { SideViewContent, UploadedFile } from '../../../types';
import { useCodeBlock } from '../../../hooks/ui/useCodeBlock';
import { usePyodide } from '../../../hooks/usePyodide';
import { CodeHeader } from './parts/CodeHeader';
import { extractTextFromNode } from '../../../utils/uiUtils';
import { FileDisplay } from '../FileDisplay';

interface CodeBlockProps {
  children: React.ReactNode;
  className?: string;
  onOpenHtmlPreview: (html: string, options?: { initialTrueFullscreen?: boolean }) => void;
  expandCodeBlocksByDefault: boolean;
  t: (key: keyof typeof translations) => string;
  onOpenSidePanel: (content: SideViewContent) => void;
}

export const CodeBlock: React.FC<CodeBlockProps> = (props) => {
    const {
        preRef,
        isExpanded,
        isOverflowing,
        isCopied,
        finalLanguage,
        showPreview,
        handleToggleExpand,
        handleCopy,
        handleOpenSide,
        handleFullscreenPreview,
        handleDownload,
        codeElement,
        COLLAPSE_THRESHOLD_PX
    } = useCodeBlock(props);

    // Pyodide Execution Logic
    const {
        isRunning,
        output,
        image,
        files,
        error,
        hasRun,
        runCode,
        clearOutput
    } = usePyodide();

    const isPython = finalLanguage.toLowerCase() === 'python' || finalLanguage.toLowerCase() === 'py';
    
    // Extract raw code for execution
    const rawCode = useMemo(() => {
        if (!isPython) return '';
        if (codeElement) {
            return extractTextFromNode(codeElement.props.children);
        }
        return extractTextFromNode(props.children);
    }, [codeElement, props.children, isPython]);

    const handleRun = () => {
        if (rawCode) runCode(rawCode);
    };

    const generatedFiles = useMemo(() => {
        return files.map((f, i) => {
            const dataUrl = `data:${f.type};base64,${f.data}`;
            // Construct a temporary UploadedFile object for compatibility with FileDisplay
            return {
                id: `generated-file-${i}`,
                name: f.name,
                type: f.type,
                size: 0, // Size not critical here
                dataUrl: dataUrl,
                uploadState: 'active' as const
            };
        });
    }, [files]);

    return (
        <div className="group relative my-3 rounded-lg border border-[var(--theme-border-primary)] bg-[var(--theme-bg-code-block)] shadow-sm">
            <CodeHeader 
                language={finalLanguage}
                showPreview={showPreview}
                isOverflowing={isOverflowing}
                isExpanded={isExpanded}
                isCopied={isCopied}
                onToggleExpand={handleToggleExpand}
                onCopy={handleCopy}
                onDownload={handleDownload}
                onOpenSide={handleOpenSide}
                onFullscreen={handleFullscreenPreview}
                t={props.t}
                // Execution Props
                canRun={isPython}
                isRunning={isRunning}
                onRun={handleRun}
            />
            
            <div className="relative">
                <pre 
                    ref={preRef} 
                    className={`${props.className} group !m-0 !p-0 !border-none !rounded-none !bg-transparent custom-scrollbar !overflow-x-auto`}
                    style={{
                        transition: 'max-height 0.3s ease-out',
                        overflowY: isExpanded || !isOverflowing ? 'visible' : 'hidden',
                        maxHeight: isExpanded || !isOverflowing ? 'none' : `${COLLAPSE_THRESHOLD_PX}px`,
                    }}
                >
                    {codeElement ? (
                        React.cloneElement(codeElement as React.ReactElement, {
                            className: `${codeElement.props.className || ''} !p-4 ${isOverflowing ? '!pb-14' : ''} !block font-mono text-[13px] sm:text-sm leading-relaxed !cursor-text`,
                            onClick: undefined,
                            title: undefined,
                        } as any)
                    ) : (
                        <span className={`block p-4 font-mono text-sm ${isOverflowing ? 'pb-14' : ''}`}>{props.children}</span>
                    )}
                </pre>
                
                {isOverflowing && !isExpanded && (
                    <div 
                        className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[var(--theme-bg-code-block)] to-transparent cursor-pointer flex items-end justify-center pb-2 group/expand code-block-expand-overlay"
                        onClick={handleToggleExpand}
                    >
                        <span className="text-xs font-medium text-[var(--theme-text-tertiary)] group-hover/expand:text-[var(--theme-text-primary)] flex items-center gap-1 bg-[var(--theme-bg-primary)]/80 px-3 py-1 rounded-full shadow-sm border border-[var(--theme-border-secondary)] backdrop-blur-md transition-all transform group-hover/expand:scale-105">
                            <ChevronDown size={12} /> Show more
                        </span>
                    </div>
                )}
                {isOverflowing && isExpanded && (
                    <div 
                        className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none z-10 code-block-expand-overlay"
                    >
                         <button 
                            onClick={handleToggleExpand}
                            className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 bg-[var(--theme-bg-primary)] hover:bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-secondary)] rounded-full text-xs font-medium text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] shadow-sm backdrop-blur-md transition-all hover:scale-105 active:scale-95"
                            title="Collapse code block"
                        >
                            <ChevronUp size={12} strokeWidth={2} /> Show less
                        </button>
                    </div>
                )}
            </div>

            {/* Execution Console */}
            {hasRun && (
                <div className="border-t border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)] rounded-b-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--theme-bg-tertiary)]/50 border-b border-[var(--theme-border-secondary)]/50">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--theme-text-tertiary)] flex items-center gap-1.5">
                            <Terminal size={12} /> Console Output
                        </span>
                        <button 
                            onClick={clearOutput} 
                            className="p-1 rounded-md text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-secondary)] transition-colors"
                            title="Clear Output"
                        >
                            <X size={12} />
                        </button>
                    </div>
                    
                    <div className="p-3 max-h-[400px] overflow-auto custom-scrollbar">
                        {error && (
                            <div className="text-red-500 text-xs font-mono whitespace-pre-wrap mb-2 flex gap-2">
                                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}
                        
                        {output && (
                            <div className="text-[var(--theme-text-primary)] text-xs font-mono whitespace-pre-wrap leading-relaxed opacity-90 mb-2">
                                {output}
                            </div>
                        )}
                        
                        {image && (
                            <div className="mt-2 mb-2 rounded-lg overflow-hidden border border-[var(--theme-border-secondary)] inline-block bg-white">
                                <img src={`data:image/png;base64,${image}`} alt="Plot" className="max-w-full h-auto block" />
                            </div>
                        )}

                        {generatedFiles.length > 0 && (
                            <div className="mt-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--theme-text-tertiary)] flex items-center gap-1.5 mb-2">
                                    <FileOutput size={12} /> Generated Files
                                </span>
                                <div className="flex flex-wrap gap-2">
                                    {generatedFiles.map(file => (
                                        <FileDisplay 
                                            key={file.id} 
                                            file={file} 
                                            isFromMessageList={true} 
                                            isGemini3={false} // Disable extra edit controls
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {!error && !output && !image && generatedFiles.length === 0 && !isRunning && (
                             <div className="text-[var(--theme-text-tertiary)] text-xs italic">
                                 Executed successfully (no output).
                             </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
