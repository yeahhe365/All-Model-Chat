
import { Chat, Part, File as GeminiFile, UsageMetadata, ChatHistoryItem } from "@google/genai";
import { ModelOption } from './settings';

export interface GeminiService {
  getAvailableModels: (apiKeyString: string | null) => Promise<ModelOption[]>;
  uploadFile: (apiKey: string, file: File, mimeType: string, displayName: string, signal: AbortSignal) => Promise<GeminiFile>;
  getFileMetadata: (apiKey: string, fileApiName: string) => Promise<GeminiFile | null>;
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
    onComplete: (parts: Part[], thoughtsText?: string, usageMetadata?: UsageMetadata, groundingMetadata?: any, urlContextMetadata?: any) => void
  ) => Promise<void>;
  generateImages: (apiKey: string, modelId: string, prompt: string, aspectRatio: string, abortSignal: AbortSignal) => Promise<string[]>;
  generateSpeech: (apiKey: string, modelId: string, text: string, voice: string, abortSignal: AbortSignal) => Promise<string>;
  transcribeAudio: (apiKey: string, audioFile: File, modelId: string, options: { isThinkingEnabled: boolean }) => Promise<string>;
  translateText(apiKey: string, text: string): Promise<string>;
  generateTitle(apiKey: string, userContent: string, modelContent: string, language: 'en' | 'zh'): Promise<string>;
  generateSuggestions(apiKey: string, userContent: string, modelContent: string, language: 'en' | 'zh'): Promise<string[]>;
  editImage: (apiKey: string, modelId: string, history: ChatHistoryItem[], parts: Part[], abortSignal: AbortSignal, aspectRatio?: string) => Promise<Part[]>;
}

export interface ThoughtSupportingPart extends Part {
    thought?: any;
}
