import { GenerateContentResponse, Part, UsageMetadata } from "@google/genai";
import { ChatHistoryItem, ThoughtSupportingPart } from '../../types';
import { logService } from "../logService";
import { getConfiguredApiClient } from "./baseApi";

/**
 * Shared helper to parse GenAI responses.
 * Extracts parts, separates thoughts, and merges metadata/citations from tool calls.
 */
const mergeUniqueCitations = (target: any, citations: any[] = []) => {
    if (citations.length === 0) {
        return target;
    }

    if (!target.citations) {
        target.citations = [];
    }

    for (const citation of citations) {
        if (!target.citations.some((existing: any) => existing.uri === citation.uri)) {
            target.citations.push(citation);
        }
    }

    return target;
};

const getToolCallCitations = (part: Part): any[] => {
    const args = part.toolCall?.args as
        | { urlContextMetadata?: { citations?: any[] } }
        | undefined;

    return args?.urlContextMetadata?.citations ?? [];
};

export const processGenerateContentResponse = (response: GenerateContentResponse) => {
    let thoughtsText = "";
    const responseParts: Part[] = [];
    const contentParts = response.candidates?.[0]?.content?.parts ?? [];

    for (const part of contentParts) {
        const pAsThoughtSupporting = part as ThoughtSupportingPart;
        if (pAsThoughtSupporting.thought) {
            thoughtsText += part.text;
            continue;
        }

        if (part.toolCall || part.toolResponse) {
            continue;
        }

        responseParts.push(part);
    }

    if (responseParts.length === 0 && response.text) {
        responseParts.push({ text: response.text });
    }
    
    const candidate = response.candidates?.[0];
    const groundingMetadata = candidate?.groundingMetadata;
    const finalMetadata: any = groundingMetadata ? { ...groundingMetadata } : {};
    
    // @ts-ignore - Handle potential snake_case from raw API responses
    const urlContextMetadata = candidate?.urlContextMetadata || candidate?.url_context_metadata;

    for (const part of contentParts) {
        mergeUniqueCitations(finalMetadata, getToolCallCitations(part));
    }

    return {
        parts: responseParts,
        thoughts: thoughtsText || undefined,
        usage: response.usageMetadata,
        grounding: Object.keys(finalMetadata).length > 0 ? finalMetadata : undefined,
        urlContext: urlContextMetadata
    };
};

export const sendStatelessMessageStreamApi = async (
    apiKey: string,
    modelId: string,
    history: ChatHistoryItem[],
    parts: Part[],
    config: any,
    abortSignal: AbortSignal,
    onPart: (part: Part) => void,
    onThoughtChunk: (chunk: string) => void,
    onError: (error: Error) => void,
    onComplete: (usageMetadata?: UsageMetadata, groundingMetadata?: any, urlContextMetadata?: any) => void,
    role: 'user' | 'model' = 'user'
): Promise<void> => {
    logService.info(`Sending message via stateless generateContentStream for ${modelId} (Role: ${role})`);
    let finalUsageMetadata: UsageMetadata | undefined = undefined;
    let finalGroundingMetadata: any = null;
    let finalUrlContextMetadata: any = null;

    try {
        const ai = await getConfiguredApiClient(apiKey);
        
        if (abortSignal.aborted) {
            logService.warn("Streaming aborted by signal before start.");
            return;
        }

        const result = await ai.models.generateContentStream({
            model: modelId,
            contents: [...history, { role: role, parts }],
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
                    finalGroundingMetadata = metadataFromChunk;
                }
                
                // @ts-ignore
                const urlMetadata = candidate.urlContextMetadata || candidate.url_context_metadata;
                if (urlMetadata) {
                    finalUrlContextMetadata = urlMetadata;
                }

                if (candidate.content?.parts?.length) {
                    for (const part of candidate.content.parts) {
                        const pAsThoughtSupporting = part as ThoughtSupportingPart;
                        const toolCallCitations = getToolCallCitations(part);

                        if (toolCallCitations.length > 0) {
                            if (!finalGroundingMetadata) {
                                finalGroundingMetadata = {};
                            }
                            mergeUniqueCitations(finalGroundingMetadata, toolCallCitations);
                        }

                        if (part.toolCall || part.toolResponse) {
                            continue;
                        }

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

export const sendStatelessMessageNonStreamApi = async (
    apiKey: string,
    modelId: string,
    history: ChatHistoryItem[],
    parts: Part[],
    config: any,
    abortSignal: AbortSignal,
    onError: (error: Error) => void,
    onComplete: (parts: Part[], thoughtsText?: string, usageMetadata?: UsageMetadata, groundingMetadata?: any, urlContextMetadata?: any) => void
): Promise<void> => {
    logService.info(`Sending message via stateless generateContent (non-stream) for model ${modelId}`);
    
    try {
        const ai = await getConfiguredApiClient(apiKey);

        if (abortSignal.aborted) { onComplete([], "", undefined, undefined, undefined); return; }

        const response = await ai.models.generateContent({
            model: modelId,
            contents: [...history, { role: 'user', parts }],
            config: config
        });

        if (abortSignal.aborted) { onComplete([], "", undefined, undefined, undefined); return; }

        const { parts: responseParts, thoughts, usage, grounding, urlContext } = processGenerateContentResponse(response);

        logService.info(`Stateless non-stream complete for ${modelId}.`, { usage, hasGrounding: !!grounding, hasUrlContext: !!urlContext });
        onComplete(responseParts, thoughts, usage, grounding, urlContext);
    } catch (error) {
        logService.error(`Error in stateless non-stream for ${modelId}:`, error);
        onError(error instanceof Error ? error : new Error(String(error) || "Unknown error during stateless non-streaming call."));
    }
};
