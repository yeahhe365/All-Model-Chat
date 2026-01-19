

import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { CodeBlock } from './blocks/CodeBlock';
import { MermaidBlock } from './blocks/MermaidBlock';
import { GraphvizBlock } from './blocks/GraphvizBlock';
import { TableBlock } from './blocks/TableBlock';
import { ToolResultBlock } from './blocks/ToolResultBlock';
import { UploadedFile, SideViewContent } from '../../types';
import { translations } from '../../utils/appUtils';
import { extractTextFromNode } from '../../utils/uiUtils';
import { getRehypePlugins, remarkPlugins } from '../../utils/markdownConfig';
import { InlineCode } from './code-block/InlineCode';

interface MarkdownRendererProps {
  content: string;
  isLoading: boolean;
  onImageClick: (file: UploadedFile) => void;
  onOpenHtmlPreview: (html: string, options?: { initialTrueFullscreen?: boolean }) => void;
  expandCodeBlocksByDefault: boolean;
  isMermaidRenderingEnabled: boolean;
  isGraphvizRenderingEnabled: boolean;
  allowHtml?: boolean;
  t: (key: keyof typeof translations) => string;
  themeId: string;
  onOpenSidePanel: (content: SideViewContent) => void;
  hideThinkingInContext?: boolean;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = React.memo(({
  content,
  isLoading,
  onImageClick,
  onOpenHtmlPreview,
  expandCodeBlocksByDefault,
  isMermaidRenderingEnabled,
  isGraphvizRenderingEnabled,
  allowHtml = false,
  t,
  themeId,
  onOpenSidePanel,
  hideThinkingInContext
}) => {

  const rehypePlugins = useMemo(() => getRehypePlugins(allowHtml), [allowHtml]);

  const components = useMemo(() => ({
    code: (props: any) => {
        return <InlineCode {...props} />;
    },
    table: (props: any) => <TableBlock {...props} />,
    a: (props: any) => {
        const { href, children, ...rest } = props;
        const isInternal = href && (href.startsWith('#') || href.startsWith('/'));
        
        return (
            <a 
                href={href} 
                target={isInternal ? undefined : '_blank'} 
                rel={isInternal ? undefined : 'noopener noreferrer'} 
                {...rest}
            >
                {children}
            </a>
        );
    },
    div: (props: any) => {
      const { className, children, ...rest } = props;
      if (className?.includes('tool-result')) {
        return <ToolResultBlock className={className} {...rest}>{children}</ToolResultBlock>;
      }
      return <div className={className} {...rest}>{children}</div>;
    },
    pre: (props: any) => {
      const { node, children, ...rest } = props;
      
      const codeElement = React.Children.toArray(children).find(
        (child: any) => {
            return React.isValidElement(child) && (
                child.type === 'code' || 
                (child.props as any).className?.includes('language-') ||
                true 
            );
        }
      ) as React.ReactElement | undefined;

      // Safe property access with optional chaining and type casting
      const codeClassName = (codeElement?.props as any)?.className || '';
      const codeContent = (codeElement?.props as any)?.children;
      
      // Extract text reliably from potential React Element tree (from highlighting)
      const rawCode = extractTextFromNode(codeContent);
      
      const langMatch = codeClassName.match(/language-(\S+)/);
      const language = langMatch ? langMatch[1] : '';
      const isGraphviz = language === 'graphviz' || language === 'dot';

      if (isMermaidRenderingEnabled && language === 'mermaid' && typeof rawCode === 'string') {
        return (
          <div>
            <MermaidBlock code={rawCode} onImageClick={onImageClick} isLoading={isLoading} themeId={themeId} onOpenSidePanel={onOpenSidePanel} />
          </div>
        );
      }

      if (isGraphvizRenderingEnabled && isGraphviz && typeof rawCode === 'string') {
        return (
          <div>
            <GraphvizBlock code={rawCode} onImageClick={onImageClick} isLoading={isLoading} themeId={themeId} onOpenSidePanel={onOpenSidePanel} />
          </div>
        );
      }
      
      return (
        <CodeBlock 
          {...rest} 
          className={codeClassName} 
          onOpenHtmlPreview={onOpenHtmlPreview} 
          expandCodeBlocksByDefault={expandCodeBlocksByDefault}
          t={t}
          onOpenSidePanel={onOpenSidePanel}
        >
          {codeElement || children}
        </CodeBlock>
      );
    }
  }), [onOpenHtmlPreview, expandCodeBlocksByDefault, onImageClick, isMermaidRenderingEnabled, isGraphvizRenderingEnabled, isLoading, t, themeId, onOpenSidePanel]);

  const processedContent = useMemo(() => {
    if (!content) return '';
    
    // 1. Handle folding for <thinking> blocks if enabled
    let text = content;
    if (hideThinkingInContext) {
        // If loading, enforce 'open' state. If done, remove 'open' (auto-collapse).
        const openAttr = isLoading ? 'open' : '';
        
        // Template for the details block
        const createDetailsBlock = (innerContent: string) => 
            `<details ${openAttr} class="group rounded-xl bg-[var(--theme-bg-tertiary)]/20 overflow-hidden transition-all duration-200 open:bg-[var(--theme-bg-tertiary)]/30 open:shadow-sm my-2">
                <summary class="list-none flex select-none items-center justify-between gap-2 px-3 py-2 cursor-pointer transition-colors hover:bg-[var(--theme-bg-tertiary)]/40 focus:outline-none">
                    <div class="flex items-center gap-2 min-w-0 overflow-hidden flex-grow">
                        <div class="flex items-center gap-2 min-w-0">
                            <div class="flex flex-col min-w-0 justify-center min-h-[1.75rem] sm:min-h-[2rem]">
                                <div class="flex items-baseline gap-2 min-w-0">
                                    <span class="text-base text-[var(--theme-text-secondary)] font-medium truncate opacity-90">
                                        Raw Thinking Process
                                    </span>
                                </div>
                            </div>
                            <div class="flex items-center justify-center w-5 h-5 rounded-full hover:bg-[var(--theme-bg-input)] transition-colors flex-shrink-0">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-[var(--theme-text-tertiary)] transition-transform duration-300 group-open:rotate-180">
                                    <path d="m6 9 6 6 6-6"/>
                                </svg>
                            </div>
                        </div>
                    </div>
                </summary>
                <div class="px-3 pb-3 pt-2 border-t border-[var(--theme-border-secondary)]/50 animate-in fade-in slide-in-from-top-2 duration-300 text-xs relative">
                    <div class="text-[var(--theme-text-secondary)] leading-relaxed font-mono whitespace-pre-wrap opacity-90">${innerContent}</div>
                </div>
            </details>`;

        // A. Replace complete blocks: <thinking> ... </any-tag>
        text = text.replace(/<thinking>([\s\S]*?)<\/[^>]+>/gi, (_, content) => createDetailsBlock(content));

        // B. If still loading, handle incomplete block at the end (Open <thinking> without closing tag)
        // This ensures the box appears immediately while streaming.
        if (isLoading) {
             text = text.replace(/<thinking>([\s\S]*?)$/i, (_, content) => createDetailsBlock(content));
        }
    }

    // 2. Split by code blocks to avoid replacing content inside them
    const parts = text.split(/(```[\s\S]*?```)/g);
    return parts.map(part => {
      if (part.startsWith('```')) {
        return part;
      }
      
      // Replace \[ ... \] with $$ ... $$
      let processedPart = part.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$');
      
      // Replace \( ... \) with $ ... $
      processedPart = processedPart.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');

      return processedPart;
    }).join('');
  }, [content, hideThinkingInContext, isLoading]);

  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins as any}
      rehypePlugins={rehypePlugins as any}
      components={components}
    >
      {processedContent}
    </ReactMarkdown>
  );
});
