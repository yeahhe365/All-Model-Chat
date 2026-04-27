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
      'div',
      'span',
      'pre',
      'code',
      'section',
      'header',
      'footer',
      'nav',
      'article',
      'aside',
      'figure',
      'figcaption',
      'svg',
      'path',
      'defs',
      'symbol',
      'use',
      'g',
      'table',
      'caption',
      'colgroup',
      'col',
      'thead',
      'tbody',
      'tfoot',
      'tr',
      'td',
      'th',
      'details',
      'summary',
    ],
    attributes: {
      ...defaultSchema.attributes,
      '*': ['ariaHidden', 'ariaLabel', 'role', 'title'],
      code: [...(defaultSchema.attributes?.code || []), 'inline'],
      span: [...(defaultSchema.attributes?.span || [])],
      div: [...(defaultSchema.attributes?.div || []), 'align', ['className', 'tool-result', /^outcome-[a-z0-9_-]+$/]],
      p: [...(defaultSchema.attributes?.p || []), 'align'],
      img: [...(defaultSchema.attributes?.img || []), 'align', 'width', 'height', 'src'],
      caption: ['align'],
      colgroup: ['span', 'width'],
      col: ['span', 'width'],
      td: ['align', 'colSpan', 'rowSpan', 'valign'],
      th: ['align', 'colSpan', 'rowSpan', 'valign'],
      svg: ['width', 'height', 'viewBox', 'preserveAspectRatio', 'xmlns', 'fill', 'stroke', 'strokeWidth', 'opacity'],
      path: ['d', 'fill', 'stroke', 'strokeWidth', 'opacity'],
      defs: [],
      symbol: ['viewBox'],
      use: ['href'],
      g: ['fill', 'stroke', 'strokeWidth', 'opacity'],
      details: ['open'],
      summary: [],
    },
    protocols: {
      ...defaultSchema.protocols,
      src: ['http', 'https', 'data', 'blob'],
    },
    clobberPrefix: 'user-content-',
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
