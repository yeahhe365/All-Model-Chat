
import type { FunctionCall, GenerateContentResponse, Part, UsageMetadata } from "@google/genai";
import {
    ThoughtSupportingPart,
    StreamMessageSender,
    NonStreamMessageSender,
} from '../../types';
import { logService } from "../logService";
import { getConfiguredApiClient, getHttpOptionsForContents } from "./baseApi";

type CandidateWithUrlContext = {
    groundingMetadata?: unknown;
    urlContextMetadata?: unknown;
    url_context_metadata?: unknown;
};

type MetadataWithCitations = {
    citations?: Array<{ uri?: string }>;
} & Record<string, unknown>;

const mergeFunctionCallUrlContextMetadata = (
    finalMetadata: { citations?: Array<{ uri?: string }> },
    functionCalls?: FunctionCall[]
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
            if (!finalMetadata.citations.some(existing => existing.uri === citation.uri)) {
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
    let thoughtsText = "";
    const responseParts: Part[] = [];

    if (response.candidates && response.candidates[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
            const pAsThoughtSupporting = part as ThoughtSupportingPart;
            if (pAsThoughtSupporting.thought) {
                thoughtsText += part.text;
            } else {
                responseParts.push(part);
            }
        }
    }

    if (responseParts.length === 0 && response.text) {
        responseParts.push({ text: response.text });
    }
    
    const candidate = response.candidates?.[0];
    const groundingMetadata = candidate?.groundingMetadata;
    const finalMetadata: MetadataWithCitations = groundingMetadata && typeof groundingMetadata === 'object'
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
        urlContext: urlContextMetadata
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
    role = 'user'
) => {
    logService.info(`Sending message via stateless generateContentStream for ${modelId} (Role: ${role})`);
    let finalUsageMetadata: UsageMetadata | undefined = undefined;
    let finalGroundingMetadata: MetadataWithCitations | null = null;
    let finalUrlContextMetadata: unknown = null;
    const contents = [...history, { role: role, parts }];

    try {
        const ai = await getConfiguredApiClient(apiKey, getHttpOptionsForContents(contents));
        
        if (abortSignal.aborted) {
            logService.warn("Streaming aborted by signal before start.");
            return;
        }

        const result = await ai.models.generateContentStream({
            model: modelId,
            contents,
            config: config
        });

        for await (const chunkResponse of result) {
            if (abortSignal.aborted) {
                logService.warn("Streaming aborted by signal.");
                break;
            }
            if (chunkResponse.usageMetadata) {
                finalUsageMetadata = chunkResponse.usageMetadata;
            }
            const candidate = chunkResponse.candidates?.[0];
            
            if (candidate) {
                const metadataFromChunk = candidate.groundingMetadata;
                if (metadataFromChunk) {
                    finalGroundingMetadata = { ...(metadataFromChunk as object) } as MetadataWithCitations;
                }
                
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
                        } else {
                            onPart(part);
                        }
                    }
                }
            }
        }
    } catch (error) {
        logService.error("Error sending message (stream):", error);
        onError(error instanceof Error ? error : new Error(String(error) || "Unknown error during streaming."));
    } finally {
        logService.info("Streaming complete.", { usage: finalUsageMetadata, hasGrounding: !!finalGroundingMetadata });
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
    onComplete
) => {
    logService.info(`Sending message via stateless generateContent (non-stream) for model ${modelId}`);
    const contents = [...history, { role: 'user', parts }];
    
    try {
        const ai = await getConfiguredApiClient(apiKey, getHttpOptionsForContents(contents));

        if (abortSignal.aborted) { onComplete([], "", undefined, undefined, undefined); return; }

        const response = await ai.models.generateContent({
            model: modelId,
            contents,
            config: config
        });

        if (abortSignal.aborted) { onComplete([], "", undefined, undefined, undefined); return; }

        const { parts: responseParts, thoughts, usage, grounding, urlContext } = processResponse(response);

        logService.info(`Stateless non-stream complete for ${modelId}.`, { usage, hasGrounding: !!grounding, hasUrlContext: !!urlContext });
        onComplete(responseParts, thoughts, usage, grounding, urlContext);
    } catch (error) {
        logService.error(`Error in stateless non-stream for ${modelId}:`, error);
        onError(error instanceof Error ? error : new Error(String(error) || "Unknown error during stateless non-streaming call."));
    }
};
