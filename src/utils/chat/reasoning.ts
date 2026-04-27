const GEMMA_THOUGHT_CHANNEL_REGEX = /<\|channel(?:\|thought>|>thought\s*)([\s\S]*?)\s*<channel\|>/gi;
const GEMMA_THOUGHT_CHANNEL_PRESENCE_REGEX = /<\|channel(?:\|thought>|>thought\s*)([\s\S]*?)\s*<channel\|>/i;
const THINKING_BLOCK_REGEX = /<thinking>([\s\S]*?)<\/[^>]+>/gi;
const THINKING_BLOCK_PRESENCE_REGEX = /<thinking>([\s\S]*?)<\/[^>]+>/i;
const RAW_THINKING_BLOCK_REGEX = /<thinking>([\s\S]*?)<\/thinking>/gi;
const RAW_OPEN_THINKING_BLOCK_REGEX = /<thinking>([\s\S]*)$/i;

type MarkdownSegment = {
  type: 'text' | 'literal';
  value: string;
};

const normalizeReasoningWhitespace = (text: string): string =>
  text
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

const splitMarkdownSegments = (value: string): MarkdownSegment[] => {
  if (!value) {
    return [];
  }

  const segments: MarkdownSegment[] = [];
  let cursor = 0;

  while (cursor < value.length) {
    if (value.startsWith('```', cursor)) {
      const closingFenceIndex = value.indexOf('```', cursor + 3);

      if (closingFenceIndex === -1) {
        segments.push({ type: 'literal', value: value.slice(cursor) });
        break;
      }

      segments.push({
        type: 'literal',
        value: value.slice(cursor, closingFenceIndex + 3),
      });
      cursor = closingFenceIndex + 3;
      continue;
    }

    if (value[cursor] === '`') {
      let tickCount = 1;
      while (value[cursor + tickCount] === '`') {
        tickCount += 1;
      }

      const delimiter = '`'.repeat(tickCount);
      const closingInlineCodeIndex = value.indexOf(delimiter, cursor + tickCount);

      if (closingInlineCodeIndex === -1) {
        segments.push({ type: 'text', value: value.slice(cursor, cursor + tickCount) });
        cursor += tickCount;
        continue;
      }

      segments.push({
        type: 'literal',
        value: value.slice(cursor, closingInlineCodeIndex + tickCount),
      });
      cursor = closingInlineCodeIndex + tickCount;
      continue;
    }

    const nextCodeDelimiterIndex = value.indexOf('`', cursor);
    const nextCursor = nextCodeDelimiterIndex === -1 ? value.length : nextCodeDelimiterIndex;
    segments.push({ type: 'text', value: value.slice(cursor, nextCursor) });
    cursor = nextCursor;
  }

  return segments.filter((segment) => segment.value.length > 0);
};

export const extractGemmaThoughtChannel = (text: string): { content: string; thoughts?: string } => {
  if (!text) {
    return { content: '' };
  }

  if (!GEMMA_THOUGHT_CHANNEL_PRESENCE_REGEX.test(text)) {
    return { content: text };
  }

  const thoughts: string[] = [];
  const content = text.replace(GEMMA_THOUGHT_CHANNEL_REGEX, (_match, innerContent: string) => {
    const normalizedThought = normalizeReasoningWhitespace(innerContent);
    if (normalizedThought) {
      thoughts.push(normalizedThought);
    }
    return ' ';
  });

  const extractedContent = normalizeReasoningWhitespace(content);
  if (thoughts.length === 0) {
    return { content: extractedContent };
  }

  return {
    content: extractedContent,
    thoughts: thoughts.join('\n\n'),
  };
};

export const extractRawThinkingBlocks = (
  text: string,
): { content: string; thoughts?: string; hasOpenThinkingBlock: boolean } => {
  if (!text) {
    return { content: '', hasOpenThinkingBlock: false };
  }

  const thoughts: string[] = [];
  let hasOpenThinkingBlock = false;
  let foundThinkingMarkup = false;

  const content = splitMarkdownSegments(text)
    .map((segment) => {
      if (segment.type === 'literal') {
        return segment.value;
      }

      let segmentContent = segment.value.replace(RAW_THINKING_BLOCK_REGEX, (_match, innerContent: string) => {
        foundThinkingMarkup = true;
        const normalizedThought = normalizeReasoningWhitespace(innerContent);
        if (normalizedThought) {
          thoughts.push(normalizedThought);
        }
        return ' ';
      });

      const openMatch = RAW_OPEN_THINKING_BLOCK_REGEX.exec(segmentContent);
      if (openMatch) {
        foundThinkingMarkup = true;
        hasOpenThinkingBlock = true;
        const normalizedThought = normalizeReasoningWhitespace(openMatch[1]);
        if (normalizedThought) {
          thoughts.push(normalizedThought);
        }
        segmentContent = segmentContent.slice(0, openMatch.index);
      }

      return segmentContent;
    })
    .join('');

  if (!foundThinkingMarkup) {
    return { content: text, hasOpenThinkingBlock: false };
  }

  return {
    content: normalizeReasoningWhitespace(content),
    thoughts: thoughts.length > 0 ? thoughts.join('\n\n') : undefined,
    hasOpenThinkingBlock,
  };
};

export const stripReasoningMarkup = (text: string): string => {
  if (!text) {
    return '';
  }

  const rawExtraction = extractRawThinkingBlocks(text);
  const hadThinkingBlock = THINKING_BLOCK_PRESENCE_REGEX.test(text) || rawExtraction.hasOpenThinkingBlock;
  const withoutThinkingBlocks = rawExtraction.content.replace(THINKING_BLOCK_REGEX, ' ');
  const { content } = extractGemmaThoughtChannel(withoutThinkingBlocks);

  if (!hadThinkingBlock) {
    return content;
  }

  return normalizeReasoningWhitespace(content);
};
