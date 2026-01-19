
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
    // Split by code blocks to avoid replacing content inside them
    const parts = content.split(/(```[\s\S]*?```)/g);
    return parts.map(part => {
      if (part.startsWith('```')) {
        return part;
      }
      
      // Replace \[ ... \] with $$ ... $$
      let processedPart = part.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$');
      
      // Replace \( ... \) with $ ... $
      processedPart = processedPart.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');

      // Fix Markdown bold/italic markers when adjacent to Chinese full-width punctuation
      // Uses zero-width space (\u200B) to separate markers from punctuation without adding visual gap
      // This forces the parser to recognize the symbols as delimiters.
      processedPart = processedPart.replace(/(\*\*|__|\*|_)([“《（【「『])/g, '$1\u200B$2');
      processedPart = processedPart.replace(/([”》）】」』])(\*\*|__|\*|_)/g, '$1\u200B$2');
      
      return processedPart;
    }).join('');
  }, [content]);

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
