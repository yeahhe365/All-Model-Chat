
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
}

const InlineCode = ({ className, children, inline, ...props }: any) => {
    const [showCopied, setShowCopied] = useState(false);

    // If inline is not explicitly passed (sometimes react-markdown passes it, sometimes not depending on context),
    // we assume it's inline if this component is used by the `code` mapping directly and not inside `pre`.
    // However, strictly speaking, react-markdown passes `inline` boolean.
    
    // Note: We assume this component handles inline code primarily.
    // Block code is handled via the `pre` component override which inspects children.
    
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
}) => {

  const rehypePlugins = useMemo(() => {
    // Custom schema to allow classes and attributes needed by input formatting.
    const sanitizeSchema = {
      ...defaultSchema,
      tagNames: [
        ...(defaultSchema.tagNames || []),
        'div', 'span', 'pre', 'code', 'section', 'header', 'footer', 'nav', 'article', 'aside', 'figure', 'figcaption',
        'svg', 'path', 'defs', 'symbol', 'use', 'g',
        // MathML tags allowed just in case model outputs raw MathML
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
        // Allow extensive attributes for styling and accessibility
        '*': ['className', 'style', 'ariaHidden', 'ariaLabel', 'role', 'title', 'id', 'width', 'height', 'viewBox', 'preserveAspectRatio', 'xmlns', 'd', 'fill', 'stroke', 'strokeWidth', 'opacity'],
        code: [...(defaultSchema.attributes?.code || []), 'className', 'inline'],
        span: [...(defaultSchema.attributes?.span || []), 'className', 'style'],
        div: [...(defaultSchema.attributes?.div || []), 'className', 'style'],
        // MathML attributes
        math: ['xmlns', 'display', 'alttext'],
        mtext: ['mathvariant'],
        mstyle: ['mathvariant', 'mathcolor', 'mathbackground', 'scriptlevel', 'displaystyle'],
        mo: ['lspace', 'rspace', 'stretchy', 'fence', 'separator', 'accent'],
      },
      // Prevent prefixing IDs which can break internal links or SVG references
      clobberPrefix: '', 
    };

    const plugins: any[] = [];
    
    if (allowHtml) {
      plugins.push(rehypeRaw);
    }

    // Sanitize first to remove XSS vectors from user/model text
    plugins.push([rehypeSanitize, sanitizeSchema]);

    // Transform math to HTML (KaTeX)
    plugins.push([rehypeKatex, { throwOnError: false, strict: false }]);
    
    // Syntax highlighting
    plugins.push([rehypeHighlight, { ignoreMissing: true }]);

    return plugins;
  }, [allowHtml]);

  const components = useMemo(() => ({
    code: (props: any) => {
        const { inline, className, children } = props;
        const match = /language-(\w+)/.exec(className || '');
        // If it has a language class or is explicitly not inline, it's likely handled by pre/block logic.
        // However, react-markdown passes everything through here if we define it.
        // Since we also override `pre`, the `pre` component will receive this component as a child.
        // We need to decide if this `code` render is for inline use or block use.
        
        // If `inline` is true, use InlineCode.
        if (inline) {
            return <InlineCode {...props} />;
        }
        
        // If it's a block (inside pre), we just render a standard code element 
        // because our `pre` override handles the block logic wrapper.
        return <code className={className} {...props}>{children}</code>;
    },
    pre: (props: any) => {
      const { node, children, ...rest } = props;
      
      // Find the code element child.
      // Since we override `code`, the child will be a React element of that component type,
      // OR it might be a standard `code` element depending on how props are passed.
      // React.Children.toArray allows us to inspect the children.
      
      const codeElement = React.Children.toArray(children).find(
        (child: any) => {
            return React.isValidElement(child) && (
                child.type === 'code' || 
                // Check if it's our custom component (by checking props or type if possible, though type check is tricky with closures)
                // Usually checking props.className for 'language-' is a good heuristic for block code inside pre
                (child.props as any).className?.includes('language-') ||
                // Or just assume the first child is the code block if it's a pre
                true 
            );
        }
      ) as React.ReactElement | undefined;

      const codeClassName = codeElement?.props?.className || '';
      const codeContent = codeElement?.props?.children;
      
      // Extract text content from children if it's an array (common in some react-markdown versions)
      const rawCode = Array.isArray(codeContent) ? codeContent.join('') : codeContent;
      
      const langMatch = codeClassName.match(/language-(\S+)/);
      const language = langMatch ? langMatch[1] : '';
      const isGraphviz = language === 'graphviz' || language === 'dot';

      if (isMermaidRenderingEnabled && language === 'mermaid' && typeof rawCode === 'string') {
        return (
          <div>
            <MermaidBlock code={rawCode} onImageClick={onImageClick} isLoading={isLoading} />
            <CodeBlock {...rest} className={codeClassName} onOpenHtmlPreview={onOpenHtmlPreview} expandCodeBlocksByDefault={expandCodeBlocksByDefault} t={t}>
              {codeElement || children}
            </CodeBlock>
          </div>
        );
      }

      if (isGraphvizRenderingEnabled && isGraphviz && typeof rawCode === 'string') {
        return (
          <div>
            <GraphvizBlock code={rawCode} isLoading={isLoading} />
            <CodeBlock {...rest} className={codeClassName} onOpenHtmlPreview={onOpenHtmlPreview} expandCodeBlocksByDefault={expandCodeBlocksByDefault} t={t}>
              {codeElement || children}
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
          t={t}
        >
          {codeElement || children}
        </CodeBlock>
      );
    }
  }), [onOpenHtmlPreview, expandCodeBlocksByDefault, onImageClick, isMermaidRenderingEnabled, isGraphvizRenderingEnabled, isLoading, t]);

  // Optimization: Safe replacement for CJK bold issue.
  const processedContent = useMemo(() => {
    if (!content) return '';

    // Split by Markdown code blocks to ensure we don't modify content inside them.
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map(part => {
      // If it starts with ```, it's a code block; return as is.
      if (part.startsWith('```')) {
        return part;
      }
      // Workaround for a Markdown parsing issue with CJK characters and colons/bolding.
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
