import { Content, GenerateContentResponse, Part, UsageMetadata } from "@google/genai";
import { getApiClient, buildGenerationConfig } from './baseApi';
import { ChatHistoryItem, ThoughtSupportingPart } from '../../types';
import { logService } from "../logService";

export const sendMessageStreamApi = async (
    apiKey: string,
    modelId: string,
    historyWithLastPrompt: ChatHistoryItem[],
    systemInstruction: string,
    config: { temperature?: number; topP?: number },
    showThoughts: boolean,
    thinkingBudget: number,
    isGoogleSearchEnabled: boolean,
    isCodeExecutionEnabled: boolean,
    isUrlContextEnabled: boolean,
    abortSignal: AbortSignal,
    onPart: (part: Part) => void,
    onThoughtChunk: (chunk: string) => void,
    onError: (error: Error) => void,
    onComplete: (usageMetadata?: UsageMetadata, groundingMetadata?: any) => void
): Promise<void> => {
    // If a service worker is available and controlling the page, delegate the stream to it.
    // This prevents the browser from throttling the connection when the tab is in the background.
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        logService.info(`Sending message to ${modelId} via Service Worker (stream)`);

        return new Promise((resolve, reject) => {
            const generationId = `gen-${Date.now()}-${Math.random()}`;
            const generationConfig = buildGenerationConfig(modelId, systemInstruction, config, showThoughts, thinkingBudget, isGoogleSearchEnabled, isCodeExecutionEnabled, isUrlContextEnabled);
            let finalUsageMetadata: UsageMetadata | undefined = undefined;
            let finalGroundingMetadata: any = null;

            const cleanup = () => {
                navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
            };

            const handleServiceWorkerMessage = (event: MessageEvent) => {
                if (event.data.generationId !== generationId) return;

                const { type, payload } = event.data;

                switch (type) {
                    case 'GEMINI_STREAM_CHUNK': {
                        const chunkResponse = payload as GenerateContentResponse;
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
                        if (chunkResponse.candidates && chunkResponse.candidates[0]?.content?.parts?.length > 0) {
                            for (const part of chunkResponse.candidates[0].content.parts) {
                                const pAsThoughtSupporting = part as ThoughtSupportingPart;
                                if (pAsThoughtSupporting.thought) onThoughtChunk(part.text);
                                else onPart(part);
                            }
                        } else if (typeof chunkResponse.text === 'string' && chunkResponse.text.length > 0) {
                            onPart({ text: chunkResponse.text });
                        }
                        break;
                    }
                    case 'GEMINI_STREAM_COMPLETE':
                        onComplete(finalUsageMetadata, finalGroundingMetadata);
                        cleanup();
                        resolve();
                        break;
                    case 'GEMINI_STREAM_ERROR': {
                        const error = new Error(payload.message || 'Unknown Service Worker stream error.');
                        error.name = payload.name || 'SWStreamError';
                        onError(error);
                        cleanup();
                        reject(error);
                        break;
                    }
                }
            };

            navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
            abortSignal.onabort = () => {
                navigator.serviceWorker.controller?.postMessage({ type: 'GEMINI_STREAM_ABORT', generationId });
                cleanup();
                const abortError = new Error("Streaming aborted by signal.");
                abortError.name = "AbortError";
                onError(abortError);
                reject(abortError);
            };
            
            navigator.serviceWorker.controller.postMessage({
                type: 'GEMINI_STREAM_REQUEST',
                generationId,
                payload: { apiKey, modelId, contents: historyWithLastPrompt, config: generationConfig }
            });
        });
    }

    // Fallback for browsers without Service Worker or when it's not yet active.
    logService.warn(`Sending message to ${modelId} via direct fetch (stream) - SW not available.`);
    const ai = getApiClient(apiKey);
    const generationConfig = buildGenerationConfig(modelId, systemInstruction, config, showThoughts, thinkingBudget, isGoogleSearchEnabled, isCodeExecutionEnabled, isUrlContextEnabled);
    let finalUsageMetadata: UsageMetadata | undefined = undefined;
    let finalGroundingMetadata: any = null;

    try {
        const result = await ai.models.generateContentStream({ 
            model: modelId,
            contents: historyWithLastPrompt as Content[],
            config: generationConfig
        });

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

            if (chunkResponse.candidates && chunkResponse.candidates[0]?.content?.parts?.length > 0) {
                for (const part of chunkResponse.candidates[0].content.parts) {
                    const pAsThoughtSupporting = part as ThoughtSupportingPart;

                    if (pAsThoughtSupporting.thought) {
                        onThoughtChunk(part.text);
                    } else {
                        onPart(part);
                    }
                }
            } else if (typeof chunkResponse.text === 'string' && chunkResponse.text.length > 0) {
               onPart({ text: chunkResponse.text });
            }
        }
    } catch (error) {
        logService.error("Error sending message to Gemini (stream):", error);
        onError(error instanceof Error ? error : new Error(String(error) || "Unknown error during streaming."));
    } finally {
        logService.info("Streaming complete.", { usage: finalUsageMetadata, hasGrounding: !!finalGroundingMetadata });
        onComplete(finalUsageMetadata, finalGroundingMetadata);
    }
};

export const sendMessageNonStreamApi = async (
    apiKey: string,
    modelId: string,
    historyWithLastPrompt: ChatHistoryItem[],
    systemInstruction: string,
    config: { temperature?: number; topP?: number },
    showThoughts: boolean,
    thinkingBudget: number,
    isGoogleSearchEnabled: boolean,
    isCodeExecutionEnabled: boolean,
    isUrlContextEnabled: boolean,
    abortSignal: AbortSignal,
    onError: (error: Error) => void,
    onComplete: (parts: Part[], thoughtsText?: string, usageMetadata?: UsageMetadata, groundingMetadata?: any) => void
): Promise<void> => {
    logService.info(`Sending message to ${modelId} (non-stream)`, { hasSystemInstruction: !!systemInstruction, config, showThoughts, thinkingBudget, isGoogleSearchEnabled, isCodeExecutionEnabled, isUrlContextEnabled });
    const ai = getApiClient(apiKey);
    const generationConfig = buildGenerationConfig(modelId, systemInstruction, config, showThoughts, thinkingBudget, isGoogleSearchEnabled, isCodeExecutionEnabled, isUrlContextEnabled);
    
    try {
        if (abortSignal.aborted) {
            logService.warn("Non-streaming call prevented by abort signal before starting.");
            onComplete([], "", undefined, undefined);
            return;
        }
        const response: GenerateContentResponse = await ai.models.generateContent({ 
            model: modelId,
            contents: historyWithLastPrompt as Content[],
            config: generationConfig
        });
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

        logService.info("Non-stream call complete.", { usage: response.usageMetadata, hasGrounding: !!finalMetadata });
        onComplete(responseParts, thoughtsText || undefined, response.usageMetadata, Object.keys(finalMetadata).length > 0 ? finalMetadata : undefined);
    } catch (error) {
        logService.error("Error sending message to Gemini (non-stream):", error);
        onError(error instanceof Error ? error : new Error(String(error) || "Unknown error during non-streaming call."));
    }
};
