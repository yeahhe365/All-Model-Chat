import React, { useMemo } from 'react';
import { BaseMarkdownRenderer, MarkdownRendererProps } from './BaseMarkdownRenderer';
import { baseRemarkPlugins, getBaseRehypePlugins } from '../../utils/markdownConfigBase';
import { mathRemarkPlugins, getMathRehypePlugins } from '../../utils/markdownMathConfig';
import 'katex/dist/katex.min.css';

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = React.memo((props) => {
  const rehypePlugins = useMemo(() => [
    ...getBaseRehypePlugins(props.allowHtml ?? false),
    ...getMathRehypePlugins(),
  ], [props.allowHtml]);

  const remarkPlugins = useMemo(() => [
    ...mathRemarkPlugins,
    ...baseRemarkPlugins,
  ], []);

  return (
    <BaseMarkdownRenderer
      {...props}
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
    />
  );
});
