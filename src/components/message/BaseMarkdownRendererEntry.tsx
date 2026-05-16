import React, { useMemo } from 'react';
import { BaseMarkdownRenderer, type MarkdownRendererProps } from './BaseMarkdownRenderer';
import { baseRemarkPlugins, getBaseRehypePlugins } from '@/utils/markdownConfigBase';

export const BaseMarkdownRendererEntry: React.FC<MarkdownRendererProps> = React.memo((props) => {
  const rehypePlugins = useMemo(
    () => getBaseRehypePlugins(props.allowHtml ?? false, { syntaxHighlighting: !props.isLoading }),
    [props.allowHtml, props.isLoading],
  );

  return <BaseMarkdownRenderer {...props} remarkPlugins={baseRemarkPlugins} rehypePlugins={rehypePlugins} />;
});
