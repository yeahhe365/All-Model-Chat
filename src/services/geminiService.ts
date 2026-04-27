
import { GeminiService, ChatHistoryItem } from '../types';
import type { EditImageRequestConfig, GenerateImagesRequestOptions } from '../types';
import type { CountTokensConfig, Part, File as GeminiFile } from "@google/genai";
import { uploadFileApi, getFileMetadataApi } from './api/fileApi';
import { generateImagesApi } from './api/generation/imageApi';
import { generateSpeechApi, transcribeAudioApi } from './api/generation/audioApi';
import { generateTitleApi, generateSuggestionsApi, translateTextApi } from './api/generation/textApi';
import { countTokensApi } from './api/generation/tokenApi';
import { sendStatelessMessageStreamApi, sendStatelessMessageNonStreamApi } from './api/chatApi';
import { buildGenerationConfig } from './api/generationConfig';
import { logService } from "./logService";

class GeminiServiceImpl implements GeminiService {
    constructor() {
        logService.info("GeminiService created.");
    }

    async uploadFile(
        apiKey: string, 
        file: File, 
        mimeType: string, 
        displayName: string, 
        signal: AbortSignal,
        onProgress?: (loaded: number, total: number) => void
    ): Promise<GeminiFile> {
        return uploadFileApi(apiKey, file, mimeType, displayName, signal, onProgress);
    }
    
    async getFileMetadata(apiKey: string, fileApiName: string): Promise<GeminiFile | null> {
        return getFileMetadataApi(apiKey, fileApiName);
    }

    async generateImages(
        apiKey: string,
        modelId: string,
        prompt: string,
        aspectRatio: string,
        imageSize: string | undefined,
        abortSignal: AbortSignal,
        options?: GenerateImagesRequestOptions,
    ): Promise<string[]> {
        return generateImagesApi(apiKey, modelId, prompt, aspectRatio, imageSize, abortSignal, options);
    }

    async generateSpeech(apiKey: string, modelId: string, text: string, voice: string, abortSignal: AbortSignal): Promise<string> {
        return generateSpeechApi(apiKey, modelId, text, voice, abortSignal);
    }

    async transcribeAudio(apiKey: string, audioFile: File, modelId: string): Promise<string> {
        return transcribeAudioApi(apiKey, audioFile, modelId);
    }

    async translateText(apiKey: string, text: string, targetLanguage?: string): Promise<string> {
        return translateTextApi(apiKey, text, targetLanguage);
    }

    async generateTitle(apiKey: string, userContent: string, modelContent: string, language: 'en' | 'zh'): Promise<string> {
        return generateTitleApi(apiKey, userContent, modelContent, language);
    }

    async generateSuggestions(apiKey: string, userContent: string, modelContent: string, language: 'en' | 'zh'): Promise<string[]> {
        return generateSuggestionsApi(apiKey, userContent, modelContent, language);
    }

    async countTokens(apiKey: string, modelId: string, parts: Part[], config?: CountTokensConfig): Promise<number> {
        return countTokensApi(apiKey, modelId, parts, config);
    }

    async editImage(
        apiKey: string,
        modelId: string,
        history: ChatHistoryItem[],
        parts: Part[],
        abortSignal: AbortSignal,
        aspectRatio?: string,
        imageSize?: string,
        requestConfig?: EditImageRequestConfig,
    ): Promise<Part[]> {
        return new Promise((resolve, reject) => {
            if (abortSignal.aborted) {
                const abortError = new Error("aborted");
                abortError.name = "AbortError";
                return reject(abortError);
            }
            const handleComplete = (responseParts: Part[]) => {
                resolve(responseParts);
            };
            const handleError = (error: Error) => {
                reject(error);
            };

            buildGenerationConfig({
                modelId,
                systemInstruction: requestConfig?.systemInstruction || '',
                config: {},
                showThoughts: requestConfig?.showThoughts ?? false,
                thinkingBudget: requestConfig?.thinkingBudget ?? 0,
                isGoogleSearchEnabled: !!requestConfig?.isGoogleSearchEnabled,
                isCodeExecutionEnabled: false,
                isUrlContextEnabled: false,
                thinkingLevel: requestConfig?.thinkingLevel,
                aspectRatio,
                isDeepSearchEnabled: !!requestConfig?.isDeepSearchEnabled,
                imageSize,
                safetySettings: requestConfig?.safetySettings,
                imageOutputMode: requestConfig?.imageOutputMode,
                personGeneration: requestConfig?.personGeneration,
            })
                .then((config) =>
                    sendStatelessMessageNonStreamApi(
                        apiKey,
                        modelId,
                        history,
                        parts,
                        config,
                        abortSignal,
                        handleError,
                        (responseParts) => handleComplete(responseParts)
                    )
                )
                .catch(handleError);
        });
    }

    sendMessageStream: GeminiService['sendMessageStream'] = async (
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
        return sendStatelessMessageStreamApi(
            apiKey, modelId, history, parts, config, abortSignal, onPart, onThoughtChunk, onError, onComplete, role
        );
    };

    sendMessageNonStream: GeminiService['sendMessageNonStream'] = async (
        apiKey,
        modelId,
        history,
        parts,
        config,
        abortSignal,
        onError,
        onComplete,
        role = 'user'
    ) => {
        return sendStatelessMessageNonStreamApi(
            apiKey, modelId, history, parts, config, abortSignal, onError, onComplete, role
        );
    };
}

export const geminiServiceInstance: GeminiService = new GeminiServiceImpl();
