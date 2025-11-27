
import { ChatSettings } from './settings';

export interface VideoMetadata {
  startOffset?: string;
  endOffset?: string;
  fps?: number;
}

export interface UploadedFile {
  id: string;
  name: string; // Original filename
  type: string;
  size: number;
  dataUrl?: string;
  textContent?: string;
  isProcessing?: boolean;
  progress?: number;
  error?: string;

  // Fields for API uploaded files like PDFs
  rawFile?: File | Blob; // Persisted File/Blob for offline access, used to generate dataUrl on load.
  fileUri?: string; // URI returned by Gemini API (e.g., "files/xxxxxxxx")
  fileApiName?: string; // Full resource name from API (e.g., "files/xxxxxxxx")
  uploadState?: 'pending' | 'uploading' | 'processing_api' | 'active' | 'failed' | 'cancelled'; // State of the file on Gemini API
  abortController?: AbortController; // Added for cancelling uploads
  uploadSpeed?: string; // Added for upload speed display
  videoMetadata?: VideoMetadata; // Added for video clipping
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
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  thoughtTokens?: number; // Added for tracking thinking tokens
  cumulativeTotalTokens?: number; // Added for cumulative token count
  audioSrc?: string; // For TTS responses
  groundingMetadata?: any;
  urlContextMetadata?: any;
  suggestions?: string[];
  isGeneratingSuggestions?: boolean;
  stoppedByUser?: boolean;
  thoughtSignatures?: string[]; // Added for Gemini 3 Pro reasoning continuity
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
  videoMetadata?: VideoMetadata;
  thoughtSignature?: string; // Added to pass back to API
}

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

// Toolbar Props Definition
export interface ChatInputToolbarProps {
  isImagenModel: boolean;
  isGemini3ImageModel?: boolean;
  aspectRatio?: string;
  setAspectRatio?: (ratio: string) => void;
  imageSize?: string;
  setImageSize?: (size: string) => void;
  fileError: string | null;
  showAddByIdInput: boolean;
  fileIdInput: string;
  setFileIdInput: (value: string) => void;
  onAddFileByIdSubmit: () => void;
  onCancelAddById: () => void;
  isAddingById: boolean;
  showAddByUrlInput: boolean;
  urlInput: string;
  setUrlInput: (value: string) => void;
  onAddUrlSubmit: () => void;
  onCancelAddUrl: () => void;
  isAddingByUrl: boolean;
  isLoading: boolean;
  t: (key: string) => string;
  generateQuadImages?: boolean;
  onToggleQuadImages?: () => void;
}

export interface ChatInputActionsProps {
  onAttachmentAction: (action: any) => void;
  disabled: boolean;
  isGoogleSearchEnabled: boolean;
  onToggleGoogleSearch: () => void;
  isCodeExecutionEnabled: boolean;
  onToggleCodeExecution: () => void;
  isUrlContextEnabled: boolean;
  onToggleUrlContext: () => void;
  isDeepSearchEnabled: boolean;
  onToggleDeepSearch: () => void;
  onAddYouTubeVideo: () => void;
  onRecordButtonClick: () => void;
  isRecording?: boolean;
  isMicInitializing?: boolean;
  isTranscribing: boolean;
  isLoading: boolean;
  onStopGenerating: () => void;
  isEditing: boolean;
  onCancelEdit: () => void;
  canSend: boolean;
  isWaitingForUpload: boolean;
  t: (key: any) => string;
  onCancelRecording: () => void;
  onTranslate: () => void;
  isTranslating: boolean;
  inputText: string;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
}
