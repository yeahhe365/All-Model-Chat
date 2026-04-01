
import { ModelOption } from '../types';

/**
 * Provider type identifiers.
 * 'gemini' uses the @google/genai SDK directly.
 * 'openai-compatible' uses the OpenAI-compatible /v1/chat/completions endpoint.
 */
export type ProviderType = 'gemini' | 'openai-compatible';

export interface ProviderPreset {
    name: string;
    type: ProviderType;
    baseUrl: string;
    models: ModelOption[];
    /** Model ID prefix used for detection. */
    prefix: string;
}

export const MINIMAX_BASE_URL = 'https://api.minimax.io/v1';

export const MINIMAX_MODELS: ModelOption[] = [
    { id: 'MiniMax-M2.7', name: 'MiniMax M2.7', isPinned: true },
    { id: 'MiniMax-M2.7-highspeed', name: 'MiniMax M2.7 Highspeed', isPinned: true },
];

/**
 * Check if a model ID belongs to MiniMax.
 */
export const isMiniMaxModel = (modelId: string): boolean => {
    return modelId.startsWith('MiniMax-');
};

/**
 * Check if a model uses the OpenAI-compatible API path.
 */
export const isOpenAICompatModel = (modelId: string): boolean => {
    return isMiniMaxModel(modelId);
};

/**
 * Get the base URL for an OpenAI-compatible model.
 */
export const getOpenAICompatBaseUrl = (modelId: string): string => {
    if (isMiniMaxModel(modelId)) {
        return MINIMAX_BASE_URL;
    }
    return '';
};
