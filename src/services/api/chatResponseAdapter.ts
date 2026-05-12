import type { FunctionCall, GenerateContentResponse, Part, UsageMetadata } from '@google/genai';
import type { ThoughtSupportingPart } from '@/types';
import { extractGemmaThoughtChannel } from '@/utils/chat/reasoning';
import {
  mergeGroundingMetadata as mergeSharedGroundingMetadata,
  type MetadataWithCitations,
} from '@/features/chat-streaming/messageStreamReducer';

export type { MetadataWithCitations };

type CandidateWithUrlContext = {
  groundingMetadata?: unknown;
  urlContextMetadata?: unknown;
  url_context_metadata?: unknown;
};

interface AdaptedGenAiResponse {
  parts: Part[];
  thoughts?: string;
  usage?: UsageMetadata;
  grounding?: MetadataWithCitations;
  urlContext?: unknown;
}

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

export const mergeGroundingMetadata = (
  existing: MetadataWithCitations | null,
  incoming: unknown,
): MetadataWithCitations | null => mergeSharedGroundingMetadata(existing ?? undefined, incoming) ?? existing;

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

const adaptPart = (part: Part): { parts: Part[]; thoughts?: string } => {
  const pAsThoughtSupporting = part as ThoughtSupportingPart;
  if (pAsThoughtSupporting.thought) {
    const signaturePart = createThoughtSignatureContextPart(part);
    return {
      parts: signaturePart ? [signaturePart] : [],
      thoughts: part.text || undefined,
    };
  }

  if (typeof part.text === 'string') {
    const { content, thoughts } = extractGemmaThoughtChannel(part.text);
    return {
      parts: content ? [{ ...part, text: content }] : [],
      thoughts: thoughts || undefined,
    };
  }

  return { parts: [part] };
};

export const adaptGenAiResponse = (response: GenerateContentResponse): AdaptedGenAiResponse => {
  let thoughtsText = '';
  const responseParts: Part[] = [];

  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      const adaptedPart = adaptPart(part);
      responseParts.push(...adaptedPart.parts);
      if (adaptedPart.thoughts) {
        thoughtsText += adaptedPart.thoughts;
      }
    }
  }

  if (responseParts.length === 0 && response.text) {
    const adaptedPart = adaptPart({ text: response.text });
    responseParts.push(...adaptedPart.parts);
    if (adaptedPart.thoughts) {
      thoughtsText += adaptedPart.thoughts;
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
