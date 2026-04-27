import type { FunctionCall, GenerateContentResponse, Part, UsageMetadata } from '@google/genai';
import { ChatHistoryItem, ThoughtSupportingPart, StreamMessageSender, NonStreamMessageSender } from '../../types';
import { logService } from '../logService';
import { getConfiguredApiClient, getHttpOptionsForContents } from './apiClient';
import { extractGemmaThoughtChannel } from '../../utils/chat/reasoning';

type CandidateWithUrlContext = {
  groundingMetadata?: unknown;
  urlContextMetadata?: unknown;
  url_context_metadata?: unknown;
};

type MetadataWithCitations = {
  citations?: Array<{ uri?: string }>;
} & Record<string, unknown>;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const getThoughtSignature = (part: Part): string | undefined => {
  const partWithSignature = part as Part & {
    thoughtSignature?: unknown;
    thought_signature?: unknown;
  };
  const signature = partWithSignature.thoughtSignature ?? partWithSignature.thought_signature;
  return typeof signature === 'string' && signature.length > 0 ? signature : undefined;
};

const createThoughtSignatureContextPart = (part: Part): Part | undefined => {
  const thoughtSignature = getThoughtSignature(part);
  return thoughtSignature ? ({ text: '', thoughtSignature } as Part) : undefined;
};

const mergeUniqueStrings = (existing: unknown, incoming: unknown): string[] | undefined => {
  const existingValues = Array.isArray(existing)
    ? existing.filter((value): value is string => typeof value === 'string')
    : [];
  const incomingValues = Array.isArray(incoming)
    ? incoming.filter((value): value is string => typeof value === 'string')
    : [];
  if (existingValues.length === 0 && incomingValues.length === 0) {
    return undefined;
  }

  return Array.from(new Set([...existingValues, ...incomingValues]));
};

const mergeUniqueItems = <T>(existing: unknown, incoming: unknown, getKey: (item: T) => string): T[] | undefined => {
  const existingValues = Array.isArray(existing)
    ? existing.filter((value): value is T => value !== null && value !== undefined)
    : [];
  const incomingValues = Array.isArray(incoming)
    ? incoming.filter((value): value is T => value !== null && value !== undefined)
    : [];
  if (existingValues.length === 0 && incomingValues.length === 0) {
    return undefined;
  }

  const merged = new Map<string, T>();
  for (const item of [...existingValues, ...incomingValues]) {
    merged.set(getKey(item), item);
  }

  return Array.from(merged.values());
};

const mergeGroundingMetadata = (
  existing: MetadataWithCitations | null,
  incoming: unknown,
): MetadataWithCitations | null => {
  if (!isRecord(incoming)) {
    return existing;
  }

  const merged: MetadataWithCitations = existing ? { ...existing } : {};

  for (const [key, value] of Object.entries(incoming)) {
    switch (key) {
      case 'webSearchQueries':
      case 'imageSearchQueries': {
        const mergedStrings = mergeUniqueStrings(merged[key], value);
        if (mergedStrings) {
          merged[key] = mergedStrings;
        }
        break;
      }
      case 'groundingChunks':
      case 'groundingSupports': {
        const mergedItems = mergeUniqueItems<Record<string, unknown>>(merged[key], value, (item) =>
          JSON.stringify(item),
        );
        if (mergedItems) {
          merged[key] = mergedItems;
        }
        break;
      }
      case 'citations': {
        const mergedCitations = mergeUniqueItems<Record<string, unknown>>(merged.citations, value, (item) => {
          const uri = typeof item.uri === 'string' ? item.uri : '';
          return uri || JSON.stringify(item);
        }) as Array<{ uri?: string }> | undefined;
        if (mergedCitations) {
          merged.citations = mergedCitations;
        }
        break;
      }
      default: {
        if (isRecord(value) && isRecord(merged[key])) {
          merged[key] = { ...(merged[key] as Record<string, unknown>), ...value };
        } else {
          merged[key] = value;
        }
      }
    }
  }

  return merged;
};

const mergeFunctionCallUrlContextMetadata = (
  finalMetadata: { citations?: Array<{ uri?: string }> },
  functionCalls?: FunctionCall[],
) => {
  if (!functionCalls?.length) return;

  for (const functionCall of functionCalls) {
    const urlContextMetadata = functionCall.args?.urlContextMetadata;
    if (!urlContextMetadata || typeof urlContextMetadata !== 'object') continue;

    const citations = Array.isArray((urlContextMetadata as { citations?: unknown[] }).citations)
      ? ((urlContextMetadata as { citations?: Array<{ uri?: string }> }).citations ?? [])
      : [];

    if (citations.length === 0) continue;

    if (!finalMetadata.citations) {
      finalMetadata.citations = [];
    }

    for (const citation of citations) {
      if (!finalMetadata.citations.some((existing) => existing.uri === citation.uri)) {
        finalMetadata.citations.push(citation);
      }
    }
  }
};

/**
 * Shared helper to parse GenAI responses.
 * Extracts parts, separates thoughts, and merges metadata/citations from tool calls.
 */
const processResponse = (response: GenerateContentResponse) => {
  let thoughtsText = '';
  const responseParts: Part[] = [];

  if (response.candidates && response.candidates[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      const pAsThoughtSupporting = part as ThoughtSupportingPart;
      if (pAsThoughtSupporting.thought) {
        thoughtsText += part.text || '';
        const signaturePart = createThoughtSignatureContextPart(part);
        if (signaturePart) {
          responseParts.push(signaturePart);
        }
      } else if (typeof part.text === 'string') {
        const { content, thoughts } = extractGemmaThoughtChannel(part.text);
        if (thoughts) {
          thoughtsText += thoughts;
        }
        if (content) {
          responseParts.push({ ...part, text: content });
        }
      } else {
        responseParts.push(part);
      }
    }
  }

  if (responseParts.length === 0 && response.text) {
    const { content, thoughts } = extractGemmaThoughtChannel(response.text);
    if (thoughts) {
      thoughtsText += thoughts;
    }
    if (content) {
      responseParts.push({ text: content });
    }
  }

  const candidate = response.candidates?.[0];
  const groundingMetadata = candidate?.groundingMetadata;
  const finalMetadata: MetadataWithCitations =
    groundingMetadata && typeof groundingMetadata === 'object'
      ? { ...(groundingMetadata as Record<string, unknown>) }
      : {};

  const urlContextCandidate = candidate as CandidateWithUrlContext | undefined;
  const urlContextMetadata = urlContextCandidate?.urlContextMetadata || urlContextCandidate?.url_context_metadata;

  mergeFunctionCallUrlContextMetadata(finalMetadata, response.functionCalls);

  return {
    parts: responseParts,
    thoughts: thoughtsText || undefined,
    usage: response.usageMetadata,
    grounding: Object.keys(finalMetadata).length > 0 ? finalMetadata : undefined,
    urlContext: urlContextMetadata,
  };
};

const withAbortSignal = <T extends object>(
  config: T | undefined,
  abortSignal: AbortSignal,
): T & { abortSignal: AbortSignal } => ({
  ...(config || ({} as T)),
  abortSignal,
});

export const generateContentTurnApi = async (
  apiKey: string,
  modelId: string,
  contents: ChatHistoryItem[],
  config: unknown,
  abortSignal: AbortSignal,
) => {
  const abortError = new Error('aborted');
  abortError.name = 'AbortError';

  if (abortSignal.aborted) {
    throw abortError;
  }

  const ai = await getConfiguredApiClient(apiKey, getHttpOptionsForContents(contents));
  const response = await ai.models.generateContent({
    model: modelId,
    contents,
    config: withAbortSignal(config as Parameters<typeof ai.models.generateContent>[0]['config'], abortSignal),
  });

  if (abortSignal.aborted) {
    throw abortError;
  }

  const { parts, thoughts, usage, grounding, urlContext } = processResponse(response);
  const candidateContent = response.candidates?.[0]?.content;

  return {
    modelContent: {
      role: 'model' as const,
      parts: candidateContent?.parts ?? parts,
    },
    parts,
    thoughts,
    usage,
    grounding,
    urlContext,
    functionCalls: response.functionCalls ?? [],
  };
};

export const sendStatelessMessageStreamApi: StreamMessageSender = async (
  apiKey,
  modelId,
  history,
  parts,
  config,
  abortSignal,
  onPart,
  onThoughtChunk,
  onError,
  onComplete,
  role = 'user',
) => {
  logService.info(`Sending message via stateless generateContentStream for ${modelId} (Role: ${role})`);
  let finalUsageMetadata: UsageMetadata | undefined = undefined;
  let finalGroundingMetadata: MetadataWithCitations | null = null;
  let finalUrlContextMetadata: unknown = null;
  const contents = [...history, { role: role, parts }];

  try {
    const ai = await getConfiguredApiClient(apiKey, getHttpOptionsForContents(contents));

    if (abortSignal.aborted) {
      logService.warn('Streaming aborted by signal before start.');
      return;
    }

    const result = await ai.models.generateContentStream({
      model: modelId,
      contents,
      config: withAbortSignal(config as Parameters<typeof ai.models.generateContentStream>[0]['config'], abortSignal),
    });

    for await (const chunkResponse of result) {
      if (abortSignal.aborted) {
        logService.warn('Streaming aborted by signal.');
        break;
      }
      if (chunkResponse.usageMetadata) {
        finalUsageMetadata = chunkResponse.usageMetadata;
      }
      const candidate = chunkResponse.candidates?.[0];

      if (candidate) {
        const metadataFromChunk = candidate.groundingMetadata;
        finalGroundingMetadata = mergeGroundingMetadata(finalGroundingMetadata, metadataFromChunk);

        const urlContextCandidate = candidate as CandidateWithUrlContext;
        const urlMetadata = urlContextCandidate.urlContextMetadata || urlContextCandidate.url_context_metadata;
        if (urlMetadata) {
          finalUrlContextMetadata = urlMetadata;
        }

        if (chunkResponse.functionCalls?.length) {
          if (!finalGroundingMetadata) finalGroundingMetadata = {};
          mergeFunctionCallUrlContextMetadata(finalGroundingMetadata, chunkResponse.functionCalls);
        }

        if (candidate.content?.parts?.length) {
          for (const part of candidate.content.parts) {
            const pAsThoughtSupporting = part as ThoughtSupportingPart;

            if (pAsThoughtSupporting.thought) {
              onThoughtChunk(part.text || '');
              const signaturePart = createThoughtSignatureContextPart(part);
              if (signaturePart) {
                onPart(signaturePart);
              }
            } else if (typeof part.text === 'string') {
              const { content, thoughts } = extractGemmaThoughtChannel(part.text);
              if (thoughts) {
                onThoughtChunk(thoughts);
              }
              if (content) {
                onPart({ ...part, text: content });
              }
            } else {
              onPart(part);
            }
          }
        }
      }
    }
  } catch (error) {
    logService.error('Error sending message (stream):', error);
    onError(error instanceof Error ? error : new Error(String(error) || 'Unknown error during streaming.'));
  } finally {
    logService.info('Streaming complete.', { usage: finalUsageMetadata, hasGrounding: !!finalGroundingMetadata });
    onComplete(finalUsageMetadata, finalGroundingMetadata, finalUrlContextMetadata);
  }
};

export const sendStatelessMessageNonStreamApi: NonStreamMessageSender = async (
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
  logService.info(`Sending message via stateless generateContent (non-stream) for model ${modelId}`);
  const contents = [...history, { role, parts }];

  try {
    const ai = await getConfiguredApiClient(apiKey, getHttpOptionsForContents(contents));

    if (abortSignal.aborted) {
      onComplete([], '', undefined, undefined, undefined);
      return;
    }

    const response = await ai.models.generateContent({
      model: modelId,
      contents,
      config: withAbortSignal(config as Parameters<typeof ai.models.generateContent>[0]['config'], abortSignal),
    });

    if (abortSignal.aborted) {
      onComplete([], '', undefined, undefined, undefined);
      return;
    }

    const { parts: responseParts, thoughts, usage, grounding, urlContext } = processResponse(response);

    logService.info(`Stateless non-stream complete for ${modelId}.`, {
      usage,
      hasGrounding: !!grounding,
      hasUrlContext: !!urlContext,
    });
    onComplete(responseParts, thoughts, usage, grounding, urlContext);
  } catch (error) {
    logService.error(`Error in stateless non-stream for ${modelId}:`, error);
    onError(
      error instanceof Error ? error : new Error(String(error) || 'Unknown error during stateless non-streaming call.'),
    );
  }
};
