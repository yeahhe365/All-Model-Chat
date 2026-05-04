interface BuildChatInputSubmitTextOptions {
  inputText: string;
  quotes: string[];
  modelId: string;
  ttsContext?: string;
}

interface HasSendableChatInputContentOptions {
  inputText: string;
  quotes: string[];
  selectedFileCount: number;
  isNativeAudioModel?: boolean;
  canAcceptAttachments?: boolean;
  requiresTextPrompt?: boolean;
}

const formatQuoteBlock = (quote: string, index: number, totalQuotes: number) => {
  const label = totalQuotes > 1 ? `**Quote ${index + 1}**:\n` : '';
  const block = quote
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');

  return `${label}${block}`;
};

export const buildChatInputSubmitText = ({
  inputText,
  quotes,
  modelId,
  ttsContext,
}: BuildChatInputSubmitTextOptions) => {
  const isTtsModel = modelId.includes('tts');
  const trimmedTtsContext = ttsContext?.trim();
  const formattedQuotes =
    quotes.length > 0 ? quotes.map((quote, index) => formatQuoteBlock(quote, index, quotes.length)).join('\n\n') : '';

  if (formattedQuotes) {
    if (isTtsModel && trimmedTtsContext) {
      return `${trimmedTtsContext}\n\n#### TRANSCRIPT\n${formattedQuotes}\n\n${inputText}`;
    }

    return `${formattedQuotes}\n\n${inputText}`;
  }

  if (isTtsModel && trimmedTtsContext) {
    return `${trimmedTtsContext}\n\n#### TRANSCRIPT\n${inputText}`;
  }

  return inputText;
};

export const hasSendableChatInputContent = ({
  inputText,
  quotes,
  selectedFileCount,
  isNativeAudioModel,
  canAcceptAttachments,
  requiresTextPrompt,
}: HasSendableChatInputContentOptions): boolean => {
  const hasTextPayload = inputText.trim() !== '' || quotes.length > 0;

  if (requiresTextPrompt || isNativeAudioModel || canAcceptAttachments === false) {
    return hasTextPayload;
  }

  return hasTextPayload || selectedFileCount > 0;
};
