type MarkdownNode = {
  type: string;
  value?: string;
  children?: MarkdownNode[];
};

const WRAPPED_STRONG_PATTERN = /(\*\*|__)(["'“‘([{（【《「『])([^\n]*?)(["'”’)\]}）】》」』])([^\n]*?)\1/gu;
const WRAPPER_PAIRS: Record<string, string> = {
  '"': '"',
  "'": "'",
  '“': '”',
  '‘': '’',
  '(': ')',
  '（': '）',
  '[': ']',
  '【': '】',
  '{': '}',
  '《': '》',
  '「': '」',
  '『': '』',
};
const LETTERLIKE_CONTENT = /\p{L}/u;

const convertWrappedStrongText = (value: string): MarkdownNode[] | null => {
  const segments: MarkdownNode[] = [];
  let cursor = 0;

  for (const match of value.matchAll(WRAPPED_STRONG_PATTERN)) {
    const [fullMatch, , openingWrapper, innerContent, closingWrapper, trailingContent] = match;
    const matchIndex = match.index ?? -1;

    if (matchIndex < 0) {
      continue;
    }

    if (WRAPPER_PAIRS[openingWrapper] !== closingWrapper) {
      continue;
    }

    if (!LETTERLIKE_CONTENT.test(innerContent)) {
      continue;
    }

    if (cursor < matchIndex) {
      segments.push({ type: 'text', value: value.slice(cursor, matchIndex) });
    }

    segments.push({
      type: 'strong',
      children: [{ type: 'text', value: `${openingWrapper}${innerContent}${closingWrapper}${trailingContent}` }],
    });
    cursor = matchIndex + fullMatch.length;
  }

  if (segments.length === 0) {
    return null;
  }

  if (cursor < value.length) {
    segments.push({ type: 'text', value: value.slice(cursor) });
  }

  return segments;
};

const normalizeWrappedStrongNodes = (node: MarkdownNode) => {
  if (!node.children || node.children.length === 0) {
    return;
  }

  const normalizedChildren: MarkdownNode[] = [];

  for (const child of node.children) {
    if (child.type === 'text' && typeof child.value === 'string') {
      const converted = convertWrappedStrongText(child.value);
      if (converted) {
        normalizedChildren.push(...converted);
        continue;
      }
    }

    normalizeWrappedStrongNodes(child);
    normalizedChildren.push(child);
  }

  node.children = normalizedChildren;
};

export const remarkWrappedStrong = () => {
  return (tree: MarkdownNode) => {
    normalizeWrappedStrongNodes(tree);
  };
};
