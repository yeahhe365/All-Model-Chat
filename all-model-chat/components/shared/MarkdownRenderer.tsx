import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { CodeBlock } from '../message/CodeBlock';
import { MermaidBlock } from '../message/MermaidBlock';
import { GraphvizBlock } from '../message/GraphvizBlock';
import { UploadedFile } from '../../types';

interface MarkdownRendererProps {
  content: string;
  isLoading: boolean;
  onImageClick: (file: UploadedFile) => void;
  onOpenHtmlPreview: (html: string, options?: { initialTrueFullscreen?: boolean }) => void;
  expandCodeBlocksByDefault: boolean;
  isMermaidRenderingEnabled: boolean;
  isGraphvizRenderingEnabled: boolean;
  allowHtml?: boolean;
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
}) => {

  const rehypePlugins = useMemo(() => {
    // Custom schema to allow classes and attributes needed by highlight.js and KaTeX
    const sanitizeSchema = {
      ...defaultSchema,
      attributes: {
        ...defaultSchema.attributes,
        // Allow `className` for elements used by highlight.js.
        code: [...(defaultSchema.attributes?.code || []), 'className'],
        // Allow attributes used by KaTeX
        span: [...(defaultSchema.attributes?.span || []), 'className', 'style', 'aria-hidden'],
        div: [...(defaultSchema.attributes?.div || []), 'className', 'style'],
      },
    };

    // The order of plugins is important for security and functionality.
    const plugins: any[] = [
      rehypeKatex, // 1. Process math nodes into HTML.
    ];
    
    if (allowHtml) {
      // 2. If allowing raw HTML, it must be parsed next.
      plugins.push(rehypeRaw);
    }
    
    // 3. Add rehype-highlight to automatically apply syntax highlighting classes.
    plugins.push(rehypeHighlight);

    // 4. Sanitize the entire generated HTML tree at the end.
    // This ensures that both the raw HTML (if allowed) and the output from
    // other plugins are safe.
    plugins.push([rehypeSanitize, sanitizeSchema]);

    return plugins;
  }, [allowHtml]);

  const components = useMemo(() => ({
    pre: (props: any) => {
      const { node, children, ...rest } = props;
      const codeElement = React.Children.toArray(children).find(
        (child: any) => child.type === 'code'
      ) as React.ReactElement | undefined;

      const codeClassName = codeElement?.props?.className || '';
      const codeContent = codeElement?.props?.children;
      const langMatch = codeClassName.match(/language-(\S+)/);
      const language = langMatch ? langMatch[1] : '';
      const isGraphviz = language === 'graphviz' || language === 'dot';

      if (isMermaidRenderingEnabled && language === 'mermaid' && typeof codeContent === 'string') {
        return (
          <div>
            <MermaidBlock code={codeContent} onImageClick={onImageClick} isLoading={isLoading} />
            <CodeBlock {...rest} className={codeClassName} onOpenHtmlPreview={onOpenHtmlPreview} expandCodeBlocksByDefault={expandCodeBlocksByDefault}>
              {children}
            </CodeBlock>
          </div>
        );
      }

      if (isGraphvizRenderingEnabled && isGraphviz && typeof codeContent === 'string') {
        return (
          <div>
            <GraphvizBlock code={codeContent} isLoading={isLoading} />
            <CodeBlock {...rest} className={codeClassName} onOpenHtmlPreview={onOpenHtmlPreview} expandCodeBlocksByDefault={expandCodeBlocksByDefault}>
              {children}
            </CodeBlock>
          </div>
        );
      }
      
      return (
        <CodeBlock 
          {...rest} 
          className={codeClassName} 
          onOpenHtmlPreview={onOpenHtmlPreview} 
          expandCodeBlocksByDefault={expandCodeBlocksByDefault}
        >
          {children}
        </CodeBlock>
      );
    }
  }), [onOpenHtmlPreview, expandCodeBlocksByDefault, onImageClick, isMermaidRenderingEnabled, isGraphvizRenderingEnabled, isLoading]);

  // Workaround for a Markdown parsing issue with CJK characters and colons.
  // The parser fails to correctly render bold text like "**标题：**后面字符"
  // but works with "**标题：** 后面字符". This regex adds the necessary space.
  // It handles both full-width (：) and half-width (:) colons.
  const processedContent = content.replace(/((:|：)\*\*)(\S)/g, '$1 $3');

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
      rehypePlugins={rehypePlugins as any}
      components={components}
    >
      {processedContent}
    </ReactMarkdown>
  );
});