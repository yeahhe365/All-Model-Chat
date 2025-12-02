
import { Chat, Part, File as GeminiFile, UsageMetadata, ChatHistoryItem } from "@google/genai";
import { ModelOption } from './settings';

export interface GeminiService {
  getAvailableModels: (apiKeyString: string | null, baseUrl?: string | null) => Promise<ModelOption[]>;
  uploadFile: (
    apiKey: string, 
    file: File, 
    mimeType: string, 
    displayName: string, 
    signal: AbortSignal,
    baseUrl?: string | null,
    onProgress?: (loaded: number, total: number) => void
  ) => Promise<GeminiFile>;
  getFileMetadata: (apiKey: string, fileApiName: string, baseUrl?: string | null) => Promise<GeminiFile | null>;
  sendMessageStream: (
    chat: Chat,
    parts: Part[],
    abortSignal: AbortSignal,
    onPart: (part: Part) => void,
    onThoughtChunk: (chunk: string) => void,
    onError: (error: Error) => void,
    onComplete: (usageMetadata?: UsageMetadata, groundingMetadata?: any, urlContextMetadata?: any) => void
  ) => Promise<void>;
  sendMessageNonStream: (
    chat: Chat,
    parts: Part[],
    abortSignal: AbortSignal,
    onError: (error: Error) => void,
    onComplete: (parts: Part[], thoughtsText?: string, usageMetadata?: UsageMetadata, groundingMetadata?: any, urlContextMetadata?: any) => void
  ) => Promise<void>;
  sendStatelessMessageNonStream: (
    apiKey: string,
    modelId: string,
    history: ChatHistoryItem[],
    parts: Part[],
    config: any,
    abortSignal: AbortSignal,
    onError: (error: Error) => void,
    onComplete: (parts: Part[], thoughtsText?: string, usageMetadata?: UsageMetadata, groundingMetadata?: any, urlContextMetadata?: any) => void,
    baseUrl?: string | null
  ) => Promise<void>;
  generateImages: (apiKey: string, modelId: string, prompt: string, aspectRatio: string, abortSignal: AbortSignal, baseUrl?: string | null) => Promise<string[]>;
  generateSpeech: (apiKey: string, modelId: string, text: string, voice: string, abortSignal: AbortSignal, baseUrl?: string | null) => Promise<string>;
  transcribeAudio: (apiKey: string, audioFile: File, modelId: string, baseUrl?: string | null) => Promise<string>;
  translateText(apiKey: string, text: string, baseUrl?: string | null): Promise<string>;
  generateTitle(apiKey: string, userContent: string, modelContent: string, language: 'en' | 'zh', baseUrl?: string | null): Promise<string>;
  generateSuggestions(apiKey: string, userContent: string, modelContent: string, language: 'en' | 'zh', baseUrl?: string | null): Promise<string[]>;
  editImage: (apiKey: string, modelId: string, history: ChatHistoryItem[], parts: Part[], abortSignal: AbortSignal, aspectRatio?: string, baseUrl?: string | null) => Promise<Part[]>;
}

export interface ThoughtSupportingPart extends Part {
    thought?: any;
}
