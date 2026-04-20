import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import type { PluggableList } from 'unified';
import { HIGHLIGHT_ALIASES, HIGHLIGHT_LANGUAGES, HIGHLIGHT_PLAINTEXT } from './highlightConfig';
import { remarkWrappedStrong } from './remarkWrappedStrong';

export const getBaseRehypePlugins = (allowHtml: boolean): PluggableList => {
  const sanitizeSchema = {
    ...defaultSchema,
    tagNames: [
      ...(defaultSchema.tagNames || []),
      'div', 'span', 'pre', 'code', 'section', 'header', 'footer', 'nav', 'article', 'aside', 'figure', 'figcaption',
      'svg', 'path', 'defs', 'symbol', 'use', 'g',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th',
      'details', 'summary'
    ],
    attributes: {
      ...defaultSchema.attributes,
      '*': ['className', 'class', 'style', 'ariaHidden', 'ariaLabel', 'role', 'title', 'id', 'width', 'height', 'viewBox', 'preserveAspectRatio', 'xmlns', 'd', 'fill', 'stroke', 'strokeWidth', 'opacity', 'align', 'valign'],
      code: [...(defaultSchema.attributes?.code || []), 'className', 'inline'],
      span: [...(defaultSchema.attributes?.span || []), 'className', 'style'],
      div: [...(defaultSchema.attributes?.div || []), 'className', 'class', 'style', 'align'],
      p: [...(defaultSchema.attributes?.p || []), 'align'],
      img: [...(defaultSchema.attributes?.img || []), 'align', 'width', 'height', 'src'],
      td: ['align', 'colSpan', 'rowSpan', 'valign'],
      th: ['align', 'colSpan', 'rowSpan', 'valign'],
      details: ['open', 'className'],
      summary: ['className'],
    },
    protocols: {
      ...defaultSchema.protocols,
      src: ['http', 'https', 'data', 'blob'],
    },
    clobberPrefix: '',
  };

  const plugins: PluggableList = [];

  if (allowHtml) {
    plugins.push(rehypeRaw);
  }

  plugins.push([rehypeSanitize, sanitizeSchema] as const);
  plugins.push([
    rehypeHighlight,
    {
      ignoreMissing: true,
      detect: true,
      languages: HIGHLIGHT_LANGUAGES,
      aliases: HIGHLIGHT_ALIASES,
      plainText: HIGHLIGHT_PLAINTEXT,
      subset: Object.keys(HIGHLIGHT_LANGUAGES),
    },
  ] as const);

  return plugins;
};

export const baseRemarkPlugins: PluggableList = [remarkGfm, remarkBreaks, remarkWrappedStrong];
