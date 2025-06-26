


import { Chat, Part, File as GeminiFile } from "@google/genai"; // Added GeminiFile import
import { ThemeColors } from './constants'; 

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
  uploadState?: 'pending' | 'uploading' | 'processing_api' | 'active' | 'failed'; // State of the file on Gemini API
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
 useCustomApiConfig: boolean; // Added for custom API config toggle
 apiKey: string | null;
 apiUrl: string | null;
}


export interface GeminiService {
  updateApiKeyAndUrl: (apiKey: string | null, apiUrl: string | null) => void;
  initializeChat: (
    modelId: string,
    systemInstruction: string,
    config: { temperature?: number; topP?: number },
    showThoughts: boolean,
    history?: ChatHistoryItem[]
  ) => Promise<Chat | null>;
  sendMessageStream: (
    chat: Chat,
    modelId: string,
    promptParts: ContentPart[], 
    abortSignal: AbortSignal,
    onChunk: (chunk: string) => void,
    onThoughtChunk: (chunk: string) => void,
    onError: (error: Error) => void,
    onComplete: () => void
  ) => Promise<void>;
  sendMessageNonStream: ( 
    chat: Chat,
    modelId: string,
    promptParts: ContentPart[],
    abortSignal: AbortSignal,
    onError: (error: Error) => void,
    onComplete: (fullText: string, thoughtsText?: string) => void
  ) => Promise<void>;
  getAvailableModels: () => Promise<ModelOption[]>;
  uploadFile: (file: File, mimeType: string, displayName: string) => Promise<GeminiFile>; 
  getFileMetadata: (fileApiName: string) => Promise<GeminiFile | null>; // Added to get file metadata
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
  baseFontSize: number; 
}

export interface PreloadedMessage {
  id: string; 
  role: 'user' | 'model';
  content: string;
}