
import { GenerateContentResponse, Part, UsageMetadata, ChatHistoryItem } from "@google/genai";
import { ThoughtSupportingPart } from '../../types';
import { logService } from "../logService";
import { getConfiguredApiClient } from "./baseApi";

const normalizeThoughtSignaturePart = (part: Part): Part => {
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
        // Preserve snake_case to maximize compatibility with Vertex API serialization
        thought_signature: thoughtSignature,
    } as any;
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
    const finalMetadata: any = groundingMetadata ? { ...groundingMetadata } : {};

    // @ts-ignore - Handle potential snake_case from raw API responses
    const urlContextMetadata = candidate?.urlContextMetadata || candidate?.url_context_metadata;

    const toolCalls = candidate?.toolCalls;
    if (toolCalls) {
        for (const toolCall of toolCalls) {
            if (toolCall.functionCall?.args?.urlContextMetadata) {
                if (!finalMetadata.citations) finalMetadata.citations = [];
                const newCitations = toolCall.functionCall.args.urlContextMetadata.citations || [];
                for (const newCitation of newCitations) {
                    if (!finalMetadata.citations.some((c: any) => c.uri === newCitation.uri)) {
                        finalMetadata.citations.push(newCitation);
                    }
                }
            }
        }
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
    onComplete: (usageMetadata?: UsageMetadata, groundingMetadata?: any, urlContextMetadata?: any, functionCallPart?: Part) => void,
    role: 'user' | 'model' = 'user'
): Promise<void> => {
    logService.info(`Sending message via stateless generateContentStream for ${modelId} (Role: ${role})`);
    let finalUsageMetadata: UsageMetadata | undefined = undefined;
    let finalGroundingMetadata: any = null;
    let finalUrlContextMetadata: any = null;
    let detectedFunctionCallPart: Part | undefined = undefined;

    try {
        const ai = await getConfiguredApiClient(apiKey);

        if (abortSignal.aborted) {
            logService.warn("Streaming aborted by signal before start.");
            return;
        }

        // Only append parts if non-empty; otherwise use history directly
        // This handles function call continuation where all context is already in history
        const contents = parts.length > 0
            ? [...history, { role: role, parts }]
            : history;

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
                    finalGroundingMetadata = metadataFromChunk;
                }

                // @ts-ignore
                const urlMetadata = candidate.urlContextMetadata || candidate.url_context_metadata;
                if (urlMetadata) {
                    finalUrlContextMetadata = urlMetadata;
                }

                const toolCalls = candidate.toolCalls;
                if (toolCalls) {
                    for (const toolCall of toolCalls) {
                        if (toolCall.functionCall?.args?.urlContextMetadata) {
                            if (!finalGroundingMetadata) finalGroundingMetadata = {};
                            if (!finalGroundingMetadata.citations) finalGroundingMetadata.citations = [];
                            const newCitations = toolCall.functionCall.args.urlContextMetadata.citations || [];
                            for (const newCitation of newCitations) {
                                if (!finalGroundingMetadata.citations.some((c: any) => c.uri === newCitation.uri)) {
                                    finalGroundingMetadata.citations.push(newCitation);
                                }
                            }
                        }
                    }
                }

                if (candidate.content?.parts?.length) {
                    for (const part of candidate.content.parts) {
                        const pAsThoughtSupporting = part as ThoughtSupportingPart;
                        const anyPart = part as any;

                        // Check for function call (agentic tool execution)
                        // IMPORTANT: Preserve the ENTIRE Part including thoughtSignature
                        if (anyPart.functionCall) {
                            detectedFunctionCallPart = normalizeThoughtSignaturePart(part); // Ensure thoughtSignature is preserved
                            logService.info(`Function call detected: ${anyPart.functionCall.name}`, {
                                args: anyPart.functionCall.args,
                                hasThoughtSignature: !!(anyPart.thoughtSignature || anyPart.thought_signature)
                            });
                        } else if (pAsThoughtSupporting.thought) {
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
        logService.info("Streaming complete.", { usage: finalUsageMetadata, hasGrounding: !!finalGroundingMetadata, hasFunctionCall: !!detectedFunctionCallPart });
        onComplete(finalUsageMetadata, finalGroundingMetadata, finalUrlContextMetadata, detectedFunctionCallPart);
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

        const { parts: responseParts, thoughts, usage, grounding, urlContext } = processResponse(response);

        logService.info(`Stateless non-stream complete for ${modelId}.`, { usage, hasGrounding: !!grounding, hasUrlContext: !!urlContext });
        onComplete(responseParts, thoughts, usage, grounding, urlContext);
    } catch (error) {
        logService.error(`Error in stateless non-stream for ${modelId}:`, error);
        onError(error instanceof Error ? error : new Error(String(error) || "Unknown error during stateless non-streaming call."));
    }
};
