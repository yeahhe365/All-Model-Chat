
import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { CodeBlock } from './CodeBlock';
import { MermaidBlock } from './MermaidBlock';
import { GraphvizBlock } from './GraphvizBlock';
import { TableBlock } from './TableBlock';
import { ToolResultBlock } from './ToolResultBlock';
import { UploadedFile, SideViewContent } from '../../types';
import { translations } from '../../utils/appUtils';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import { extractTextFromNode } from '../../utils/uiUtils';

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

const InlineCode = ({ className, children, inline, ...props }: any) => {
    const { isCopied, copyToClipboard } = useCopyToClipboard(1500);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        const text = String(children).trim();
        if (!text) return;
        copyToClipboard(text);
    };

    return (
        <code
            className={`${className || ''} relative inline-block cursor-pointer group/code`}
            onClick={handleCopy}
            title="Click to copy"
            {...props}
        >
            {children}
            {isCopied && (
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap z-10 animate-in fade-in zoom-in duration-200">
                    Copied!
                </span>
            )}
        </code>
    );
};

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

  const rehypePlugins = useMemo(() => {
    const sanitizeSchema = {
      ...defaultSchema,
      tagNames: [
        ...(defaultSchema.tagNames || []),
        'div', 'span', 'pre', 'code', 'section', 'header', 'footer', 'nav', 'article', 'aside', 'figure', 'figcaption',
        'svg', 'path', 'defs', 'symbol', 'use', 'g',
        'math', 'maction', 'maligngroup', 'malignmark', 'menclose', 'merror', 
        'mfenced', 'mfrac', 'mglyph', 'mi', 'mlabeledtr', 'mlongdiv', 
        'mmultiscripts', 'mn', 'mo', 'mover', 'mpadded', 'mphantom', 
        'mroot', 'mrow', 'ms', 'mscarries', 'mscarry', 'msgroup', 
        'msline', 'mspace', 'msqrt', 'msrow', 'mstack', 'mstyle', 
        'msub', 'msubsup', 'msup', 'mtable', 'mtd', 'mtext', 'mtr', 
        'munder', 'munderover', 'semantics', 'annotation', 'annotation-xml',
        'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th'
      ],
      attributes: {
        ...defaultSchema.attributes,
        '*': ['className', 'class', 'style', 'ariaHidden', 'ariaLabel', 'role', 'title', 'id', 'width', 'height', 'viewBox', 'preserveAspectRatio', 'xmlns', 'd', 'fill', 'stroke', 'strokeWidth', 'opacity'],
        code: [...(defaultSchema.attributes?.code || []), 'className', 'inline'],
        span: [...(defaultSchema.attributes?.span || []), 'className', 'style'],
        div: [...(defaultSchema.attributes?.div || []), 'className', 'class', 'style'],
        math: ['xmlns', 'display', 'alttext'],
        mtext: ['mathvariant'],
        mstyle: ['mathvariant', 'mathcolor', 'mathbackground', 'scriptlevel', 'displaystyle'],
        mo: ['lspace', 'rspace', 'stretchy', 'fence', 'separator', 'accent'],
        td: ['align', 'colSpan', 'rowSpan'],
        th: ['align', 'colSpan', 'rowSpan'],
      },
      clobberPrefix: '', 
    };

    const plugins: any[] = [];
    
    if (allowHtml) {
      plugins.push(rehypeRaw);
    }

    plugins.push([rehypeSanitize, sanitizeSchema]);
    plugins.push([rehypeKatex, { throwOnError: false, strict: false }]);
    // Explicitly enabling detect: true for better fallback detection of code blocks without language tags
    plugins.push([rehypeHighlight, { ignoreMissing: true, detect: true }]);

    return plugins;
  }, [allowHtml]);

  const components = useMemo(() => ({
    code: (props: any) => {
        return <InlineCode {...props} />;
    },
    table: (props: any) => <TableBlock {...props} />,
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
      let processedPart = part.replace(/((:|：)\*\*)(\S)/g, '$1 $3');
      
      // Replace \[ ... \] with $$ ... $$
      processedPart = processedPart.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$');
      
      // Replace \( ... \) with $ ... $
      processedPart = processedPart.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');
      
      return processedPart;
    }).join('');
  }, [content]);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath, remarkGfm, remarkBreaks]}
      rehypePlugins={rehypePlugins as any}
      components={components}
    >
      {processedContent}
    </ReactMarkdown>
  );
});
