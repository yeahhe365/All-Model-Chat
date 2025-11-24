
import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { CodeBlock } from '../message/CodeBlock';
import { MermaidBlock } from '../message/MermaidBlock';
import { GraphvizBlock } from '../message/GraphvizBlock';
import { UploadedFile } from '../../types';
import { translations } from '../../utils/appUtils';

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
}

const InlineCode = ({ className, children, inline, ...props }: any) => {
    const [showCopied, setShowCopied] = useState(false);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        const text = String(children).trim();
        if (!text) return;
        
        navigator.clipboard.writeText(text).then(() => {
            setShowCopied(true);
            setTimeout(() => setShowCopied(false), 1500);
        }).catch(console.error);
    };

    return (
        <code
            className={`${className || ''} relative inline-block cursor-pointer group/code`}
            onClick={handleCopy}
            title="Click to copy"
            {...props}
        >
            {children}
            {showCopied && (
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
        'munder', 'munderover', 'semantics', 'annotation', 'annotation-xml'
      ],
      attributes: {
        ...defaultSchema.attributes,
        '*': ['className', 'style', 'ariaHidden', 'ariaLabel', 'role', 'title', 'id', 'width', 'height', 'viewBox', 'preserveAspectRatio', 'xmlns', 'd', 'fill', 'stroke', 'strokeWidth', 'opacity'],
        code: [...(defaultSchema.attributes?.code || []), 'className', 'inline'],
        span: [...(defaultSchema.attributes?.span || []), 'className', 'style'],
        div: [...(defaultSchema.attributes?.div || []), 'className', 'style'],
        math: ['xmlns', 'display', 'alttext'],
        mtext: ['mathvariant'],
        mstyle: ['mathvariant', 'mathcolor', 'mathbackground', 'scriptlevel', 'displaystyle'],
        mo: ['lspace', 'rspace', 'stretchy', 'fence', 'separator', 'accent'],
      },
      clobberPrefix: '', 
    };

    const plugins: any[] = [];
    
    if (allowHtml) {
      plugins.push(rehypeRaw);
    }

    plugins.push([rehypeSanitize, sanitizeSchema]);
    plugins.push([rehypeKatex, { throwOnError: false, strict: false }]);
    plugins.push([rehypeHighlight, { ignoreMissing: true }]);

    return plugins;
  }, [allowHtml]);

  const components = useMemo(() => ({
    code: (props: any) => {
        const { inline, className, children } = props;
        if (inline) {
            return <InlineCode {...props} />;
        }
        return <code className={className} {...props}>{children}</code>;
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

      const codeClassName = codeElement?.props?.className || '';
      const codeContent = codeElement?.props?.children;
      const rawCode = Array.isArray(codeContent) ? codeContent.join('') : codeContent;
      
      const langMatch = codeClassName.match(/language-(\S+)/);
      const language = langMatch ? langMatch[1] : '';
      const isGraphviz = language === 'graphviz' || language === 'dot';

      if (isMermaidRenderingEnabled && language === 'mermaid' && typeof rawCode === 'string') {
        return (
          <div>
            <MermaidBlock code={rawCode} onImageClick={onImageClick} isLoading={isLoading} themeId={themeId} />
          </div>
        );
      }

      if (isGraphvizRenderingEnabled && isGraphviz && typeof rawCode === 'string') {
        return (
          <div>
            <GraphvizBlock code={rawCode} isLoading={isLoading} themeId={themeId} />
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
        >
          {codeElement || children}
        </CodeBlock>
      );
    }
  }), [onOpenHtmlPreview, expandCodeBlocksByDefault, onImageClick, isMermaidRenderingEnabled, isGraphvizRenderingEnabled, isLoading, t, themeId]);

  const processedContent = useMemo(() => {
    if (!content) return '';
    const parts = content.split(/(```[\s\S]*?```)/g);
    return parts.map(part => {
      if (part.startsWith('```')) {
        return part;
      }
      return part.replace(/((:|：)\*\*)(\S)/g, '$1 $3');
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
