import { ChatSettings, ImageOutputMode, ImagePersonGeneration, MediaResolution } from './settings';
import type { Part } from '@google/genai';

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

  // Fields for API uploaded files like PDFs
  fileUri?: string; // URI returned by Gemini API (e.g., "files/xxxxxxxx")
  fileApiName?: string; // Full resource name from API (e.g., "files/xxxxxxxx")
  uploadState?: 'pending' | 'uploading' | 'processing_api' | 'active' | 'failed' | 'cancelled'; // State of the file on Gemini API
  abortController?: AbortController; // Added for cancelling uploads
  uploadSpeed?: string; // Added for upload speed display
  videoMetadata?: VideoMetadata; // Added for video clipping
  mediaResolution?: MediaResolution; // Added for Gemini 3 per-part resolution
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
  firstTokenTimeMs?: number; // Time to First Token (TTFT) in ms
  promptTokens?: number;
  cachedPromptTokens?: number;
  completionTokens?: number;
  toolUsePromptTokens?: number;
  totalTokens?: number;
  thoughtTokens?: number; // Added for tracking thinking tokens
  cumulativeTotalTokens?: number; // Added for cumulative token count
  audioSrc?: string; // For TTS responses
  audioAutoplay?: boolean; // Controls whether the audioSrc should play automatically on render
  groundingMetadata?: unknown;
  urlContextMetadata?: unknown;
  suggestions?: string[];
  isGeneratingSuggestions?: boolean;
  stoppedByUser?: boolean;
  thoughtSignatures?: string[]; // Added for Gemini 3 Pro reasoning continuity
  excludeFromContext?: boolean; // Added to exclude message from API history context
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

// Toolbar Props Definition
export interface ChatInputToolbarProps {
  isImagenModel: boolean;
  isGemini3ImageModel?: boolean;
  isRealImagenModel?: boolean;
  isTtsModel?: boolean;
  ttsVoice?: string;
  setTtsVoice?: (voice: string) => void;
  aspectRatio?: string;
  setAspectRatio?: (ratio: string) => void;
  imageSize?: string;
  setImageSize?: (size: string) => void;
  imageOutputMode?: ImageOutputMode;
  setImageOutputMode?: (mode: ImageOutputMode) => void;
  personGeneration?: ImagePersonGeneration;
  setPersonGeneration?: (mode: ImagePersonGeneration) => void;
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
  supportedAspectRatios?: string[];
  supportedImageSizes?: string[]; // Added for configuring supported resolutions
  isNativeAudioModel?: boolean;
  mediaResolution?: MediaResolution;
  setMediaResolution?: (resolution: MediaResolution) => void;
  ttsContext?: string;
  onEditTtsContext?: () => void;
}

export interface ChatInputActionsProps {
  onAttachmentAction: (action: AttachmentAction) => void;
  disabled: boolean;
  isImageModel?: boolean;
  isGemini3ImageModel?: boolean;
  supportsBuiltInCustomToolCombination?: boolean;
  isGemmaModel?: boolean;
  isRealImagenModel?: boolean;
  isGoogleSearchEnabled: boolean;
  onToggleGoogleSearch: () => void;
  isCodeExecutionEnabled: boolean;
  onToggleCodeExecution: () => void;
  isLocalPythonEnabled?: boolean;
  onToggleLocalPython?: () => void;
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
  onCancelRecording: () => void;
  onTranslate: () => void;
  showInputTranslationButton?: boolean;
  onPasteFromClipboard?: () => void;
  showInputPasteButton?: boolean;
  onClearInput?: () => void;
  showInputClearButton?: boolean;
  isTranslating: boolean;
  inputText: string;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  onCountTokens: () => void;
  editMode?: 'update' | 'resend';
  isNativeAudioModel?: boolean;
  onStartLiveSession?: () => void;
  onDisconnectLiveSession?: () => void;
  isLiveConnected?: boolean;
  isLiveMuted?: boolean;
  onToggleLiveMute?: () => void;
  onStartLiveCamera?: () => void;
  onStartLiveScreenShare?: () => void;
  onStopLiveVideo?: () => void;
  liveVideoSource?: 'camera' | 'screen' | null;
  onFastSendMessage?: () => void;
  canQueueMessage?: boolean;
  onQueueMessage?: () => void;
}
