import React, { useMemo } from 'react';
import { BaseMarkdownRenderer, MarkdownRendererProps } from './BaseMarkdownRenderer';
import { baseRemarkPlugins, getBaseRehypePlugins } from '../../utils/markdownConfigBase';

export const MarkdownRendererLite: React.FC<MarkdownRendererProps> = React.memo((props) => {
  const rehypePlugins = useMemo(() => getBaseRehypePlugins(props.allowHtml ?? false), [props.allowHtml]);

  return (
    <BaseMarkdownRenderer
      {...props}
      remarkPlugins={baseRemarkPlugins}
      rehypePlugins={rehypePlugins}
    />
  );
});
