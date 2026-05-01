import type { Part, UsageMetadata } from '@google/genai';
import type { ChatHistoryItem, NonStreamMessageSender, StreamMessageSender } from '../../types';
import { DEFAULT_OPENAI_COMPATIBLE_BASE_URL } from '../../utils/apiProxyUrl';
import { isAudioMimeType, isImageMimeType } from '../../utils/fileTypeUtils';
import { logService } from '../logService';

interface OpenAICompatibleChatConfig {
  baseUrl?: string | null;
  systemInstruction?: string;
  temperature?: number;
  topP?: number;
}

type OpenAIMessageContent =
  | string
  | Array<
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }
      | { type: 'input_audio'; input_audio: { data: string; format: string } }
    >;

type OpenAIMessage = {
  role: 'system' | 'user' | 'assistant';
  content: OpenAIMessageContent;
};

type OpenAIUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

type OpenAIChoice = {
  message?: {
    content?: string | Array<{ text?: string }>;
  };
  delta?: {
    content?: string;
  };
};

type OpenAIResponsePayload = {
  choices?: OpenAIChoice[];
  usage?: OpenAIUsage;
  error?: {
    message?: string;
  };
};

export const buildOpenAICompatibleChatCompletionsUrl = (baseUrl?: string | null): string => {
  const normalizedBaseUrl = (baseUrl?.trim() || DEFAULT_OPENAI_COMPATIBLE_BASE_URL).replace(/\/+$/, '');
  return `${normalizedBaseUrl}/chat/completions`;
};

const asOpenAICompatibleConfig = (config: unknown): OpenAICompatibleChatConfig =>
  typeof config === 'object' && config !== null ? (config as OpenAICompatibleChatConfig) : {};

const mapUsage = (usage?: OpenAIUsage): UsageMetadata | undefined => {
  if (!usage) {
    return undefined;
  }

  return {
    promptTokenCount: usage.prompt_tokens,
    candidatesTokenCount: usage.completion_tokens,
    totalTokenCount: usage.total_tokens,
  } as UsageMetadata;
};

const getInlineAudioFormat = (mimeType: string): string => {
  const subtype = mimeType.split('/')[1]?.split(';')[0]?.trim();
  return subtype || 'wav';
};

const partToOpenAIContentItems = (
  part: Part,
): Array<
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }
  | { type: 'input_audio'; input_audio: { data: string; format: string } }
> => {
  const partWithMedia = part as Part & {
    inlineData?: {
      mimeType?: string;
      data?: string;
    };
  };

  if (typeof part.text === 'string') {
    return part.text ? [{ type: 'text', text: part.text }] : [];
  }

  const inlineData = partWithMedia.inlineData;
  const mimeType = inlineData?.mimeType;
  if (inlineData?.data && mimeType && isImageMimeType(mimeType)) {
    return [
      {
        type: 'image_url',
        image_url: {
          url: `data:${mimeType};base64,${inlineData.data}`,
        },
      },
    ];
  }

  if (inlineData?.data && mimeType && isAudioMimeType(mimeType)) {
    return [
      {
        type: 'input_audio',
        input_audio: {
          data: inlineData.data,
          format: getInlineAudioFormat(mimeType),
        },
      },
    ];
  }

  return [];
};

const partsToOpenAIContent = (parts: Part[]): OpenAIMessageContent => {
  const contentItems = parts.flatMap(partToOpenAIContentItems);
  const hasOnlyText = contentItems.every((item) => item.type === 'text');

  if (hasOnlyText) {
    return contentItems
      .map((item) => (item.type === 'text' ? item.text : ''))
      .filter(Boolean)
      .join('\n');
  }

  return contentItems;
};

const buildMessages = (
  history: ChatHistoryItem[],
  parts: Part[],
  role: 'user' | 'model',
  config: OpenAICompatibleChatConfig,
): OpenAIMessage[] => {
  const messages: OpenAIMessage[] = [];
  const systemInstruction = config.systemInstruction?.trim();

  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }

  for (const item of history) {
    const content = partsToOpenAIContent(item.parts);
    if ((typeof content === 'string' && !content.trim()) || (Array.isArray(content) && content.length === 0)) {
      continue;
    }

    messages.push({
      role: item.role === 'model' ? 'assistant' : 'user',
      content,
    });
  }

  const currentContent = partsToOpenAIContent(parts);
  if (
    (typeof currentContent === 'string' && currentContent.trim()) ||
    (Array.isArray(currentContent) && currentContent.length > 0)
  ) {
    messages.push({
      role: role === 'model' ? 'assistant' : 'user',
      content: currentContent,
    });
  }

  return messages;
};

const buildRequestBody = (
  modelId: string,
  history: ChatHistoryItem[],
  parts: Part[],
  config: OpenAICompatibleChatConfig,
  role: 'user' | 'model',
  stream: boolean,
): Record<string, unknown> => {
  const body: Record<string, unknown> = {
    model: modelId,
    messages: buildMessages(history, parts, role, config),
    stream,
  };

  if (typeof config.temperature === 'number') {
    body.temperature = config.temperature;
  }

  if (typeof config.topP === 'number') {
    body.top_p = config.topP;
  }

  if (stream) {
    body.stream_options = { include_usage: true };
  }

  return body;
};

const createRequestInit = (apiKey: string, body: Record<string, unknown>, abortSignal: AbortSignal): RequestInit => ({
  method: 'POST',
  headers: {
    authorization: `Bearer ${apiKey}`,
    'content-type': 'application/json',
  },
  body: JSON.stringify(body),
  signal: abortSignal,
});

const readErrorMessage = async (response: Response): Promise<string> => {
  const text = await response.text();
  if (!text) {
    return `OpenAI-compatible request failed with status ${response.status}`;
  }

  try {
    const parsed = JSON.parse(text) as OpenAIResponsePayload;
    return parsed.error?.message || text;
  } catch {
    return text;
  }
};

const extractMessageText = (payload: OpenAIResponsePayload): string => {
  const content = payload.choices?.[0]?.message?.content;

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => item.text)
      .filter((text): text is string => typeof text === 'string')
      .join('');
  }

  return '';
};

export const sendOpenAICompatibleMessageNonStream: NonStreamMessageSender = async (
  apiKey,
  modelId,
  history,
  parts,
  config,
  abortSignal,
  onError,
  onComplete,
  role = 'user',
) => {
  const compatibleConfig = asOpenAICompatibleConfig(config);

  try {
    if (abortSignal.aborted) {
      onComplete([], undefined, undefined, undefined, undefined);
      return;
    }

    const response = await fetch(
      buildOpenAICompatibleChatCompletionsUrl(compatibleConfig.baseUrl),
      createRequestInit(apiKey, buildRequestBody(modelId, history, parts, compatibleConfig, role, false), abortSignal),
    );

    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }

    const payload = (await response.json()) as OpenAIResponsePayload;
    if (abortSignal.aborted) {
      onComplete([], undefined, undefined, undefined, undefined);
      return;
    }

    const text = extractMessageText(payload);
    onComplete(text ? [{ text }] : [], undefined, mapUsage(payload.usage), undefined, undefined);
  } catch (error) {
    logService.error('OpenAI-compatible non-stream request failed:', error);
    onError(error instanceof Error ? error : new Error(String(error)));
  }
};

const parseSseDataLines = (buffer: string): { events: string[]; rest: string } => {
  const events: string[] = [];
  let searchStart = 0;
  let boundaryIndex = buffer.indexOf('\n\n', searchStart);

  while (boundaryIndex !== -1) {
    const rawEvent = buffer.slice(searchStart, boundaryIndex);
    const data = rawEvent
      .split('\n')
      .map((line) => line.trimEnd())
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n');

    if (data) {
      events.push(data);
    }

    searchStart = boundaryIndex + 2;
    boundaryIndex = buffer.indexOf('\n\n', searchStart);
  }

  return { events, rest: buffer.slice(searchStart) };
};

const readStreamEvents = async (
  response: Response,
  abortSignal: AbortSignal,
  onEvent: (payload: OpenAIResponsePayload) => void,
): Promise<void> => {
  if (!response.body) {
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done || abortSignal.aborted) {
      break;
    }

    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
    const parsed = parseSseDataLines(buffer);
    buffer = parsed.rest;

    for (const event of parsed.events) {
      if (event === '[DONE]') {
        return;
      }
      onEvent(JSON.parse(event) as OpenAIResponsePayload);
    }
  }

  const tail = decoder.decode();
  if (tail) {
    buffer += tail.replace(/\r\n/g, '\n');
  }
  const parsed = parseSseDataLines(`${buffer}\n\n`);
  for (const event of parsed.events) {
    if (event !== '[DONE]') {
      onEvent(JSON.parse(event) as OpenAIResponsePayload);
    }
  }
};

export const sendOpenAICompatibleMessageStream: StreamMessageSender = async (
  apiKey,
  modelId,
  history,
  parts,
  config,
  abortSignal,
  onPart,
  _onThoughtChunk,
  onError,
  onComplete,
  role = 'user',
) => {
  const compatibleConfig = asOpenAICompatibleConfig(config);
  let finalUsage: UsageMetadata | undefined;

  try {
    if (abortSignal.aborted) {
      onComplete(undefined, undefined, undefined);
      return;
    }

    const response = await fetch(
      buildOpenAICompatibleChatCompletionsUrl(compatibleConfig.baseUrl),
      createRequestInit(apiKey, buildRequestBody(modelId, history, parts, compatibleConfig, role, true), abortSignal),
    );

    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }

    await readStreamEvents(response, abortSignal, (payload) => {
      const content = payload.choices?.[0]?.delta?.content;
      if (content) {
        onPart({ text: content });
      }
      const usage = mapUsage(payload.usage);
      if (usage) {
        finalUsage = usage;
      }
    });

    onComplete(finalUsage, undefined, undefined);
  } catch (error) {
    logService.error('OpenAI-compatible stream request failed:', error);
    onError(error instanceof Error ? error : new Error(String(error)));
  }
};
