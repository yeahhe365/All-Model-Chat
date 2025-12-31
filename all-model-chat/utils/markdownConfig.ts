
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

export const getRehypePlugins = (allowHtml: boolean) => {
  const sanitizeSchema = {
    ...defaultSchema,
    tagNames: [
      ...(defaultSchema.tagNames || []),
      'div', 'span', 'pre', 'code', 'section', 'header', 'footer', 'nav', 'article', 'aside', 'figure', 'figcaption',
      'svg', 'path', 'defs', 'symbol', 'use', 'g',
      'math', 'maction', 'maligngroup', 'malignmark', 'menclose', 'merror', 
      'mfenced', 'mfrac', 'mglyph', 'mi', 'mlabeledtr', 'mlongdiv', 
      'mmultiscripts', 'mn', 'mo', 'mover', 'mpadded', 'mphantom', 
      'mroot', 'mrow', 'ms', 'mscarries', 'mscarry', 'msgroup', 
      'msline', 'mspace', 'msqrt', 'msrow', 'mstack', 'mstyle', 
      'msub', 'msubsup', 'msup', 'mtable', 'mtd', 'mtext', 'mtr', 
      'munder', 'munderover', 'semantics', 'annotation', 'annotation-xml',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th'
    ],
    attributes: {
      ...defaultSchema.attributes,
      '*': ['className', 'class', 'style', 'ariaHidden', 'ariaLabel', 'role', 'title', 'id', 'width', 'height', 'viewBox', 'preserveAspectRatio', 'xmlns', 'd', 'fill', 'stroke', 'strokeWidth', 'opacity', 'align', 'valign'],
      code: [...(defaultSchema.attributes?.code || []), 'className', 'inline'],
      span: [...(defaultSchema.attributes?.span || []), 'className', 'style'],
      div: [...(defaultSchema.attributes?.div || []), 'className', 'class', 'style', 'align'],
      p: [...(defaultSchema.attributes?.p || []), 'align'],
      img: [...(defaultSchema.attributes?.img || []), 'align', 'width', 'height'],
      math: ['xmlns', 'display', 'alttext'],
      mtext: ['mathvariant'],
      mstyle: ['mathvariant', 'mathcolor', 'mathbackground', 'scriptlevel', 'displaystyle'],
      mo: ['lspace', 'rspace', 'stretchy', 'fence', 'separator', 'accent'],
      td: ['align', 'colSpan', 'rowSpan', 'valign'],
      th: ['align', 'colSpan', 'rowSpan', 'valign'],
    },
    clobberPrefix: '', 
  };

  const plugins: any[] = [];
  
  if (allowHtml) {
    plugins.push(rehypeRaw);
  }

  plugins.push([rehypeSanitize, sanitizeSchema]);
  plugins.push([rehypeKatex, { throwOnError: false, strict: false }]);
  // Explicitly enabling detect: true for better fallback detection of code blocks without language tags
  plugins.push([rehypeHighlight, { ignoreMissing: true, detect: true }]);

  return plugins;
};

export const remarkPlugins = [remarkMath, remarkGfm, remarkBreaks];
