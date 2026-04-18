import React, { Suspense, lazy, useMemo } from 'react';
import { BaseMarkdownRenderer, type MarkdownRendererProps } from './BaseMarkdownRenderer';
import { baseRemarkPlugins, getBaseRehypePlugins } from '../../utils/markdownConfigBase';

const LazyMarkdownRendererMath = lazy(async () => {
  const module = await import('./MarkdownRenderer');
  return { default: module.MarkdownRenderer };
});

interface LazyMarkdownRendererProps extends MarkdownRendererProps {
  fallbackMode?: 'raw' | 'none';
}

const containsMathMarkdown = (content: string) => {
  return /(^|[^\\])\$\$[\s\S]+?(^|[^\\])\$\$/m.test(content)
    || /(^|[^\\])\$[^$\n]+?[^\\]\$/m.test(content);
};

export const LazyMarkdownRenderer: React.FC<LazyMarkdownRendererProps> = ({
  content,
  fallbackMode = 'raw',
  ...props
}) => {
  const allowHtml = props.allowHtml ?? false;
  const rehypePlugins = useMemo(() => getBaseRehypePlugins(allowHtml), [allowHtml]);
  const shouldLoadMathRenderer = containsMathMarkdown(content);
  const fallback = fallbackMode === 'raw'
    ? (
        <div className="whitespace-pre-wrap break-words text-[var(--theme-text-secondary)]">
          {content}
        </div>
      )
    : null;

  if (!shouldLoadMathRenderer) {
    return (
      <BaseMarkdownRenderer
        {...props}
        content={content}
        remarkPlugins={baseRemarkPlugins}
        rehypePlugins={rehypePlugins}
      />
    );
  }

  return (
    <Suspense fallback={fallback}>
      <LazyMarkdownRendererMath content={content} {...props} />
    </Suspense>
  );
};
