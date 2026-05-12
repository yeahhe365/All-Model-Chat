import { type ChatSettings, type MediaResolution } from './settings';
import type { Part } from '@google/genai';

export interface VideoMetadata {
  startOffset?: string;
  endOffset?: string;
  fps?: number;
}

export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;

  // PRIMARY DATA SOURCE:
  // A standard Blob or File object.
  // This is stored in IndexedDB and used for API uploads.
  // It should ALWAYS be present for binary files.
  rawFile?: File | Blob;

  // UI DISPLAY:
  // A temporary `blob:` URL created via URL.createObjectURL(rawFile).
  // This is used for <img> tags and previews.
  // It is ephemeral and revoked on session unload.
  // It should NOT contain a Base64 data URI string.
  dataUrl?: string;

  textContent?: string;
  isProcessing?: boolean;
  progress?: number;
  error?: string;

  // Gemini Files API metadata for uploaded media and documents.
  fileUri?: string;
  fileApiName?: string;
  fileApiExpirationTime?: string;
  uploadState?: 'pending' | 'uploading' | 'processing_api' | 'active' | 'failed' | 'cancelled';
  abortController?: AbortController;
  uploadSpeed?: string;
  videoMetadata?: VideoMetadata;
  mediaResolution?: MediaResolution;
}

export interface PersistedSessionFileRecord {
  id: string;
  sessionId: string;
  messageId: string;
  name: string;
  type: string;
  rawFile: Blob;
}

export interface InputCommand {
  text: string;
  id: number;
  mode?: 'replace' | 'append' | 'quote' | 'insert';
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
  thinkingTimeMs?: number;
  firstTokenTimeMs?: number;
  promptTokens?: number;
  cachedPromptTokens?: number;
  completionTokens?: number;
  toolUsePromptTokens?: number;
  totalTokens?: number;
  thoughtTokens?: number;
  cumulativeTotalTokens?: number;
  audioSrc?: string;
  audioAutoplay?: boolean;
  groundingMetadata?: unknown;
  urlContextMetadata?: unknown;
  suggestions?: string[];
  isGeneratingSuggestions?: boolean;
  stoppedByUser?: boolean;
  thoughtSignatures?: string[];
  excludeFromContext?: boolean;
  apiParts?: Part[]; // Preserves raw API parts for either user or model turns.
  isInternalToolMessage?: boolean; // Hidden client-side tool plumbing turn used to rebuild API context.
  toolParentMessageId?: string; // Visible model message ID associated with an internal tool turn.
}

export type ContentPart = Part;

export interface ChatGroup {
  id: string;
  title: string;
  timestamp: number;
  isPinned?: boolean;
  isExpanded?: boolean;
}

export interface SavedChatSession {
  id: string;
  title: string;
  timestamp: number;
  messages: ChatMessage[];
  settings: ChatSettings;
  isPinned?: boolean;
  groupId?: string | null;
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
  systemInstruction?: string;
}

export interface CommandInfo {
  name: string;
  description: string;
  icon?: string;
}

export type AttachmentAction =
  | 'upload'
  | 'gallery'
  | 'camera'
  | 'recorder'
  | 'id'
  | 'url'
  | 'text'
  | 'screenshot'
  | 'folder'
  | 'zip';

export interface SideViewContent {
  type: 'html' | 'mermaid' | 'graphviz' | 'svg';
  content: string;
  language?: string;
  title?: string;
}
