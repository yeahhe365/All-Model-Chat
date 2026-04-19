const GEMMA_THOUGHT_CHANNEL_REGEX = /<\|channel\|thought>\s*([\s\S]*?)\s*<channel\|>/gi;
const THINKING_BLOCK_REGEX = /<thinking>([\s\S]*?)<\/[^>]+>/gi;

const normalizeReasoningWhitespace = (text: string): string =>
  text
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

export const extractGemmaThoughtChannel = (
  text: string,
): { content: string; thoughts?: string } => {
  if (!text) {
    return { content: '' };
  }

  const thoughts: string[] = [];
  const content = text.replace(GEMMA_THOUGHT_CHANNEL_REGEX, (_match, innerContent: string) => {
    const normalizedThought = normalizeReasoningWhitespace(innerContent);
    if (normalizedThought) {
      thoughts.push(normalizedThought);
    }
    return ' ';
  });

  return {
    content: normalizeReasoningWhitespace(content),
    thoughts: thoughts.length > 0 ? thoughts.join('\n\n') : undefined,
  };
};

export const stripReasoningMarkup = (text: string): string => {
  const withoutThinkingBlocks = text.replace(THINKING_BLOCK_REGEX, ' ');
  return extractGemmaThoughtChannel(withoutThinkingBlocks).content;
};
