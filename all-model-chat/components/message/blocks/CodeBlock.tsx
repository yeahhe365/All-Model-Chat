
import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { translations } from '../../../utils/appUtils';
import { SideViewContent } from '../../../types';
import { useCodeBlock } from '../../../hooks/ui/useCodeBlock';
import { CodeHeader } from './parts/CodeHeader';

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
                            // Add !cursor-text to override the pointer cursor from InlineCode
                            className: `${codeElement.props.className || ''} !p-4 ${isOverflowing ? '!pb-14' : ''} !block font-mono text-[13px] sm:text-sm leading-relaxed !cursor-text`,
                            // Disable the click-to-copy behavior for code blocks
                            onClick: undefined,
                            // Remove the "Click to copy" tooltip
                            title: undefined,
                        } as any)
                    ) : (
                        <span className={`block p-4 font-mono text-sm ${isOverflowing ? 'pb-14' : ''}`}>{props.children}</span>
                    )}
                </pre>
                {isOverflowing && !isExpanded && (
                    <div 
                        className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[var(--theme-bg-code-block)] to-transparent cursor-pointer flex items-end justify-center pb-2 group/expand rounded-b-lg code-block-expand-overlay"
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
        </div>
    );
};
