
import { GeminiService, ChatHistoryItem, ModelOption } from '../types';
import { Part, UsageMetadata, File as GeminiFile, Chat, Modality } from "@google/genai";
import { getAvailableModelsApi } from './api/modelApi';
import { uploadFileApi, getFileMetadataApi } from './api/fileApi';
import { generateImagesApi, generateSpeechApi, transcribeAudioApi, translateTextApi, generateTitleApi, generateSuggestionsApi } from './api/generationApi';
import { sendMessageStreamApi, sendMessageNonStreamApi, sendStatelessMessageNonStreamApi } from './api/chatApi';
import { logService } from "./logService";

class GeminiServiceImpl implements GeminiService {
    constructor() {
        logService.info("GeminiService created.");
    }

    async getAvailableModels(apiKeysString: string | null, baseUrl?: string): Promise<ModelOption[]> {
        return getAvailableModelsApi(apiKeysString, baseUrl);
    }

    async uploadFile(
        apiKey: string, 
        file: File, 
        mimeType: string, 
        displayName: string, 
        signal: AbortSignal,
        baseUrl?: string,
        onProgress?: (loaded: number, total: number) => void
    ): Promise<GeminiFile> {
        return uploadFileApi(apiKey, file, mimeType, displayName, signal, baseUrl, onProgress);
    }
    
    async getFileMetadata(apiKey: string, fileApiName: string, baseUrl?: string): Promise<GeminiFile | null> {
        return getFileMetadataApi(apiKey, fileApiName, baseUrl);
    }

    async generateImages(apiKey: string, modelId: string, prompt: string, aspectRatio: string, abortSignal: AbortSignal, baseUrl?: string): Promise<string[]> {
        return generateImagesApi(apiKey, modelId, prompt, aspectRatio, abortSignal, baseUrl);
    }

    async generateSpeech(apiKey: string, modelId: string, text: string, voice: string, abortSignal: AbortSignal, baseUrl?: string): Promise<string> {
        return generateSpeechApi(apiKey, modelId, text, voice, abortSignal, baseUrl);
    }

    async transcribeAudio(apiKey: string, audioFile: File, modelId: string, baseUrl?: string): Promise<string> {
        return transcribeAudioApi(apiKey, audioFile, modelId, baseUrl);
    }

    async translateText(apiKey: string, text: string, baseUrl?: string): Promise<string> {
        return translateTextApi(apiKey, text, baseUrl);
    }

    async generateTitle(apiKey: string, userContent: string, modelContent: string, language: 'en' | 'zh', baseUrl?: string): Promise<string> {
        return generateTitleApi(apiKey, userContent, modelContent, language, baseUrl);
    }

    async generateSuggestions(apiKey: string, userContent: string, modelContent: string, language: 'en' | 'zh', baseUrl?: string): Promise<string[]> {
        return generateSuggestionsApi(apiKey, userContent, modelContent, language, baseUrl);
    }

    async editImage(apiKey: string, modelId: string, history: ChatHistoryItem[], parts: Part[], abortSignal: AbortSignal, aspectRatio?: string, baseUrl?: string): Promise<Part[]> {
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
            
            const config: any = {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            };
            
            if (aspectRatio) {
                config.imageConfig = {
                    aspectRatio: aspectRatio
                };
            }

            sendStatelessMessageNonStreamApi(
                apiKey,
                modelId,
                history,
                parts,
                config,
                abortSignal,
                handleError,
                (responseParts, thoughts, usage, grounding) => handleComplete(responseParts),
                baseUrl
            );
        });
    }

    async sendMessageStream(
        chat: Chat,
        parts: Part[],
        abortSignal: AbortSignal,
        onPart: (part: Part) => void,
        onThoughtChunk: (chunk: string) => void,
        onError: (error: Error) => void,
        onComplete: (usageMetadata?: UsageMetadata, groundingMetadata?: any, urlContextMetadata?: any) => void
    ): Promise<void> {
        return sendMessageStreamApi(
            chat, parts, abortSignal, onPart, onThoughtChunk, onError, onComplete
        );
    }

    async sendMessageNonStream(
        chat: Chat,
        parts: Part[],
        abortSignal: AbortSignal,
        onError: (error: Error) => void,
        onComplete: (parts: Part[], thoughtsText?: string, usageMetadata?: UsageMetadata, groundingMetadata?: any, urlContextMetadata?: any) => void
    ): Promise<void> {
        return sendMessageNonStreamApi(
            chat, parts, abortSignal, onError, onComplete
        );
    }

    async sendStatelessMessageNonStream(
        apiKey: string,
        modelId: string,
        history: ChatHistoryItem[],
        parts: Part[],
        config: any,
        abortSignal: AbortSignal,
        onError: (error: Error) => void,
        onComplete: (parts: Part[], thoughtsText?: string, usageMetadata?: UsageMetadata, groundingMetadata?: any, urlContextMetadata?: any) => void,
        baseUrl?: string
    ): Promise<void> {
        return sendStatelessMessageNonStreamApi(
            apiKey, modelId, history, parts, config, abortSignal, onError, onComplete, baseUrl
        );
    }
}

export const geminiServiceInstance: GeminiService = new GeminiServiceImpl();
