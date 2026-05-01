import React, { useMemo } from 'react';
import { useI18n } from '../../contexts/I18nContext';
import ReactMarkdown from 'react-markdown';
import type { PluggableList } from 'unified';
import { CodeBlock } from './blocks/CodeBlock';
import { TableBlock } from './blocks/TableBlock';
import { ToolResultBlock } from './blocks/ToolResultBlock';
import { DeferredDiagramBlock } from './blocks/DeferredDiagramBlock';
import { UploadedFile, SideViewContent } from '../../types';
import { extractTextFromNode } from '../../utils/uiUtils';
import { InlineCode } from './code-block/InlineCode';
import { splitMarkdownSegments } from '../../utils/markdownUtils';

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
  messageId?: string;
  isLoading: boolean;
  onImageClick: (file: UploadedFile) => void;
  onOpenHtmlPreview: (html: string, options?: { initialTrueFullscreen?: boolean }) => void;
  expandCodeBlocksByDefault: boolean;
  isMermaidRenderingEnabled: boolean;
  isGraphvizRenderingEnabled: boolean;
  allowHtml?: boolean;
  themeId: string;
  onOpenSidePanel: (content: SideViewContent) => void;
  hideThinkingInContext?: boolean;
  files?: UploadedFile[];
  diagramLoadMode?: 'deferred' | 'eager';
  diagramRenderDelayMs?: number;
  interactiveMode?: 'enabled' | 'disabled';
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
  node?: {
    position?: {
      start?: {
        offset?: number;
      };
    };
  };
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

const GEMMA_THOUGHT_CHANNEL_REGEX = /<\|channel(?:\|thought>|>thought\s*)([\s\S]*?)\s*<channel\|>/gi;
const THINKING_BLOCK_REGEX = /<thinking>([\s\S]*?)<\/[^>]+>/gi;
const INCOMPLETE_THINKING_BLOCK_REGEX = /<thinking>([\s\S]*?)$/i;
const INLINE_MATH_OPERATOR_REGEX = /(?:^|[^A-Za-z])(?:\d+\s*[=+\-*/<>]\s*\d+|[A-Za-z]\s*[=+\-*/<>]\s*[A-Za-z0-9])/;
const INLINE_MATH_MARKER_REGEX = /[\\^_{}]/;

const transformMarkdownTextSegments = (value: string, transform: (segment: string) => string): string =>
  splitMarkdownSegments(value)
    .map((segment) => (segment.type === 'literal' ? segment.value : transform(segment.value)))
    .join('');

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const isLikelyMathExpression = (value: string): boolean => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return false;
  }

  return (
    INLINE_MATH_MARKER_REGEX.test(trimmedValue) ||
    INLINE_MATH_OPERATOR_REGEX.test(trimmedValue) ||
    trimmedValue.includes('\n')
  );
};

const normalizeEscapedMathDelimiters = (value: string): string => {
  let nextValue = value.replace(/\\\$\$([\s\S]+?)\\\$\$/g, (match, innerContent: string) =>
    isLikelyMathExpression(innerContent) ? `$$${innerContent}$$` : match,
  );

  nextValue = nextValue.replace(/\\\$((?:\\.|[^\\$])+?)\\\$/g, (match, innerContent: string) =>
    isLikelyMathExpression(innerContent) ? `$${innerContent}$` : match,
  );

  return nextValue;
};

const createThinkingBlockMarkup = (innerContent: string, isLoading: boolean): string => {
  const escapedContent = escapeHtml(innerContent.trim());
  const openAttribute = isLoading ? ' open' : '';

  return `<details${openAttribute}><summary>Raw Thinking Process</summary><div>${escapedContent}</div></details>`;
};

const wrapReasoningMarkup = (value: string, isLoading: boolean): string => {
  let nextValue = value.replace(THINKING_BLOCK_REGEX, (_match, innerContent: string) =>
    createThinkingBlockMarkup(innerContent, isLoading),
  );

  if (isLoading) {
    nextValue = nextValue.replace(INCOMPLETE_THINKING_BLOCK_REGEX, (_match, innerContent: string) =>
      createThinkingBlockMarkup(innerContent, true),
    );
  }

  nextValue = nextValue.replace(GEMMA_THOUGHT_CHANNEL_REGEX, (_match, innerContent: string) =>
    createThinkingBlockMarkup(innerContent, isLoading),
  );

  return nextValue;
};

const stripGemmaThoughtMarkup = (value: string): string => value.replace(GEMMA_THOUGHT_CHANNEL_REGEX, ' ');

export const BaseMarkdownRenderer: React.FC<BaseMarkdownRendererProps> = React.memo(
  ({
    content,
    messageId,
    isLoading,
    onImageClick,
    onOpenHtmlPreview,
    expandCodeBlocksByDefault,
    isMermaidRenderingEnabled,
    isGraphvizRenderingEnabled,
    themeId,
    onOpenSidePanel,
    hideThinkingInContext,
    files,
    diagramLoadMode = 'deferred',
    diagramRenderDelayMs = 500,
    interactiveMode = 'enabled',
    remarkPlugins,
    rehypePlugins,
  }) => {
    const { t } = useI18n();
    const isInteractive = interactiveMode !== 'disabled';

    const components = useMemo(
      () => ({
        code: (props: MarkdownCodeProps) => {
          return <InlineCode {...props} />;
        },
        img: (props: MarkdownImageProps) => {
          const { src, alt, className, ...rest } = props;

          const imageClassName = isInteractive
            ? `${className || ''} cursor-pointer hover:opacity-90 transition-opacity`
            : className || '';

          return (
            <img
              src={src}
              alt={alt}
              className={imageClassName}
              onClick={(e) => {
                if (!isInteractive) return;
                e.stopPropagation();
                if (src && src.startsWith('data:image/')) {
                  const mimeType = src.split(';')[0].split(':')[1];
                  const file: UploadedFile = {
                    id: `inline-img-${Date.now()}`,
                    name: alt || 'generated-plot.png',
                    type: mimeType,
                    size: 0,
                    dataUrl: src,
                    uploadState: 'active',
                  };
                  onImageClick(file);
                } else if (src) {
                  const file: UploadedFile = {
                    id: `inline-img-${Date.now()}`,
                    name: alt || 'image',
                    type: 'image/jpeg',
                    size: 0,
                    dataUrl: src,
                    uploadState: 'active',
                  };
                  onImageClick(file);
                }
              }}
              {...rest}
            />
          );
        },
        table: (props: MarkdownTableProps) => <TableBlock {...props} />,
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
            return (
              <ToolResultBlock className={className} files={files} onImageClick={onImageClick} {...rest}>
                {children}
              </ToolResultBlock>
            );
          }
          return (
            <div className={className} {...rest}>
              {children}
            </div>
          );
        },
        pre: (props: MarkdownPreProps) => {
          const { children, node, ...rest } = props;

          const codeElement = React.Children.toArray(children).find(
            (child): child is React.ReactElement<CodeElementProps> => {
              return (
                React.isValidElement<CodeElementProps>(child) &&
                (child.type === 'code' || Boolean(child.props.className?.includes('language-')))
              );
            },
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
              cacheKey={
                messageId && node?.position?.start?.offset !== undefined
                  ? `${messageId}:${node.position.start.offset}`
                  : undefined
              }
              className={codeClassName}
              onOpenHtmlPreview={onOpenHtmlPreview}
              expandCodeBlocksByDefault={expandCodeBlocksByDefault}
              showPreviewControls={isInteractive}
              onOpenSidePanel={onOpenSidePanel}
            >
              {codeElement || children}
            </CodeBlock>
          );
        },
      }),
      [
        diagramLoadMode,
        diagramRenderDelayMs,
        expandCodeBlocksByDefault,
        files,
        isGraphvizRenderingEnabled,
        isInteractive,
        isLoading,
        isMermaidRenderingEnabled,
        messageId,
        onImageClick,
        onOpenHtmlPreview,
        onOpenSidePanel,
        t,
        themeId,
      ],
    );

    const processedContent = useMemo(() => {
      if (!content) return '';

      const contentWithNormalizedMath = transformMarkdownTextSegments(content, normalizeEscapedMathDelimiters);

      if (hideThinkingInContext) {
        return transformMarkdownTextSegments(contentWithNormalizedMath, (segment) =>
          wrapReasoningMarkup(segment, isLoading),
        );
      }

      return transformMarkdownTextSegments(contentWithNormalizedMath, stripGemmaThoughtMarkup);
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
  },
);
