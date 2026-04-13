import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export const mathRemarkPlugins = [remarkMath];

export const getMathRehypePlugins = () => ([
  [rehypeKatex, { throwOnError: false, strict: false }],
]);
