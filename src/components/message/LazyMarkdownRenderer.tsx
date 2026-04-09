import React, { Suspense, lazy } from 'react';
import type { MarkdownRendererProps } from './MarkdownRenderer';

const MarkdownRendererImpl = lazy(async () => {
  const module = await import('./MarkdownRenderer');
  return { default: module.MarkdownRenderer };
});

interface LazyMarkdownRendererProps extends MarkdownRendererProps {
  fallback?: React.ReactNode;
}

export const LazyMarkdownRenderer: React.FC<LazyMarkdownRendererProps> = ({
  fallback = null,
  ...props
}) => {
  return (
    <Suspense fallback={fallback}>
      <MarkdownRendererImpl {...props} />
    </Suspense>
  );
};
