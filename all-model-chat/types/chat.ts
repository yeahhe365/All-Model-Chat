


import { ChatSettings, MediaResolution } from './settings';
import { ThemeColors } from './theme';
import { AppSettings, ModelOption } from './settings';
import { translations } from '../utils/appUtils';

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
  mediaResolution?: MediaResolution; // Added for Gemini 3 per-part resolution
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
  completionTokens?: number;
  totalTokens?: number;
  thoughtTokens?: number; // Added for tracking thinking tokens
  cumulativeTotalTokens?: number; // Added for cumulative token count
  audioSrc?: string; // For TTS responses
  audioAutoplay?: boolean; // Controls whether the audioSrc should play automatically on render
  groundingMetadata?: any;
  urlContextMetadata?: any;
  suggestions?: string[];
  isGeneratingSuggestions?: boolean;
  stoppedByUser?: boolean;
  thoughtSignatures?: string[]; // Added for Gemini 3 Pro reasoning continuity
  excludeFromContext?: boolean; // Added to exclude message from API history context
}

// Defines the structure for a part of a content message
export interface ContentPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
  fileData?: { // Added for referencing uploaded files like PDFs
    mimeType?: string; // Optional for YouTube URLs
    fileUri: string;
  };
  videoMetadata?: VideoMetadata;
  thoughtSignature?: string; // Added to pass back to API
  mediaResolution?: { level: string }; // Added for Gemini 3 per-part resolution
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
  isTtsModel?: boolean;
  ttsVoice?: string;
  setTtsVoice?: (voice: string) => void;
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
  supportedAspectRatios?: string[];
  supportedImageSizes?: string[]; // Added for configuring supported resolutions
  isNativeAudioModel?: boolean;
  mediaResolution?: MediaResolution;
  setMediaResolution?: (resolution: MediaResolution) => void;
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
  t: (key: string) => string;
  onCancelRecording: () => void;
  onTranslate: () => void;
  isTranslating: boolean;
  inputText: string;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  onCountTokens: () => void;
  editMode?: 'update' | 'resend';
  isNativeAudioModel?: boolean;
  onStartLiveSession?: () => void;
  isLiveConnected?: boolean;
  isLiveMuted?: boolean;
  onToggleLiveMute?: () => void;
  onFastSendMessage?: () => void;
}

export interface ChatInputProps {
  appSettings: AppSettings;
  currentChatSettings: ChatSettings;
  setAppFileError: (error: string | null) => void;
  activeSessionId: string | null;
  commandedInput: InputCommand | null;
  onMessageSent: () => void;
  selectedFiles: UploadedFile[]; 
  setSelectedFiles: (files: UploadedFile[] | ((prevFiles: UploadedFile[]) => UploadedFile[])) => void; 
  onSendMessage: (text: string, options?: { isFastMode?: boolean }) => void;
  isLoading: boolean; 
  isEditing: boolean;
  onStopGenerating: () => void;
  onCancelEdit: () => void;
  onProcessFiles: (files: FileList | File[]) => Promise<void>;
  onAddFileById: (fileId: string) => Promise<void>;
  onCancelUpload: (fileId: string) => void;
  onTranscribeAudio: (file: File) => Promise<string | null>;
  isProcessingFile: boolean; 
  fileError: string | null;
  t: (key: keyof typeof translations) => string;
  isImagenModel?: boolean;
  isImageEditModel?: boolean;
  aspectRatio?: string;
  setAspectRatio?: (ratio: string) => void;
  imageSize?: string;
  setImageSize?: (size: string) => void;
  isGoogleSearchEnabled: boolean;
  onToggleGoogleSearch: () => void;
  isCodeExecutionEnabled: boolean;
  onToggleCodeExecution: () => void;
  isUrlContextEnabled: boolean;
  onToggleUrlContext: () => void;
  isDeepSearchEnabled: boolean;
  onToggleDeepSearch: () => void;
  onClearChat: () => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
  onToggleCanvasPrompt: () => void;
  onTogglePinCurrentSession: () => void;
  onRetryLastTurn: () => void;
  onSelectModel: (modelId: string) => void;
  availableModels: ModelOption[];
  onEditLastUserMessage: () => void;
  onTogglePip: () => void;
  isPipActive?: boolean;
  isHistorySidebarOpen?: boolean;
  generateQuadImages: boolean;
  onToggleQuadImages: () => void;
  setCurrentChatSettings: (updater: (prevSettings: ChatSettings) => ChatSettings) => void;
  onSuggestionClick?: (suggestion: string) => void;
  onOrganizeInfoClick?: (suggestion: string) => void;
  showEmptyStateSuggestions?: boolean;
  editMode: 'update' | 'resend';
  onUpdateMessageContent: (messageId: string, content: string) => void;
  editingMessageId: string | null;
  setEditingMessageId: (id: string | null) => void;
  onAddUserMessage: (text: string, files?: UploadedFile[]) => void;
  onLiveTranscript?: (text: string, role: 'user' | 'model', isFinal: boolean, type?: 'content' | 'thought', audioUrl?: string | null) => void;
  onToggleBBox?: () => void;
  isBBoxModeActive?: boolean;
  onToggleGuide?: () => void;
  isGuideModeActive?: boolean;
  themeId: string;
}

export type { ThemeColors };