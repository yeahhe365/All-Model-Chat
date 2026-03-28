
import { Part, UsageMetadata, ChatHistoryItem } from "@google/genai";
import { logService } from "../logService";
import { getOpenAICompatBaseUrl } from "../../constants/providerConstants";

/**
 * OpenAI-compatible chat API using native fetch().
 * Supports streaming (SSE) and non-streaming modes.
 * Used for MiniMax and other OpenAI-compatible providers.
 */

interface OpenAIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface OpenAIStreamChoice {
    delta?: { content?: string; role?: string };
    finish_reason?: string | null;
    index: number;
}

interface OpenAIStreamChunk {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: OpenAIStreamChoice[];
    usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
    };
}

interface OpenAIResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: {
        message: { role: string; content: string };
        finish_reason: string;
        index: number;
    }[];
    usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
    };
}

/**
 * Convert Gemini-format chat history to OpenAI messages format.
 */
export const convertHistoryToOpenAIMessages = (
    history: ChatHistoryItem[],
    parts: Part[],
    systemInstruction?: string,
    role: 'user' | 'model' = 'user'
): OpenAIMessage[] => {
    const messages: OpenAIMessage[] = [];

    // Add system instruction if provided
    if (systemInstruction) {
        messages.push({ role: 'system', content: systemInstruction });
    }

    // Convert history
    for (const item of history) {
        const textParts: string[] = [];
        for (const part of item.parts) {
            if (part.text) {
                textParts.push(part.text);
            } else if ((part as any).inlineData) {
                textParts.push('[Attachment: media content]');
            } else if ((part as any).fileData) {
                textParts.push('[Attachment: file reference]');
            }
        }
        const content = textParts.join('\n');
        if (content) {
            messages.push({
                role: item.role === 'model' ? 'assistant' : 'user',
                content,
            });
        }
    }

    // Add current message parts
    const currentTextParts: string[] = [];
    for (const part of parts) {
        if (part.text) {
            currentTextParts.push(part.text);
        }
    }
    const currentContent = currentTextParts.join('\n');
    if (currentContent) {
        messages.push({
            role: role === 'model' ? 'assistant' : 'user',
            content: currentContent,
        });
    }

    return messages;
};

/**
 * Clamp temperature for MiniMax: must be in (0.0, 1.0].
 */
const clampTemperature = (temp?: number): number => {
    if (temp === undefined || temp === null) return 0.7;
    if (temp <= 0) return 0.01;
    if (temp > 1.0) return 1.0;
    return temp;
};

/**
 * Strip <thinking>...</thinking> tags from MiniMax M2.7 response content.
 * M2.7 may include thinking blocks in the response.
 */
const stripThinkingTags = (content: string): { text: string; thoughts: string } => {
    const thinkingRegex = /<thinking>([\s\S]*?)<\/thinking>/gi;
    let thoughts = '';
    let match: RegExpExecArray | null;

    while ((match = thinkingRegex.exec(content)) !== null) {
        thoughts += match[1];
    }

    const text = content.replace(thinkingRegex, '').trim();
    return { text, thoughts };
};

/**
 * Send a streaming chat message via OpenAI-compatible API.
 */
export const sendOpenAICompatMessageStream = async (
    apiKey: string,
    modelId: string,
    history: ChatHistoryItem[],
    parts: Part[],
    config: { temperature?: number; topP?: number; systemInstruction?: string },
    abortSignal: AbortSignal,
    onPart: (part: Part) => void,
    onThoughtChunk: (chunk: string) => void,
    onError: (error: Error) => void,
    onComplete: (usageMetadata?: UsageMetadata, groundingMetadata?: any, urlContextMetadata?: any) => void,
    role: 'user' | 'model' = 'user'
): Promise<void> => {
    const baseUrl = getOpenAICompatBaseUrl(modelId);
    logService.info(`[OpenAI-Compat] Sending streaming message for ${modelId} to ${baseUrl}`);

    let finalUsage: UsageMetadata | undefined;
    let accumulatedContent = '';

    try {
        const messages = convertHistoryToOpenAIMessages(history, parts, config.systemInstruction, role);

        const requestBody: any = {
            model: modelId,
            messages,
            stream: true,
            temperature: clampTemperature(config.temperature),
        };

        if (config.topP !== undefined && config.topP !== null) {
            requestBody.top_p = config.topP;
        }

        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify(requestBody),
            signal: abortSignal,
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `API error ${response.status}`;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
            } catch {
                errorMessage = errorText || errorMessage;
            }
            throw new Error(errorMessage);
        }

        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('Response body is not readable');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            if (abortSignal.aborted) {
                logService.warn('[OpenAI-Compat] Streaming aborted by signal.');
                reader.cancel();
                break;
            }

            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data: ')) continue;

                const data = trimmed.slice(6);
                if (data === '[DONE]') continue;

                try {
                    const chunk: OpenAIStreamChunk = JSON.parse(data);
                    const choice = chunk.choices?.[0];

                    if (choice?.delta?.content) {
                        accumulatedContent += choice.delta.content;
                        onPart({ text: choice.delta.content });
                    }

                    if (chunk.usage) {
                        finalUsage = {
                            promptTokenCount: chunk.usage.prompt_tokens || 0,
                            candidatesTokenCount: chunk.usage.completion_tokens || 0,
                            totalTokenCount: chunk.usage.total_tokens || 0,
                        } as UsageMetadata;
                    }
                } catch (parseError) {
                    logService.debug('[OpenAI-Compat] Failed to parse SSE chunk:', parseError);
                }
            }
        }

        // Post-process: strip thinking tags from accumulated content
        if (accumulatedContent) {
            const { thoughts } = stripThinkingTags(accumulatedContent);
            if (thoughts) {
                onThoughtChunk(thoughts);
            }
        }

    } catch (error) {
        if (abortSignal.aborted) {
            logService.warn('[OpenAI-Compat] Request was aborted.');
        } else {
            logService.error('[OpenAI-Compat] Error sending streaming message:', error);
            onError(error instanceof Error ? error : new Error(String(error)));
        }
    } finally {
        logService.info('[OpenAI-Compat] Streaming complete.', { usage: finalUsage });
        onComplete(finalUsage, undefined, undefined);
    }
};

/**
 * Send a non-streaming chat message via OpenAI-compatible API.
 */
export const sendOpenAICompatMessageNonStream = async (
    apiKey: string,
    modelId: string,
    history: ChatHistoryItem[],
    parts: Part[],
    config: { temperature?: number; topP?: number; systemInstruction?: string },
    abortSignal: AbortSignal,
    onError: (error: Error) => void,
    onComplete: (parts: Part[], thoughtsText?: string, usageMetadata?: UsageMetadata, groundingMetadata?: any, urlContextMetadata?: any) => void
): Promise<void> => {
    const baseUrl = getOpenAICompatBaseUrl(modelId);
    logService.info(`[OpenAI-Compat] Sending non-streaming message for ${modelId} to ${baseUrl}`);

    try {
        const messages = convertHistoryToOpenAIMessages(history, parts, config.systemInstruction);

        const requestBody: any = {
            model: modelId,
            messages,
            stream: false,
            temperature: clampTemperature(config.temperature),
        };

        if (config.topP !== undefined && config.topP !== null) {
            requestBody.top_p = config.topP;
        }

        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify(requestBody),
            signal: abortSignal,
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `API error ${response.status}`;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
            } catch {
                errorMessage = errorText || errorMessage;
            }
            throw new Error(errorMessage);
        }

        const data: OpenAIResponse = await response.json();

        if (abortSignal.aborted) {
            onComplete([], '', undefined, undefined, undefined);
            return;
        }

        const rawContent = data.choices?.[0]?.message?.content || '';
        const { text, thoughts } = stripThinkingTags(rawContent);

        const responseParts: Part[] = text ? [{ text }] : [];

        const usage: UsageMetadata | undefined = data.usage ? {
            promptTokenCount: data.usage.prompt_tokens || 0,
            candidatesTokenCount: data.usage.completion_tokens || 0,
            totalTokenCount: data.usage.total_tokens || 0,
        } as UsageMetadata : undefined;

        logService.info(`[OpenAI-Compat] Non-stream complete for ${modelId}.`, { usage });
        onComplete(responseParts, thoughts || undefined, usage, undefined, undefined);

    } catch (error) {
        if (abortSignal.aborted) {
            logService.warn('[OpenAI-Compat] Request was aborted.');
            onComplete([], '', undefined, undefined, undefined);
        } else {
            logService.error('[OpenAI-Compat] Error sending non-streaming message:', error);
            onError(error instanceof Error ? error : new Error(String(error)));
        }
    }
};
