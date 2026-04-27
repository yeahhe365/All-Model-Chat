type MarkdownNode = {
  type: string;
  value?: string;
  children?: MarkdownNode[];
};

const STRONG_FALLBACK_PATTERN = /(\*\*|__)(?!\s)([^\n]*?\S)\1/gu;
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
const ASCII_WORD_CHARACTER = /[A-Za-z0-9]/;

const hasOddBackslashEscape = (value: string, index: number): boolean => {
  let slashCount = 0;

  for (let cursor = index - 1; cursor >= 0 && value[cursor] === '\\'; cursor -= 1) {
    slashCount += 1;
  }

  return slashCount % 2 === 1;
};

const isPartOfLongerDelimiterRun = (
  value: string,
  matchIndex: number,
  fullMatch: string,
  delimiter: string,
): boolean => {
  const delimiterCharacter = delimiter[0];
  const openingStart = matchIndex;
  const openingEnd = openingStart + delimiter.length;
  const closingStart = matchIndex + fullMatch.length - delimiter.length;
  const closingEnd = matchIndex + fullMatch.length;

  return (
    value[openingStart - 1] === delimiterCharacter ||
    value[openingEnd] === delimiterCharacter ||
    value[closingStart - 1] === delimiterCharacter ||
    value[closingEnd] === delimiterCharacter
  );
};

const hasUnclosedLeadingWrapper = (innerContent: string): boolean => {
  const openingWrapper = innerContent[0];
  const closingWrapper = WRAPPER_PAIRS[openingWrapper];

  return Boolean(closingWrapper && !innerContent.slice(1).includes(closingWrapper));
};

const isUnsafeUnderscoreFallback = (value: string, matchIndex: number, fullMatch: string): boolean => {
  const previousCharacter = value[matchIndex - 1] ?? '';
  const nextCharacter = value[matchIndex + fullMatch.length] ?? '';

  return ASCII_WORD_CHARACTER.test(previousCharacter) && ASCII_WORD_CHARACTER.test(nextCharacter);
};

const shouldConvertStrongFallback = (
  value: string,
  matchIndex: number,
  fullMatch: string,
  delimiter: string,
  innerContent: string,
): boolean => {
  if (!LETTERLIKE_CONTENT.test(innerContent)) {
    return false;
  }

  if (hasOddBackslashEscape(value, matchIndex)) {
    return false;
  }

  if (isPartOfLongerDelimiterRun(value, matchIndex, fullMatch, delimiter)) {
    return false;
  }

  if (hasUnclosedLeadingWrapper(innerContent)) {
    return false;
  }

  return delimiter !== '__' || !isUnsafeUnderscoreFallback(value, matchIndex, fullMatch);
};

const createTextNode = (value: string): MarkdownNode => ({ type: 'text', value });

const createStrongNode = (value: string): MarkdownNode => ({
  type: 'strong',
  children: [createTextNode(value)],
});

const isValidStrongFallbackInner = (innerContent: string): boolean =>
  innerContent.length > 0 &&
  !/^\s|\s$/u.test(innerContent) &&
  LETTERLIKE_CONTENT.test(innerContent) &&
  !hasUnclosedLeadingWrapper(innerContent);

const findTrailingFallbackOpening = (
  value: string,
): {
  prefix: string;
  delimiter: string;
  innerContent: string;
  matchIndex: number;
} | null => {
  const candidates = ['**', '__']
    .map((delimiter) => ({ delimiter, matchIndex: value.lastIndexOf(delimiter) }))
    .filter((candidate) => candidate.matchIndex >= 0)
    .sort((a, b) => b.matchIndex - a.matchIndex);

  for (const { delimiter, matchIndex } of candidates) {
    const innerContent = value.slice(matchIndex + delimiter.length);
    const delimiterCharacter = delimiter[0];

    if (!isValidStrongFallbackInner(innerContent)) {
      continue;
    }

    if (hasOddBackslashEscape(value, matchIndex)) {
      continue;
    }

    if (value[matchIndex - 1] === delimiterCharacter || value[matchIndex + delimiter.length] === delimiterCharacter) {
      continue;
    }

    return {
      prefix: value.slice(0, matchIndex),
      delimiter,
      innerContent,
      matchIndex,
    };
  }

  return null;
};

const findLeadingFallbackClosing = (
  value: string,
  delimiter: string,
): {
  innerContent: string;
  suffix: string;
} | null => {
  const delimiterIndex = value.indexOf(delimiter);

  if (delimiterIndex <= 0) {
    return null;
  }

  const innerContent = value.slice(0, delimiterIndex);
  const delimiterCharacter = delimiter[0];
  const closingEnd = delimiterIndex + delimiter.length;

  if (!isValidStrongFallbackInner(innerContent)) {
    return null;
  }

  if (value[delimiterIndex - 1] === delimiterCharacter || value[closingEnd] === delimiterCharacter) {
    return null;
  }

  return {
    innerContent,
    suffix: value.slice(closingEnd),
  };
};

const getPlainStrongText = (node: MarkdownNode): string | null => {
  if (node.type !== 'strong' || !node.children) {
    return null;
  }

  let text = '';

  for (const child of node.children) {
    if (child.type !== 'text' || typeof child.value !== 'string') {
      return null;
    }

    text += child.value;
  }

  return text;
};

const shouldRepairSplitUnderscoreFallback = (
  leftText: string,
  leftMatchIndex: number,
  middleText: string,
  rightSuffix: string,
): boolean => {
  const leftPreviousCharacter = leftText[leftMatchIndex - 1] ?? '';
  const leftNextCharacter = middleText[0] ?? '';
  const rightPreviousCharacter = middleText[middleText.length - 1] ?? '';
  const rightNextCharacter = rightSuffix[0] ?? '';

  return !(
    (ASCII_WORD_CHARACTER.test(leftPreviousCharacter) && ASCII_WORD_CHARACTER.test(leftNextCharacter)) ||
    (ASCII_WORD_CHARACTER.test(rightPreviousCharacter) && ASCII_WORD_CHARACTER.test(rightNextCharacter))
  );
};

// CommonMark can mispair two fallback strong runs and wrap the text between them.
const repairSplitStrongFallbackNodes = (children: MarkdownNode[]): MarkdownNode[] => {
  const repairedChildren: MarkdownNode[] = [];

  for (let index = 0; index < children.length; index += 1) {
    const leftNode = children[index];
    const middleNode = children[index + 1];
    const rightNode = children[index + 2];

    if (
      leftNode?.type === 'text' &&
      typeof leftNode.value === 'string' &&
      rightNode?.type === 'text' &&
      typeof rightNode.value === 'string'
    ) {
      const middleText = middleNode ? getPlainStrongText(middleNode) : null;
      const leftSplit = findTrailingFallbackOpening(leftNode.value);

      if (middleText !== null && leftSplit) {
        const rightSplit = findLeadingFallbackClosing(rightNode.value, leftSplit.delimiter);
        if (!rightSplit) {
          repairedChildren.push(leftNode);
          continue;
        }

        const canRepairUnderscore =
          leftSplit.delimiter !== '__' ||
          shouldRepairSplitUnderscoreFallback(leftNode.value, leftSplit.matchIndex, middleText, rightSplit.suffix);

        if (canRepairUnderscore) {
          if (leftSplit.prefix) {
            repairedChildren.push(createTextNode(leftSplit.prefix));
          }

          repairedChildren.push(createStrongNode(leftSplit.innerContent));

          if (middleText) {
            repairedChildren.push(createTextNode(middleText));
          }

          repairedChildren.push(createStrongNode(rightSplit.innerContent));

          if (rightSplit.suffix) {
            repairedChildren.push(createTextNode(rightSplit.suffix));
          }

          index += 2;
          continue;
        }
      }
    }

    repairedChildren.push(leftNode);
  }

  return repairedChildren;
};

const convertStrongText = (value: string): MarkdownNode[] | null => {
  const segments: MarkdownNode[] = [];
  let cursor = 0;

  for (const match of value.matchAll(STRONG_FALLBACK_PATTERN)) {
    const [fullMatch, delimiter, innerContent] = match;
    const matchIndex = match.index ?? -1;

    if (matchIndex < 0) {
      continue;
    }

    if (!shouldConvertStrongFallback(value, matchIndex, fullMatch, delimiter, innerContent)) {
      continue;
    }

    if (cursor < matchIndex) {
      segments.push({ type: 'text', value: value.slice(cursor, matchIndex) });
    }

    segments.push(createStrongNode(innerContent));
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

  node.children = repairSplitStrongFallbackNodes(node.children);

  const normalizedChildren: MarkdownNode[] = [];

  for (const child of node.children) {
    if (child.type === 'text' && typeof child.value === 'string') {
      const converted = convertStrongText(child.value);
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
