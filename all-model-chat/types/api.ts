
import { Part, UsageMetadata, File as GeminiFile, ChatHistoryItem } from "@google/genai";
import { ModelOption } from './settings';

export interface GeminiService {
  uploadFile: (
    apiKey: string, 
    file: File, 
    mimeType: string, 
    displayName: string, 
    signal: AbortSignal,
    onProgress?: (loaded: number, total: number) => void
  ) => Promise<GeminiFile>;
  getFileMetadata: (apiKey: string, fileApiName: string) => Promise<GeminiFile | null>;
  
  // Stateless Message Sending
  sendMessageStream: (
    apiKey: string,
    modelId: string,
    history: ChatHistoryItem[],
    parts: Part[],
    config: any,
    abortSignal: AbortSignal,
    onPart: (part: Part) => void,
    onThoughtChunk: (chunk: string) => void,
    onError: (error: Error) => void,
    onComplete: (usageMetadata?: UsageMetadata, groundingMetadata?: any, urlContextMetadata?: any) => void
  ) => Promise<void>;

  sendMessageNonStream: (
    apiKey: string,
    modelId: string,
    history: ChatHistoryItem[],
    parts: Part[],
    config: any,
    abortSignal: AbortSignal,
    onError: (error: Error) => void,
    onComplete: (parts: Part[], thoughtsText?: string, usageMetadata?: UsageMetadata, groundingMetadata?: any, urlContextMetadata?: any) => void
  ) => Promise<void>;

  generateImages: (apiKey: string, modelId: string, prompt: string, aspectRatio: string, imageSize: string | undefined, abortSignal: AbortSignal) => Promise<string[]>;
  generateSpeech: (apiKey: string, modelId: string, text: string, voice: string, abortSignal: AbortSignal) => Promise<string>;
  transcribeAudio: (apiKey: string, audioFile: File, modelId: string) => Promise<string>;
  translateText(apiKey: string, text: string, targetLanguage?: string): Promise<string>;
  generateTitle(apiKey: string, userContent: string, modelContent: string, language: 'en' | 'zh'): Promise<string>;
  generateSuggestions(apiKey: string, userContent: string, modelContent: string, language: 'en' | 'zh'): Promise<string[]>;
  editImage: (apiKey: string, modelId: string, history: ChatHistoryItem[], parts: Part[], abortSignal: AbortSignal, aspectRatio?: string, imageSize?: string) => Promise<Part[]>;
}

export interface ThoughtSupportingPart extends Part {
    thought?: any;
}
