
import { GenerateContentResponse, Part, UsageMetadata, Chat, ChatHistoryItem } from "@google/genai";
import { ThoughtSupportingPart } from '../../types';
import { logService } from "../logService";
import { getApiClient } from "./baseApi";

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

export const sendMessageStreamApi = async (
    chat: Chat,
    parts: Part[],
    abortSignal: AbortSignal,
    onPart: (part: Part) => void,
    onThoughtChunk: (chunk: string) => void,
    onError: (error: Error) => void,
    onComplete: (usageMetadata?: UsageMetadata, groundingMetadata?: any, urlContextMetadata?: any) => void
): Promise<void> => {
    logService.info(`Sending message via chat object (stream)`);
    let finalUsageMetadata: UsageMetadata | undefined = undefined;
    let finalGroundingMetadata: any = null;
    let finalUrlContextMetadata: any = null;

    try {
        const result = await chat.sendMessageStream({ message: parts });

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
                
                // Check for URL context metadata (handling potential SDK property names)
                // @ts-ignore - SDK might not have strict types for this yet
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
                
                // ALWAYS iterate through parts. The .text property is a shortcut and can be misleading for multimodal responses.
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
        logService.error("Error sending message to Gemini chat (stream):", error);
        onError(error instanceof Error ? error : new Error(String(error) || "Unknown error during streaming."));
    } finally {
        logService.info("Streaming complete via chat object.", { usage: finalUsageMetadata, hasGrounding: !!finalGroundingMetadata, hasUrlContext: !!finalUrlContextMetadata });
        onComplete(finalUsageMetadata, finalGroundingMetadata, finalUrlContextMetadata);
    }
};

export const sendMessageNonStreamApi = async (
    chat: Chat,
    parts: Part[],
    abortSignal: AbortSignal,
    onError: (error: Error) => void,
    onComplete: (parts: Part[], thoughtsText?: string, usageMetadata?: UsageMetadata, groundingMetadata?: any, urlContextMetadata?: any) => void
): Promise<void> => {
    logService.info(`Sending message via chat object (non-stream)`);
    
    try {
        if (abortSignal.aborted) {
            logService.warn("Non-streaming call prevented by abort signal before starting.");
            onComplete([], "", undefined, undefined, undefined);
            return;
        }
        const response: GenerateContentResponse = await chat.sendMessage({ message: parts });
        if (abortSignal.aborted) {
            logService.warn("Non-streaming call completed, but aborted by signal before processing response.");
            onComplete([], "", undefined, undefined, undefined);
            return;
        }
        
        const { parts: responseParts, thoughts, usage, grounding, urlContext } = processResponse(response);

        logService.info("Non-stream chat call complete.", { usage, hasGrounding: !!grounding, hasUrlContext: !!urlContext });
        onComplete(responseParts, thoughts, usage, grounding, urlContext);
    } catch (error) {
        logService.error("Error sending message to Gemini chat (non-stream):", error);
        onError(error instanceof Error ? error : new Error(String(error) || "Unknown error during non-streaming call."));
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
    onComplete: (parts: Part[], thoughtsText?: string, usageMetadata?: UsageMetadata, groundingMetadata?: any, urlContextMetadata?: any) => void,
    baseUrl?: string | null
): Promise<void> => {
    logService.info(`Sending message via stateless generateContent (non-stream) for model ${modelId}`);
    
    try {
        const ai = getApiClient(apiKey, baseUrl);

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
