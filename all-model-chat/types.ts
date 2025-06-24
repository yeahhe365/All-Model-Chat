

import { Chat, Part } from "@google/genai";
import { ThemeColors } from './constants'; // Added ThemeColors import

export interface UploadedFile {
  id: string; // Unique identifier for the file instance during processing
  name: string;
  type: string; // MIME type
  size: number;
  dataUrl?: string; // For image preview (base64 data URL) - optional
  base64Data?: string; // Raw base64 data for image API (without prefix) - optional
  textContent?: string; // Raw text content for text-based files - optional
  isProcessing?: boolean; // True while FileReader is active for this file
  progress?: number; // 0-100, for FileReader progress
  error?: string; // Error message if FileReader fails or other processing error
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'error';
  content: string; // Primary text content, can be empty if only a file is sent
  files?: UploadedFile[]; // If files were sent with this user message
  timestamp: Date;
  thoughts?: string; // Optional: To store thinking summary from the model
  isLoading?: boolean; // Optional: To indicate if this specific message is currently being streamed
  generationStartTime?: Date; // Optional: Timestamp when model response generation started
  generationEndTime?: Date;   // Optional: Timestamp when model response generation finished
}

export interface ModelOption {
  id:string; // e.g., "models/gemini-2.5-flash-preview-04-17"
  name: string; // User-friendly display name
  isPinned?: boolean; // Optional flag to indicate if the model is "forced" or "pinned"
}

// Defines the structure for a part of a content message (e.g., text or inline data)
export interface ContentPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string; // base64 encoded string (the raw data, not data URL)
  };
}

// Defines the structure for a single item in the chat history for API
export interface ChatHistoryItem {
  role: 'user' | 'model';
  parts: ContentPart[]; // Now an array of ContentPart
}

export interface ChatSettings {
  modelId: string;
  temperature: number;
  topP: number;
  showThoughts: boolean;
  systemInstruction: string;
  // themeId is global, not per-session
}

// Stored in localStorage
export interface SavedChatSession {
  id: string;
  title: string;
  timestamp: number; // ISO string or number (Date.now())
  messages: ChatMessage[];
  settings: ChatSettings;
}


export interface AppSettings extends ChatSettings {
 themeId: string; // Global theme setting
 baseFontSize: number; // Global base font size in pixels
}


export interface GeminiService {
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
  sendMessageNonStream: ( // Added for non-streaming responses
    chat: Chat,
    modelId: string,
    promptParts: ContentPart[],
    abortSignal: AbortSignal,
    onError: (error: Error) => void,
    onComplete: (fullText: string, thoughtsText?: string) => void
  ) => Promise<void>;
  getAvailableModels: () => Promise<ModelOption[]>;
}

// Interface for parts that might include a 'thought' marker
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
  onRetryMessage: (messageId: string) => void; // Added onRetryMessage
  showThoughts: boolean;
  themeColors: ThemeColors; // Added for PNG export styling
  baseFontSize: number; // Added to control message font size
}

// New interface for preloaded messages
export interface PreloadedMessage {
  id: string; // Unique ID for list management
  role: 'user' | 'model';
  content: string;
  // files?: UploadedFile[]; // Future: Consider supporting files in preloads
}