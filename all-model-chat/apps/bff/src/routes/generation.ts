import { IncomingMessage, ServerResponse } from 'node:http';
import { Part, Type } from '@google/genai';
import { GeminiProviderClient } from '../providers/geminiClient.js';
import type {
  CountTokensRequest,
  EditImageRequest,
  ImageGenerationRequest,
  SpeechGenerationRequest,
  SuggestionsRequest,
  TitleRequest,
  TranscribeAudioRequest,
  TranslateRequest,
} from '@all-model-chat/shared-api';
import {
  RequestValidationError,
  isObject,
  mapProviderError,
  readJsonBody,
  sendJson,
} from './routeCommon.js';

const parseString = (
  value: unknown,
  fieldName: string,
  options?: { allowEmpty?: boolean }
): string => {
  if (typeof value !== 'string') {
    throw new RequestValidationError('invalid_request', 400, `\`${fieldName}\` must be a string.`);
  }

  const normalized = value.trim();
  if (!options?.allowEmpty && normalized.length === 0) {
    throw new RequestValidationError('invalid_request', 400, `\`${fieldName}\` must not be empty.`);
  }

  return normalized;
};

const parseOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

const parsePartArray = (value: unknown, fieldName: string): Part[] => {
  if (!Array.isArray(value)) {
    throw new RequestValidationError('invalid_request', 400, `\`${fieldName}\` must be an array.`);
  }

  for (let index = 0; index < value.length; index += 1) {
    if (!isObject(value[index])) {
      throw new RequestValidationError(
        'invalid_request',
        400,
        `\`${fieldName}[${index}]\` must be an object.`
      );
    }
  }

  return value as Part[];
};

const parseHistoryArray = (value: unknown, fieldName: string): Array<{ role: 'user' | 'model'; parts: Part[] }> => {
  if (!Array.isArray(value)) {
    throw new RequestValidationError('invalid_request', 400, `\`${fieldName}\` must be an array.`);
  }

  return value.map((entry, index) => {
    if (!isObject(entry)) {
      throw new RequestValidationError('invalid_request', 400, `\`${fieldName}[${index}]\` must be an object.`);
    }

    const role = entry.role;
    if (role !== 'user' && role !== 'model') {
      throw new RequestValidationError(
        'invalid_request',
        400,
        `\`${fieldName}[${index}].role\` must be \"user\" or \"model\".`
      );
    }

    return {
      role,
      parts: parsePartArray(entry.parts, `${fieldName}[${index}].parts`),
    };
  });
};

const parseImageGenerationRequest = (payload: unknown): ImageGenerationRequest => {
  if (!isObject(payload)) {
    throw new RequestValidationError('invalid_request', 400, 'Request body must be a JSON object.');
  }

  return {
    model: parseString(payload.model, 'model'),
    prompt: parseString(payload.prompt, 'prompt'),
    aspectRatio: parseString(payload.aspectRatio, 'aspectRatio'),
    imageSize: parseOptionalString(payload.imageSize),
  };
};

const parseSpeechGenerationRequest = (payload: unknown): SpeechGenerationRequest => {
  if (!isObject(payload)) {
    throw new RequestValidationError('invalid_request', 400, 'Request body must be a JSON object.');
  }

  return {
    model: parseString(payload.model, 'model'),
    text: parseString(payload.text, 'text'),
    voice: parseString(payload.voice, 'voice'),
  };
};

const parseTranscribeRequest = (payload: unknown): TranscribeAudioRequest => {
  if (!isObject(payload)) {
    throw new RequestValidationError('invalid_request', 400, 'Request body must be a JSON object.');
  }

  return {
    model: parseString(payload.model, 'model'),
    mimeType: parseString(payload.mimeType, 'mimeType'),
    audioBase64: parseString(payload.audioBase64, 'audioBase64'),
  };
};

const parseTranslateRequest = (payload: unknown): TranslateRequest => {
  if (!isObject(payload)) {
    throw new RequestValidationError('invalid_request', 400, 'Request body must be a JSON object.');
  }

  return {
    text: parseString(payload.text, 'text'),
    targetLanguage: parseOptionalString(payload.targetLanguage),
  };
};

const parseTitleRequest = (payload: unknown): TitleRequest => {
  if (!isObject(payload)) {
    throw new RequestValidationError('invalid_request', 400, 'Request body must be a JSON object.');
  }

  const language = payload.language === 'zh' ? 'zh' : 'en';

  return {
    userContent: parseString(payload.userContent, 'userContent'),
    modelContent: parseString(payload.modelContent, 'modelContent'),
    language,
  };
};

const parseSuggestionsRequest = (payload: unknown): SuggestionsRequest => {
  if (!isObject(payload)) {
    throw new RequestValidationError('invalid_request', 400, 'Request body must be a JSON object.');
  }

  const language = payload.language === 'zh' ? 'zh' : 'en';

  return {
    userContent: parseString(payload.userContent, 'userContent'),
    modelContent: parseString(payload.modelContent, 'modelContent'),
    language,
  };
};

const parseCountTokensRequest = (payload: unknown): CountTokensRequest => {
  if (!isObject(payload)) {
    throw new RequestValidationError('invalid_request', 400, 'Request body must be a JSON object.');
  }

  return {
    model: parseString(payload.model, 'model'),
    parts: parsePartArray(payload.parts, 'parts'),
  };
};

const parseEditImageRequest = (payload: unknown): EditImageRequest => {
  if (!isObject(payload)) {
    throw new RequestValidationError('invalid_request', 400, 'Request body must be a JSON object.');
  }

  return {
    model: parseString(payload.model, 'model'),
    history: parseHistoryArray(payload.history || [], 'history'),
    parts: parsePartArray(payload.parts || [], 'parts'),
    aspectRatio: parseOptionalString(payload.aspectRatio),
    imageSize: parseOptionalString(payload.imageSize),
  };
};

const parseSuggestionsResponse = (responseText: string): string[] => {
  const parsed = JSON.parse(responseText);
  if (!parsed || !Array.isArray(parsed.suggestions)) {
    throw new Error('Suggestions response did not contain `suggestions` array.');
  }

  return parsed.suggestions.filter((entry: unknown) => typeof entry === 'string').slice(0, 3);
};

const handleGenerateImages = async (
  request: IncomingMessage,
  response: ServerResponse,
  geminiProviderClient: GeminiProviderClient
): Promise<void> => {
  const parsed = parseImageGenerationRequest(await readJsonBody(request));

  const images = await geminiProviderClient.withClient(async ({ client }) => {
    const config: Record<string, unknown> = {
      numberOfImages: 1,
      outputMimeType: 'image/png',
      aspectRatio: parsed.aspectRatio,
    };

    if (parsed.imageSize) {
      config.imageSize = parsed.imageSize;
    }

    const result = await client.models.generateImages({
      model: parsed.model,
      prompt: parsed.prompt,
      config,
    });

    return result.generatedImages?.map((item) => item.image?.imageBytes).filter((item): item is string => !!item) || [];
  });

  if (images.length === 0) {
    throw new RequestValidationError(
      'provider_empty_response',
      502,
      'No images were generated by upstream provider.'
    );
  }

  sendJson(response, 200, { images });
};

const handleGenerateSpeech = async (
  request: IncomingMessage,
  response: ServerResponse,
  geminiProviderClient: GeminiProviderClient
): Promise<void> => {
  const parsed = parseSpeechGenerationRequest(await readJsonBody(request));

  const audioData = await geminiProviderClient.withClient(async ({ client }) => {
    const result = await client.models.generateContent({
      model: parsed.model,
      contents: [{ parts: [{ text: parsed.text }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: parsed.voice } },
        },
      },
    });

    return result.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  });

  if (!audioData) {
    throw new RequestValidationError('provider_empty_response', 502, 'No audio data returned by upstream provider.');
  }

  sendJson(response, 200, { audioData });
};

const buildTranscribeConfig = (modelId: string): Record<string, unknown> => {
  const config: Record<string, unknown> = {
    systemInstruction:
      '请准确转录语音内容。使用正确的标点符号。不要描述音频、回答问题或添加对话填充词，仅返回文本。若音频中无语音或仅有背景噪音，请不要输出任何文字。',
  };

  if (modelId.includes('gemini-3')) {
    config.thinkingConfig = {
      includeThoughts: false,
      thinkingLevel: 'MINIMAL',
    };
  } else if (modelId === 'gemini-2.5-pro') {
    config.thinkingConfig = { thinkingBudget: 128 };
  } else if (modelId.includes('flash')) {
    config.thinkingConfig = { thinkingBudget: 512 };
  } else {
    config.thinkingConfig = { thinkingBudget: 0 };
  }

  return config;
};

const handleTranscribeAudio = async (
  request: IncomingMessage,
  response: ServerResponse,
  geminiProviderClient: GeminiProviderClient
): Promise<void> => {
  const parsed = parseTranscribeRequest(await readJsonBody(request, 16 * 1024 * 1024));

  const text = await geminiProviderClient.withClient(async ({ client }) => {
    const result = await client.models.generateContent({
      model: parsed.model,
      contents: {
        parts: [
          { text: 'Transcribe audio.' },
          {
            inlineData: {
              mimeType: parsed.mimeType,
              data: parsed.audioBase64,
            },
          },
        ],
      },
      config: buildTranscribeConfig(parsed.model),
    });

    return result.text?.trim() || '';
  });

  if (!text) {
    throw new RequestValidationError('provider_empty_response', 502, 'Transcription returned empty response.');
  }

  sendJson(response, 200, { text });
};

const handleTranslate = async (
  request: IncomingMessage,
  response: ServerResponse,
  geminiProviderClient: GeminiProviderClient
): Promise<void> => {
  const parsed = parseTranslateRequest(await readJsonBody(request));
  const targetLanguage = parsed.targetLanguage || 'English';
  const prompt = `Translate the following text to ${targetLanguage}. Only return the translated text, without any additional explanation or formatting.\n\nText to translate:\n"""\n${parsed.text}\n"""`;

  const text = await geminiProviderClient.withClient(async ({ client }) => {
    const result = await client.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: prompt,
      config: {
        temperature: 0.1,
        topP: 0.95,
        thinkingConfig: { thinkingBudget: -1 },
      },
    });

    return result.text?.trim() || '';
  });

  if (!text) {
    throw new RequestValidationError('provider_empty_response', 502, 'Translation returned empty response.');
  }

  sendJson(response, 200, { text });
};

const buildSuggestionsPrompt = (input: SuggestionsRequest): string => {
  if (input.language === 'zh') {
    return `作为对话专家，请基于以下上下文，预测用户接下来最可能发送的 3 条简短回复。

规则：
1. 如果助手最后在提问，建议必须是针对该问题的回答。
2. 建议应简练（20字以内），涵盖不同角度（如：追问细节、请求示例、或提出质疑）。
3. 语气自然，符合人类对话习惯。

对话上下文：
用户: "${input.userContent}"
助手: "${input.modelContent}"`;
  }

  return `As a conversation expert, predict the 3 most likely short follow-up messages the USER would send based on the context below.

Context:
USER: "${input.userContent}"
ASSISTANT: "${input.modelContent}"`;
};

const handleGenerateSuggestions = async (
  request: IncomingMessage,
  response: ServerResponse,
  geminiProviderClient: GeminiProviderClient
): Promise<void> => {
  const parsed = parseSuggestionsRequest(await readJsonBody(request));
  const prompt = buildSuggestionsPrompt(parsed);

  let suggestions: string[] = [];

  try {
    suggestions = await geminiProviderClient.withClient(async ({ client }) => {
      const result = await client.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingBudget: -1 },
          temperature: 0.8,
          topP: 0.95,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              suggestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING,
                },
              },
            },
          },
        },
      });

      return parseSuggestionsResponse(result.text?.trim() || '');
    });
  } catch {
    suggestions = await geminiProviderClient.withClient(async ({ client }) => {
      const fallbackPrompt = `${prompt}\n\nReturn the three suggestions as a numbered list, one per line. Do not include any other text or formatting.`;
      const result = await client.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: fallbackPrompt,
        config: {
          thinkingConfig: { thinkingBudget: -1 },
          temperature: 0.8,
          topP: 0.95,
        },
      });

      return (result.text || '')
        .trim()
        .split('\n')
        .map((entry) => entry.replace(/^\d+\.\s*/, '').trim())
        .filter((entry) => entry.length > 0)
        .slice(0, 3);
    });
  }

  sendJson(response, 200, { suggestions });
};

const handleGenerateTitle = async (
  request: IncomingMessage,
  response: ServerResponse,
  geminiProviderClient: GeminiProviderClient
): Promise<void> => {
  const parsed = parseTitleRequest(await readJsonBody(request));
  const prompt =
    parsed.language === 'zh'
      ? `根据以下对话，创建一个非常简短、简洁的标题（最多4-6个词）。不要使用引号或任何其他格式。只返回标题的文本。\n\n用户: "${parsed.userContent}"\n助手: "${parsed.modelContent}"\n\n标题:`
      : `Based on this conversation, create a very short, concise title (4-6 words max). Do not use quotes or any other formatting. Just return the text of the title.\n\nUSER: "${parsed.userContent}"\nASSISTANT: "${parsed.modelContent}"\n\nTITLE:`;

  const title = await geminiProviderClient.withClient(async ({ client }) => {
    const result = await client.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: -1 },
        temperature: 0.3,
        topP: 0.9,
      },
    });

    let value = result.text?.trim() || '';
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value;
  });

  if (!title) {
    throw new RequestValidationError('provider_empty_response', 502, 'Title generation returned empty response.');
  }

  sendJson(response, 200, { title });
};

const handleCountTokens = async (
  request: IncomingMessage,
  response: ServerResponse,
  geminiProviderClient: GeminiProviderClient
): Promise<void> => {
  const parsed = parseCountTokensRequest(await readJsonBody(request, 4 * 1024 * 1024));

  const sanitizedParts = parsed.parts.map((part) => {
    const { mediaResolution, videoMetadata, thoughtSignature, thought_signature, ...rest } = part as any;
    return rest as Part;
  });

  const totalTokens = await geminiProviderClient.withClient(async ({ client }) => {
    const result = await client.models.countTokens({
      model: parsed.model,
      contents: [{ role: 'user', parts: sanitizedParts }],
    });
    return result.totalTokens || 0;
  });

  sendJson(response, 200, { totalTokens });
};

const normalizeResponsePart = (part: Part): Part => {
  const anyPart = part as any;
  const thoughtSignature =
    anyPart.thoughtSignature ||
    anyPart.thought_signature ||
    anyPart.functionCall?.thoughtSignature ||
    anyPart.functionCall?.thought_signature;

  if (!thoughtSignature) return part;

  return {
    ...part,
    thoughtSignature,
    thought_signature: thoughtSignature,
  } as any;
};

const handleEditImage = async (
  request: IncomingMessage,
  response: ServerResponse,
  geminiProviderClient: GeminiProviderClient
): Promise<void> => {
  const parsed = parseEditImageRequest(await readJsonBody(request, 8 * 1024 * 1024));

  const config: Record<string, unknown> = {
    responseModalities: ['IMAGE', 'TEXT'],
  };

  const imageConfig: Record<string, unknown> = {};
  if (parsed.aspectRatio && parsed.aspectRatio !== 'Auto') {
    imageConfig.aspectRatio = parsed.aspectRatio;
  }
  if (parsed.model === 'gemini-3-pro-image-preview' && parsed.imageSize) {
    imageConfig.imageSize = parsed.imageSize;
  }
  if (Object.keys(imageConfig).length > 0) {
    config.imageConfig = imageConfig;
  }

  const resultParts = await geminiProviderClient.withClient(async ({ client }) => {
    const providerResponse = await client.models.generateContent({
      model: parsed.model,
      contents: [...parsed.history, { role: 'user', parts: parsed.parts }],
      config,
    });

    const parts: Part[] = [];
    const candidateParts = providerResponse.candidates?.[0]?.content?.parts || [];
    for (const part of candidateParts) {
      const asThought = part as any;
      if (asThought.thought) {
        continue;
      }
      parts.push(normalizeResponsePart(part));
    }

    if (parts.length === 0 && providerResponse.text) {
      parts.push({ text: providerResponse.text });
    }

    return parts;
  });

  sendJson(response, 200, { parts: resultParts });
};

export const handleGenerationRoute = async (
  request: IncomingMessage,
  response: ServerResponse,
  geminiProviderClient: GeminiProviderClient
): Promise<boolean> => {
  const method = request.method || 'GET';
  const path = (request.url || '/').split('?')[0];

  if (!path.startsWith('/api/generation/')) {
    return false;
  }

  if (method !== 'POST') {
    sendJson(response, 405, { error: { code: 'method_not_allowed', message: 'Method Not Allowed', status: 405 } });
    return true;
  }

  try {
    if (path === '/api/generation/images') {
      await handleGenerateImages(request, response, geminiProviderClient);
      return true;
    }
    if (path === '/api/generation/speech') {
      await handleGenerateSpeech(request, response, geminiProviderClient);
      return true;
    }
    if (path === '/api/generation/transcribe') {
      await handleTranscribeAudio(request, response, geminiProviderClient);
      return true;
    }
    if (path === '/api/generation/translate') {
      await handleTranslate(request, response, geminiProviderClient);
      return true;
    }
    if (path === '/api/generation/title') {
      await handleGenerateTitle(request, response, geminiProviderClient);
      return true;
    }
    if (path === '/api/generation/suggestions') {
      await handleGenerateSuggestions(request, response, geminiProviderClient);
      return true;
    }
    if (path === '/api/generation/count-tokens') {
      await handleCountTokens(request, response, geminiProviderClient);
      return true;
    }
    if (path === '/api/generation/edit-image') {
      await handleEditImage(request, response, geminiProviderClient);
      return true;
    }

    sendJson(response, 404, { error: { code: 'not_found', message: 'Not Found', status: 404 } });
    return true;
  } catch (error) {
    const mapped = mapProviderError(error);
    sendJson(response, mapped.status, { error: mapped });
    return true;
  }
};
