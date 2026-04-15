import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import type { PluggableList } from 'unified';
import { CodeBlock } from './blocks/CodeBlock';
import { TableBlock } from './blocks/TableBlock';
import { ToolResultBlock } from './blocks/ToolResultBlock';
import { DeferredDiagramBlock } from './blocks/DeferredDiagramBlock';
import { UploadedFile, SideViewContent } from '../../types';
import { translations } from '../../utils/appUtils';
import { extractTextFromNode } from '../../utils/uiUtils';
import { InlineCode } from './code-block/InlineCode';

const loadMermaidBlock = async () => {
  const module = await import('./blocks/MermaidBlock');
  return { default: module.MermaidBlock };
};

const loadGraphvizBlock = async () => {
  const module = await import('./blocks/GraphvizBlock');
  return { default: module.GraphvizBlock };
};

export interface MarkdownRendererProps {
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
  files?: UploadedFile[];
  diagramLoadMode?: 'deferred' | 'eager';
  diagramRenderDelayMs?: number;
}

type MarkdownCodeProps = React.ComponentPropsWithoutRef<'code'> & {
  inline?: boolean;
  children?: React.ReactNode;
};
type MarkdownImageProps = React.ComponentPropsWithoutRef<'img'>;
type MarkdownTableProps = React.ComponentPropsWithoutRef<'table'>;
type MarkdownAnchorProps = React.ComponentPropsWithoutRef<'a'>;
type MarkdownDivProps = React.ComponentPropsWithoutRef<'div'>;
type MarkdownPreProps = React.ComponentPropsWithoutRef<'pre'> & {
  children?: React.ReactNode;
};
type CodeElementProps = {
  className?: string;
  children?: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLElement>;
  title?: string;
};

interface BaseMarkdownRendererProps extends MarkdownRendererProps {
  remarkPlugins: PluggableList;
  rehypePlugins: PluggableList;
}

export const BaseMarkdownRenderer: React.FC<BaseMarkdownRendererProps> = React.memo(({
  content,
  isLoading,
  onImageClick,
  onOpenHtmlPreview,
  expandCodeBlocksByDefault,
  isMermaidRenderingEnabled,
  isGraphvizRenderingEnabled,
  t,
  themeId,
  onOpenSidePanel,
  hideThinkingInContext,
  files,
  diagramLoadMode = 'deferred',
  diagramRenderDelayMs = 500,
  remarkPlugins,
  rehypePlugins,
}) => {
  const components = useMemo(() => ({
    code: (props: MarkdownCodeProps) => {
      return <InlineCode {...props} />;
    },
    img: (props: MarkdownImageProps) => {
      const { src, alt, className, ...rest } = props;
      return (
        <img
          src={src}
          alt={alt}
          className={`${className || ''} cursor-pointer hover:opacity-90 transition-opacity`}
          onClick={(e) => {
            e.stopPropagation();
            if (src && src.startsWith('data:image/')) {
              const mimeType = src.split(';')[0].split(':')[1];
              const file: UploadedFile = {
                id: `inline-img-${Date.now()}`,
                name: alt || 'generated-plot.png',
                type: mimeType,
                size: 0,
                dataUrl: src,
                uploadState: 'active'
              };
              onImageClick(file);
            } else if (src) {
              const file: UploadedFile = {
                id: `inline-img-${Date.now()}`,
                name: alt || 'image',
                type: 'image/jpeg',
                size: 0,
                dataUrl: src,
                uploadState: 'active'
              };
              onImageClick(file);
            }
          }}
          {...rest}
        />
      );
    },
    table: (props: MarkdownTableProps) => <TableBlock {...props} t={t} />,
    a: (props: MarkdownAnchorProps) => {
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
    div: (props: MarkdownDivProps) => {
      const { className, children, ...rest } = props;
      if (className?.includes('tool-result')) {
        return <ToolResultBlock className={className} files={files} onImageClick={onImageClick} {...rest}>{children}</ToolResultBlock>;
      }
      return <div className={className} {...rest}>{children}</div>;
    },
    pre: (props: MarkdownPreProps) => {
      const { children, ...rest } = props;

      const codeElement = React.Children.toArray(children).find(
        (child): child is React.ReactElement<CodeElementProps> => {
          return React.isValidElement<CodeElementProps>(child) && (
            child.type === 'code' ||
            child.props.className?.includes('language-') ||
            true
          );
        }
      );

      const codeClassName = codeElement?.props.className || '';
      const codeContent = codeElement?.props.children;

      const rawCode = extractTextFromNode(codeContent);

      const langMatch = codeClassName.match(/language-(\S+)/);
      const language = langMatch ? langMatch[1] : '';
      const isGraphviz = language === 'graphviz' || language === 'dot';

      if (isMermaidRenderingEnabled && language === 'mermaid' && typeof rawCode === 'string') {
        return (
          <DeferredDiagramBlock
            label={`Mermaid ${t('preview')}`}
            load={loadMermaidBlock}
            componentProps={{
              code: rawCode,
                onImageClick,
                isLoading,
                renderDelayMs: diagramRenderDelayMs,
              themeId,
                onOpenSidePanel,
            }}
            eager={diagramLoadMode === 'eager'}
          />
        );
      }

      if (isGraphvizRenderingEnabled && isGraphviz && typeof rawCode === 'string') {
        return (
          <DeferredDiagramBlock
            label={`Graphviz ${t('preview')}`}
            load={loadGraphvizBlock}
            componentProps={{
              code: rawCode,
              onImageClick,
              isLoading,
              renderDelayMs: diagramRenderDelayMs,
              themeId,
                onOpenSidePanel,
            }}
            eager={diagramLoadMode === 'eager'}
          />
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
  }), [diagramLoadMode, diagramRenderDelayMs, onOpenHtmlPreview, expandCodeBlocksByDefault, onImageClick, isMermaidRenderingEnabled, isGraphvizRenderingEnabled, isLoading, t, themeId, onOpenSidePanel, files]);

  const processedContent = useMemo(() => {
    if (!content) return '';

    let text = content;
    if (hideThinkingInContext) {
      const openAttr = isLoading ? 'open' : '';
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

      text = text.replace(/<thinking>([\s\S]*?)<\/[^>]+>/gi, (_, innerContent) => createDetailsBlock(innerContent));

      if (isLoading) {
        text = text.replace(/<thinking>([\s\S]*?)$/i, (_, innerContent) => createDetailsBlock(innerContent));
      }
    }

    const parts = text.split(/(```[\s\S]*?```|```[\s\S]*$)/g);
    return parts.map(part => {
      if (part.startsWith('```')) {
        return part;
      }

      let processedPart = part.replace(/\\\$\$([\s\S]*?)\\\$\$/g, (_match, innerContent) => {
        if (/^\s*[\w\d\s,.]+\s*$/.test(innerContent) && !innerContent.includes('_') && !innerContent.includes('^')) {
          return `[${innerContent.trim()}]`;
        }
        return `$$${innerContent}$$`;
      });

      processedPart = processedPart.replace(/\\\$([\s\S]*?)\\\$/g, (_match, innerContent) => {
        if (/^\s*[\w\d\s,.]+\s*$/.test(innerContent) && !innerContent.includes('_') && !innerContent.includes('^')) {
          return `(${innerContent.trim()})`;
        }
        return `$${innerContent}$`;
      });

      return processedPart;
    }).join('');
  }, [content, hideThinkingInContext, isLoading]);

  return (
    <div className={isLoading ? 'is-loading' : ''}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={components}
        urlTransform={(url) => url}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
});
