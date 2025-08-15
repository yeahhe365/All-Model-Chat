import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
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
    const plugins = [rehypeKatex, rehypeHighlight];
    if (allowHtml) {
      plugins.unshift(rehypeRaw);
    }
    return plugins;
  }, [allowHtml]);

  const processedContent = useMemo(() => {
    if (!content) return '';

    // This regex splits the content by code blocks (```...```), keeping the code blocks in the resulting array.
    const parts = content.split(/(```[\s\S]*?```)/g);
    
    const newContent = parts.map((part, index) => {
      // If the part is a code block (at an odd index), return it as is.
      if (index % 2 === 1) {
        return part;
      }
      
      // Part is not a code block, so we can process it.
      let processedPart = part;

      // Fix for invalid markdown with quotes inside bold markers.
      // e.g., **"text"** -> "**text**"
      processedPart = processedPart.replace(/\*\*(["'“‘])(.*?)(["'”’])\*\*/g, '$1**$2**$3');
      
      // The original logic for handling newlines when allowHtml is true.
      if (allowHtml) {
        // Replace sequences of two or more newlines with a paragraph containing a non-breaking space.
        // This creates a visual empty line.
        processedPart = processedPart.replace(/(\r\n|\n){2,}/g, '\n\n&nbsp;\n\n');
      }

      return processedPart;
    }).join('');
    
    return newContent;
  }, [content, allowHtml]);

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

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={rehypePlugins as any}
      components={components}
    >
      {processedContent}
    </ReactMarkdown>
  );
});