import React, { Suspense, lazy } from 'react';
import type { MarkdownRendererProps } from './BaseMarkdownRenderer';

const LazyMarkdownRendererMath = lazy(async () => {
  const module = await import('./MarkdownRenderer');
  return { default: module.MarkdownRenderer };
});

const LazyMarkdownRendererLite = lazy(async () => {
  const module = await import('./MarkdownRendererLite');
  return { default: module.MarkdownRendererLite };
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
  const Renderer = containsMathMarkdown(content) ? LazyMarkdownRendererMath : LazyMarkdownRendererLite;
  const fallback = fallbackMode === 'raw'
    ? (
        <div className="whitespace-pre-wrap break-words text-[var(--theme-text-secondary)]">
          {content}
        </div>
      )
    : null;

  return (
    <Suspense fallback={fallback}>
      <Renderer content={content} {...props} />
    </Suspense>
  );
};
