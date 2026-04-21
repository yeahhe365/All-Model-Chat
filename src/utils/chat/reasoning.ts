const GEMMA_THOUGHT_CHANNEL_REGEX = /<\|channel(?:\|thought>|>thought\s*)([\s\S]*?)\s*<channel\|>/gi;
const GEMMA_THOUGHT_CHANNEL_PRESENCE_REGEX =
  /<\|channel(?:\|thought>|>thought\s*)([\s\S]*?)\s*<channel\|>/i;
const THINKING_BLOCK_REGEX = /<thinking>([\s\S]*?)<\/[^>]+>/gi;
const THINKING_BLOCK_PRESENCE_REGEX = /<thinking>([\s\S]*?)<\/[^>]+>/i;

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

export const stripReasoningMarkup = (text: string): string => {
  if (!text) {
    return '';
  }

  const hadThinkingBlock = THINKING_BLOCK_PRESENCE_REGEX.test(text);
  const withoutThinkingBlocks = text.replace(THINKING_BLOCK_REGEX, ' ');
  const { content } = extractGemmaThoughtChannel(withoutThinkingBlocks);

  if (!hadThinkingBlock) {
    return content;
  }

  return normalizeReasoningWhitespace(content);
};
