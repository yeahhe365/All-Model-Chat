import { GenerateContentResponse, Part, UsageMetadata, Chat, ChatHistoryItem } from "@google/genai";
import { ThoughtSupportingPart } from '../../types';
import { logService } from "../logService";
import { getApiClient } from "./baseApi";
import { dbService } from '../../utils/db';

export const sendMessageStreamApi = async (
    chat: Chat,
    parts: Part[],
    abortSignal: AbortSignal,
    onPart: (part: Part) => void,
    onThoughtChunk: (chunk: string) => void,
    onError: (error: Error) => void,
    onComplete: (usageMetadata?: UsageMetadata, groundingMetadata?: any) => void
): Promise<void> => {
    logService.info(`Sending message via chat object (stream)`);
    let finalUsageMetadata: UsageMetadata | undefined = undefined;
    let finalGroundingMetadata: any = null;

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
            const metadataFromChunk = chunkResponse.candidates?.[0]?.groundingMetadata;
            if (metadataFromChunk) {
                finalGroundingMetadata = metadataFromChunk;
            }
            
            const toolCalls = chunkResponse.candidates?.[0]?.toolCalls;
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
            if (chunkResponse.candidates && chunkResponse.candidates[0]?.content?.parts?.length > 0) {
                for (const part of chunkResponse.candidates[0].content.parts) {
                    const pAsThoughtSupporting = part as ThoughtSupportingPart;

                    if (pAsThoughtSupporting.thought) {
                        onThoughtChunk(part.text);
                    } else {
                        onPart(part);
                    }
                }
            }
        }
    } catch (error) {
        logService.error("Error sending message to Gemini chat (stream):", error);
        onError(error instanceof Error ? error : new Error(String(error) || "Unknown error during streaming."));
    } finally {
        logService.info("Streaming complete via chat object.", { usage: finalUsageMetadata, hasGrounding: !!finalGroundingMetadata });
        onComplete(finalUsageMetadata, finalGroundingMetadata);
    }
};

export const sendMessageNonStreamApi = async (
    chat: Chat,
    parts: Part[],
    abortSignal: AbortSignal,
    onError: (error: Error) => void,
    onComplete: (parts: Part[], thoughtsText?: string, usageMetadata?: UsageMetadata, groundingMetadata?: any) => void
): Promise<void> => {
    logService.info(`Sending message via chat object (non-stream)`);
    
    try {
        if (abortSignal.aborted) {
            logService.warn("Non-streaming call prevented by abort signal before starting.");
            onComplete([], "", undefined, undefined);
            return;
        }
        const response: GenerateContentResponse = await chat.sendMessage({ message: parts });
        if (abortSignal.aborted) {
            logService.warn("Non-streaming call completed, but aborted by signal before processing response.");
            onComplete([], "", undefined, undefined);
            return;
        }
        
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
        
        const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
        let finalMetadata: any = groundingMetadata ? { ...groundingMetadata } : {};
    
        const toolCalls = response.candidates?.[0]?.toolCalls;
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

        logService.info("Non-stream chat call complete.", { usage: response.usageMetadata, hasGrounding: !!finalMetadata });
        onComplete(responseParts, thoughtsText || undefined, response.usageMetadata, Object.keys(finalMetadata).length > 0 ? finalMetadata : undefined);
    } catch (error) {
        logService.error("Error sending message to Gemini chat (non-stream):", error);
        onError(error instanceof Error ? error : new Error(String(error) || "Unknown error during non-streaming call."));
    }
};

// Stateless API calls for models that don't support the Chat object (like image-edit)
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
    onComplete: (usageMetadata?: UsageMetadata, groundingMetadata?: any) => void
): Promise<void> => {
    logService.info(`Sending message via stateless generateContent (stream) for model ${modelId}`);
    let finalUsageMetadata: UsageMetadata | undefined = undefined;
    let finalGroundingMetadata: any = null;
    const storedSettings = await dbService.getAppSettings();
    const apiProxyUrl = storedSettings ? storedSettings.apiProxyUrl : null;
    const ai = getApiClient(apiKey, apiProxyUrl);

    try {
        const result = await ai.models.generateContentStream({
            model: modelId,
            contents: [...history, { role: 'user', parts }],
            config: config
        });

        for await (const chunkResponse of result) {
            if (abortSignal.aborted) { logService.warn("Streaming aborted by signal."); break; }
            if (chunkResponse.usageMetadata) finalUsageMetadata = chunkResponse.usageMetadata;
            if (chunkResponse.candidates?.[0]?.groundingMetadata) finalGroundingMetadata = chunkResponse.candidates[0].groundingMetadata;

            if (chunkResponse.candidates && chunkResponse.candidates[0]?.content?.parts?.length > 0) {
                for (const part of chunkResponse.candidates[0].content.parts) {
                    const pAsThoughtSupporting = part as ThoughtSupportingPart;
                    if (pAsThoughtSupporting.thought) onThoughtChunk(part.text);
                    else onPart(part);
                }
            }
        }
    } catch (error) {
        logService.error(`Error in stateless stream for ${modelId}:`, error);
        onError(error instanceof Error ? error : new Error(String(error) || "Unknown error during stateless streaming."));
    } finally {
        logService.info(`Stateless stream complete for ${modelId}.`, { usage: finalUsageMetadata, hasGrounding: !!finalGroundingMetadata });
        onComplete(finalUsageMetadata, finalGroundingMetadata);
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
    onComplete: (parts: Part[], thoughtsText?: string, usageMetadata?: UsageMetadata, groundingMetadata?: any) => void
): Promise<void> => {
    logService.info(`Sending message via stateless generateContent (non-stream) for model ${modelId}`);
    const storedSettings = await dbService.getAppSettings();
    const apiProxyUrl = storedSettings ? storedSettings.apiProxyUrl : null;
    const ai = getApiClient(apiKey, apiProxyUrl);

    try {
        if (abortSignal.aborted) { onComplete([], "", undefined, undefined); return; }

        const response = await ai.models.generateContent({
            model: modelId,
            contents: [...history, { role: 'user', parts }],
            config: config
        });

        if (abortSignal.aborted) { onComplete([], "", undefined, undefined); return; }

        let thoughtsText = "";
        const responseParts: Part[] = [];
        if (response.candidates && response.candidates[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                const pAsThoughtSupporting = part as ThoughtSupportingPart;
                if (pAsThoughtSupporting.thought) thoughtsText += part.text;
                else responseParts.push(part);
            }
        }
        if (responseParts.length === 0 && response.text) responseParts.push({ text: response.text });
        
        const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
        logService.info(`Stateless non-stream complete for ${modelId}.`, { usage: response.usageMetadata, hasGrounding: !!groundingMetadata });
        onComplete(responseParts, thoughtsText || undefined, response.usageMetadata, groundingMetadata);
    } catch (error) {
        logService.error(`Error in stateless non-stream for ${modelId}:`, error);
        onError(error instanceof Error ? error : new Error(String(error) || "Unknown error during stateless non-streaming call."));
    }
};