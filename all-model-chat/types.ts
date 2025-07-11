import { Chat, Part, File as GeminiFile, UsageMetadata } from "@google/genai";
import { Theme, ThemeColors } from './constants/themeConstants'; 
import { translations } from "./utils/appUtils";

export type { ThemeColors };

export interface UploadedFile {
  id: string; 
  name: string; // Original filename
  type: string; 
  size: number;
  dataUrl?: string; 
  base64Data?: string; 
  textContent?: string; 
  isProcessing?: boolean; 
  progress?: number; 
  error?: string; 
  
  // Fields for API uploaded files like PDFs
  rawFile?: File; // Temporary storage for the browser File object before API upload
  fileUri?: string; // URI returned by Gemini API (e.g., "files/xxxxxxxx")
  fileApiName?: string; // Full resource name from API (e.g., "files/xxxxxxxx")
  uploadState?: 'pending' | 'uploading' | 'processing_api' | 'active' | 'failed' | 'cancelled'; // State of the file on Gemini API
  abortController?: AbortController; // Added for cancelling uploads
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'error';
  content: string; 
  files?: UploadedFile[]; 
  timestamp: Date;
  thoughts?: string; 
  isLoading?: boolean; 
  generationStartTime?: Date; 
  generationEndTime?: Date;   
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  cumulativeTotalTokens?: number; // Added for cumulative token count
  audioSrc?: string; // For TTS responses
}

export interface ModelOption {
  id:string; 
  name: string; 
  isPinned?: boolean; 
}

// Defines the structure for a part of a content message
export interface ContentPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string; 
  };
  fileData?: { // Added for referencing uploaded files like PDFs
    mimeType: string;
    fileUri: string;
  };
}

export interface ChatHistoryItem {
  role: 'user' | 'model';
  parts: ContentPart[]; 
}

export interface ChatSettings {
  modelId: string;
  temperature: number;
  topP: number;
  showThoughts: boolean;
  systemInstruction: string;
  ttsVoice: string;
  thinkingBudget: number;
  lockedApiKey?: string | null;
}

export interface SavedChatSession {
  id: string;
  title: string;
  timestamp: number; 
  messages: ChatMessage[];
  settings: ChatSettings;
}


export interface AppSettings extends ChatSettings {
 themeId: string; 
 baseFontSize: number; 
 useCustomApiConfig: boolean;
 apiKey: string | null;
 apiProxyUrl: string | null;
 language: 'en' | 'zh' | 'system';
 isStreamingEnabled: boolean;
 transcriptionModelId: string;
 isTranscriptionThinkingEnabled: boolean;
}


export interface GeminiService {
  getAvailableModels: (apiKeyString: string | null) => Promise<ModelOption[]>;
  uploadFile: (apiKey: string, file: File, mimeType: string, displayName: string, signal: AbortSignal) => Promise<GeminiFile>;
  getFileMetadata: (apiKey: string, fileApiName: string) => Promise<GeminiFile | null>;
  sendMessageStream: (
    apiKey: string,
    modelId: string,
    historyWithLastPrompt: ChatHistoryItem[],
    systemInstruction: string,
    config: { temperature?: number; topP?: number },
    showThoughts: boolean,
    thinkingBudget: number,
    abortSignal: AbortSignal,
    onChunk: (chunk: string) => void,
    onThoughtChunk: (chunk: string) => void,
    onError: (error: Error) => void,
    onComplete: (usageMetadata?: UsageMetadata) => void
  ) => Promise<void>;
  sendMessageNonStream: (
    apiKey: string,
    modelId: string,
    historyWithLastPrompt: ChatHistoryItem[],
    systemInstruction: string,
    config: { temperature?: number; topP?: number },
    showThoughts: boolean,
    thinkingBudget: number,
    abortSignal: AbortSignal,
    onError: (error: Error) => void,
    onComplete: (fullText: string, thoughtsText?: string, usageMetadata?: UsageMetadata) => void
  ) => Promise<void>;
  generateImages: (apiKey: string, modelId: string, prompt: string, aspectRatio: string, abortSignal: AbortSignal) => Promise<string[]>;
  generateSpeech: (apiKey: string, modelId: string, text: string, voice: string, abortSignal: AbortSignal) => Promise<string>;
  transcribeAudio: (apiKey: string, audioFile: File, modelId: string, isThinkingEnabled: boolean) => Promise<string>;
}

export interface ThoughtSupportingPart extends Part {
    thought?: any;
}

export interface MessageListProps {
  messages: ChatMessage[];
  messagesEndRef: React.RefObject<HTMLDivElement>;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  onScrollContainerScroll: () => void;
  onEditMessage: (messageId: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onRetryMessage: (messageId: string) => void; 
  showThoughts: boolean;
  themeColors: ThemeColors; 
  themeId: string;
  baseFontSize: number; 
  onSuggestionClick?: (suggestion: string) => void;
  onTextToSpeech: (messageId: string, text: string) => void;
  ttsMessageId: string | null;
  t: (key: keyof typeof translations, fallback?: string) => string;
  language: 'en' | 'zh';
  showScrollToBottom?: boolean;
  onScrollToBottom?: () => void;
}

export interface PreloadedMessage {
  id: string; 
  role: 'user' | 'model';
  content: string;
}

export interface SavedScenario {
  id: string;
  title: string;
  messages: PreloadedMessage[];
}