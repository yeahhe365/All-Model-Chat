import React, { Suspense, lazy } from 'react';
import type { MarkdownRendererProps } from './BaseMarkdownRenderer';

const LazyBaseMarkdownRenderer = lazy(async () => {
  const module = await import('./BaseMarkdownRendererEntry');
  return { default: module.BaseMarkdownRendererEntry };
});

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
      <Suspense fallback={fallback}>
        <LazyBaseMarkdownRenderer {...props} content={content} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={fallback}>
      <LazyMarkdownRendererMath content={content} {...props} />
    </Suspense>
  );
};
