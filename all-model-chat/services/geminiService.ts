import { GeminiService, ChatHistoryItem, ModelOption } from '../types';
import { Part, UsageMetadata, File as GeminiFile } from "@google/genai";
import { getAvailableModelsApi } from './api/modelApi';
import { uploadFileApi, getFileMetadataApi } from './api/fileApi';
import { generateImagesApi, generateSpeechApi, transcribeAudioApi, generateTitleApi, generateSuggestionsApi } from './api/generationApi';
import { sendMessageStreamApi, sendMessageNonStreamApi } from './api/chatApi';
import { logService } from "./logService";

class GeminiServiceImpl implements GeminiService {
    constructor() {
        logService.info("GeminiService created.");
    }

    async getAvailableModels(apiKeysString: string | null): Promise<ModelOption[]> {
        return getAvailableModelsApi(apiKeysString);
    }

    async uploadFile(apiKey: string, file: File, mimeType: string, displayName: string, signal: AbortSignal): Promise<GeminiFile> {
        return uploadFileApi(apiKey, file, mimeType, displayName, signal);
    }
    
    async getFileMetadata(apiKey: string, fileApiName: string): Promise<GeminiFile | null> {
        return getFileMetadataApi(apiKey, fileApiName);
    }

    async generateImages(apiKey: string, modelId: string, prompt: string, aspectRatio: string, abortSignal: AbortSignal): Promise<string[]> {
        return generateImagesApi(apiKey, modelId, prompt, aspectRatio, abortSignal);
    }

    async generateSpeech(apiKey: string, modelId: string, text: string, voice: string, abortSignal: AbortSignal): Promise<string> {
        return generateSpeechApi(apiKey, modelId, text, voice, abortSignal);
    }

    async transcribeAudio(apiKey: string, audioFile: File, modelId: string, isThinkingEnabled: boolean): Promise<string> {
        return transcribeAudioApi(apiKey, audioFile, modelId, isThinkingEnabled);
    }

    async generateTitle(apiKey: string, userContent: string, modelContent: string, language: 'en' | 'zh'): Promise<string> {
        return generateTitleApi(apiKey, userContent, modelContent, language);
    }

    async generateSuggestions(apiKey: string, userContent: string, modelContent: string, language: 'en' | 'zh'): Promise<string[]> {
        return generateSuggestionsApi(apiKey, userContent, modelContent, language);
    }

    async sendMessageStream(
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
    ): Promise<void> {
        return sendMessageStreamApi(
            apiKey, modelId, historyWithLastPrompt, systemInstruction, config, showThoughts, thinkingBudget,
            isGoogleSearchEnabled, isCodeExecutionEnabled, isUrlContextEnabled, abortSignal, onPart, onThoughtChunk, onError, onComplete
        );
    }

    async sendMessageNonStream(
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
    ): Promise<void> {
        return sendMessageNonStreamApi(
            apiKey, modelId, historyWithLastPrompt, systemInstruction, config, showThoughts, thinkingBudget,
            isGoogleSearchEnabled, isCodeExecutionEnabled, isUrlContextEnabled, abortSignal, onError, onComplete
        );
    }
}

export const geminiServiceInstance: GeminiService = new GeminiServiceImpl();