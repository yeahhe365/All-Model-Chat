
import { GenerateContentResponse, Part, UsageMetadata, ChatHistoryItem } from "@google/genai";
import type {
    BffErrorPayload as BffStreamErrorPayload,
    ChatStreamMetaEventPayload,
    ChatStreamRequestPayload,
} from '@all-model-chat/shared-api';
import { ThoughtSupportingPart } from '../../types';
import { logService } from "../logService";
import { getConfiguredApiClient } from "./baseApi";
import { parseBffErrorResponse, resolveBffEndpoint } from './bffApi';
import { BACKEND_MANAGED_KEY_SENTINEL } from '../../utils/apiUtils';

interface ParsedSseEvent {
    eventName: string;
    payload: unknown;
}

const resolveBffStreamEndpoint = (): string => resolveBffEndpoint('/api/chat/stream');

const parseSseEventBlock = (rawBlock: string): ParsedSseEvent | null => {
    const normalized = rawBlock.replace(/\r\n/g, '\n').trim();
    if (!normalized) return null;

    let eventName = 'message';
    const dataLines: string[] = [];

    for (const line of normalized.split('\n')) {
        if (line.startsWith('event:')) {
            eventName = line.slice(6).trim();
            continue;
        }

        if (line.startsWith('data:')) {
            dataLines.push(line.slice(5).trimStart());
        }
    }

    if (dataLines.length === 0) return null;

    const rawPayload = dataLines.join('\n');
    try {
        return {
            eventName,
            payload: JSON.parse(rawPayload),
        };
    } catch {
        return {
            eventName,
            payload: rawPayload,
        };
    }
};

const consumeSseStream = async (
    response: Response,
    abortSignal: AbortSignal,
    onEvent: (event: ParsedSseEvent) => void
): Promise<void> => {
    if (!response.body) {
        throw new Error('BFF stream response body is empty.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (abortSignal.aborted) break;

        buffer += decoder.decode(value, { stream: true });

        while (true) {
            const separatorIndex = buffer.indexOf('\n\n');
            if (separatorIndex < 0) break;

            const rawBlock = buffer.slice(0, separatorIndex);
            buffer = buffer.slice(separatorIndex + 2);

            const parsed = parseSseEventBlock(rawBlock);
            if (parsed) {
                onEvent(parsed);
            }
        }
    }

    if (buffer.trim().length > 0) {
        const parsed = parseSseEventBlock(buffer);
        if (parsed) {
            onEvent(parsed);
        }
    }
};

const createBffStreamError = (payload: BffStreamErrorPayload | null | undefined): Error => {
    const message = payload?.message || 'BFF stream proxy returned an error.';
    const error = new Error(message);
    (error as any).code = payload?.code || 'bff_stream_error';
    (error as any).status = payload?.status;
    (error as any).retryable = payload?.retryable;
    return error;
};

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
    logService.info(`Sending message via BFF /api/chat/stream for ${modelId} (Role: ${role})`);
    let finalUsageMetadata: UsageMetadata | undefined = undefined;
    let finalGroundingMetadata: any = null;
    let finalUrlContextMetadata: any = null;
    let detectedFunctionCallPart: Part | undefined = undefined;

    try {
        if (abortSignal.aborted) {
            logService.warn("Streaming aborted by signal before start.");
            return;
        }

        const endpoint = resolveBffStreamEndpoint();
        const requestPayload: ChatStreamRequestPayload = {
            model: modelId,
            history,
            parts,
            config,
            role,
            apiKeyOverride: apiKey !== BACKEND_MANAGED_KEY_SENTINEL ? apiKey : undefined,
        };

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
            },
            signal: abortSignal,
            body: JSON.stringify(requestPayload),
        });

        if (!response.ok) {
            throw await parseBffErrorResponse(response);
        }

        await consumeSseStream(response, abortSignal, (event) => {
            const payload = event.payload as any;

            if (event.eventName === 'meta') {
                const metaPayload = payload as ChatStreamMetaEventPayload | undefined;
                if (typeof metaPayload?.keyId === 'string') {
                    logService.recordApiKeyUsage(metaPayload.keyId, { source: 'server' });
                }
                return;
            }

            if (event.eventName === 'part') {
                if (payload?.part) {
                    onPart(payload.part as Part);
                }
                return;
            }

            if (event.eventName === 'thought') {
                if (typeof payload?.chunk === 'string') {
                    onThoughtChunk(payload.chunk);
                }
                return;
            }

            if (event.eventName === 'complete') {
                if (payload?.usageMetadata) {
                    finalUsageMetadata = payload.usageMetadata as UsageMetadata;
                }
                if (payload?.groundingMetadata) {
                    finalGroundingMetadata = payload.groundingMetadata;
                }
                if (payload?.urlContextMetadata) {
                    finalUrlContextMetadata = payload.urlContextMetadata;
                }
                if (payload?.functionCallPart) {
                    detectedFunctionCallPart = normalizeThoughtSignaturePart(payload.functionCallPart as Part);
                }
                return;
            }

            if (event.eventName === 'error') {
                throw createBffStreamError(payload?.error as BffStreamErrorPayload | undefined);
            }
        });
    } catch (error) {
        const isAborted = abortSignal.aborted || (error instanceof Error && error.name === 'AbortError');
        if (isAborted) {
            logService.warn("Streaming aborted by signal.");
            return;
        }

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
        // In backend-managed mode we still need BFF transport, even when UI streaming is disabled.
        if (apiKey === BACKEND_MANAGED_KEY_SENTINEL) {
            const bufferedParts: Part[] = [];
            let bufferedThoughts = '';

            await sendStatelessMessageStreamApi(
                apiKey,
                modelId,
                history,
                parts,
                config,
                abortSignal,
                (part) => bufferedParts.push(part),
                (chunk) => {
                    bufferedThoughts += chunk;
                },
                onError,
                (usageMetadata, groundingMetadata, urlContextMetadata) => {
                    onComplete(
                        bufferedParts,
                        bufferedThoughts || undefined,
                        usageMetadata,
                        groundingMetadata,
                        urlContextMetadata
                    );
                }
            );
            return;
        }

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
