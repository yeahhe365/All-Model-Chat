
import type { Content, Part, UsageMetadata, File as GeminiFile, FunctionDeclaration } from "@google/genai";
import type { SafetySetting } from './settings';

export type ChatHistoryItem = Content & {
  parts: Part[];
  role: 'user' | 'model';
};

export type StreamMessageCompleteHandler = (
  usageMetadata?: UsageMetadata,
  groundingMetadata?: unknown,
  urlContextMetadata?: unknown
) => void;

export type NonStreamMessageCompleteHandler = (
  parts: Part[],
  thoughtsText?: string,
  usageMetadata?: UsageMetadata,
  groundingMetadata?: unknown,
  urlContextMetadata?: unknown
) => void;

export type StreamMessageSender = (
  apiKey: string,
  modelId: string,
  history: ChatHistoryItem[],
  parts: Part[],
  config: unknown,
  abortSignal: AbortSignal,
  onPart: (part: Part) => void,
  onThoughtChunk: (chunk: string) => void,
  onError: (error: Error) => void,
  onComplete: StreamMessageCompleteHandler,
  role?: 'user' | 'model'
) => Promise<void>;

export type NonStreamMessageSender = (
  apiKey: string,
  modelId: string,
  history: ChatHistoryItem[],
  parts: Part[],
  config: unknown,
  abortSignal: AbortSignal,
  onError: (error: Error) => void,
  onComplete: NonStreamMessageCompleteHandler
) => Promise<void>;

export interface LiveClientFunction {
  declaration: FunctionDeclaration;
  handler: (args: unknown) => Promise<unknown>;
}

export type LiveClientFunctions = Record<string, LiveClientFunction>;

export interface EditImageRequestConfig {
  systemInstruction?: string;
  showThoughts?: boolean;
  thinkingBudget?: number;
  thinkingLevel?: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH';
  isGoogleSearchEnabled?: boolean;
  isDeepSearchEnabled?: boolean;
  safetySettings?: SafetySetting[];
}

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
  sendMessageStream: StreamMessageSender;
  sendMessageNonStream: NonStreamMessageSender;

  generateImages: (apiKey: string, modelId: string, prompt: string, aspectRatio: string, imageSize: string | undefined, abortSignal: AbortSignal) => Promise<string[]>;
  generateSpeech: (apiKey: string, modelId: string, text: string, voice: string, abortSignal: AbortSignal) => Promise<string>;
  transcribeAudio: (apiKey: string, audioFile: File, modelId: string) => Promise<string>;
  translateText(apiKey: string, text: string, targetLanguage?: string): Promise<string>;
  generateTitle(apiKey: string, userContent: string, modelContent: string, language: 'en' | 'zh'): Promise<string>;
  generateSuggestions(apiKey: string, userContent: string, modelContent: string, language: 'en' | 'zh'): Promise<string[]>;
  editImage: (
    apiKey: string,
    modelId: string,
    history: ChatHistoryItem[],
    parts: Part[],
    abortSignal: AbortSignal,
    aspectRatio?: string,
    imageSize?: string,
    requestConfig?: EditImageRequestConfig,
  ) => Promise<Part[]>;
  countTokens: (apiKey: string, modelId: string, parts: Part[]) => Promise<number>;
}

export interface ThoughtSupportingPart extends Part {
    thought?: boolean;
}
