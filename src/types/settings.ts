export interface ModelOption {
  id: string;
  name: string;
  isPinned?: boolean;
  apiMode?: ApiMode;
}

export enum HarmCategory {
  HARM_CATEGORY_HARASSMENT = 'HARM_CATEGORY_HARASSMENT',
  HARM_CATEGORY_HATE_SPEECH = 'HARM_CATEGORY_HATE_SPEECH',
  HARM_CATEGORY_SEXUALLY_EXPLICIT = 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
  HARM_CATEGORY_DANGEROUS_CONTENT = 'HARM_CATEGORY_DANGEROUS_CONTENT',
  HARM_CATEGORY_CIVIC_INTEGRITY = 'HARM_CATEGORY_CIVIC_INTEGRITY',
}

export enum HarmBlockThreshold {
  OFF = 'OFF',
  BLOCK_NONE = 'BLOCK_NONE',
  BLOCK_ONLY_HIGH = 'BLOCK_ONLY_HIGH',
  BLOCK_MEDIUM_AND_ABOVE = 'BLOCK_MEDIUM_AND_ABOVE',
  BLOCK_LOW_AND_ABOVE = 'BLOCK_LOW_AND_ABOVE',
}

export enum MediaResolution {
  MEDIA_RESOLUTION_UNSPECIFIED = 'MEDIA_RESOLUTION_UNSPECIFIED',
  MEDIA_RESOLUTION_LOW = 'MEDIA_RESOLUTION_LOW',
  MEDIA_RESOLUTION_MEDIUM = 'MEDIA_RESOLUTION_MEDIUM',
  MEDIA_RESOLUTION_HIGH = 'MEDIA_RESOLUTION_HIGH',
  MEDIA_RESOLUTION_ULTRA_HIGH = 'MEDIA_RESOLUTION_ULTRA_HIGH',
}

export type ImageOutputMode = 'IMAGE_TEXT' | 'IMAGE_ONLY';
export type ImagePersonGeneration = 'ALLOW_ADULT' | 'ALLOW_ALL' | 'DONT_ALLOW';
export type ApiMode = 'gemini-native' | 'openai-compatible';
export type LiveArtifactsPromptMode = 'inline' | 'full' | 'fullHtml';
export type LiveArtifactsSystemPrompts = Record<LiveArtifactsPromptMode, string>;
export type TranslationTargetLanguage =
  | 'English'
  | 'Simplified Chinese'
  | 'Traditional Chinese'
  | 'Japanese'
  | 'Korean'
  | 'Spanish'
  | 'French'
  | 'German';

export interface SafetySetting {
  category: HarmCategory;
  threshold: HarmBlockThreshold;
}

export interface FilesApiConfig {
  images: boolean;
  pdfs: boolean;
  audio: boolean;
  video: boolean;
  text: boolean;
}

export interface ChatSettings {
  modelId: string;
  temperature: number;
  topP: number;
  topK: number;
  showThoughts: boolean;
  systemInstruction: string;
  ttsVoice: string;
  thinkingBudget: number;
  thinkingLevel?: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH';
  lockedApiKey?: string | null;
  isGoogleSearchEnabled?: boolean;
  isCodeExecutionEnabled?: boolean;
  isLocalPythonEnabled?: boolean;
  isUrlContextEnabled?: boolean;
  isDeepSearchEnabled?: boolean;
  isRawModeEnabled?: boolean;
  hideThinkingInContext?: boolean;
  safetySettings?: SafetySetting[];
  mediaResolution?: MediaResolution;
}

export type ChatSettingsUpdater = (updater: (prevSettings: ChatSettings) => ChatSettings) => void;

export interface AppSettings extends ChatSettings {
  themeId: 'system' | 'onyx' | 'pearl';
  baseFontSize: number;
  apiMode: ApiMode;
  isOpenAICompatibleApiEnabled?: boolean;
  useCustomApiConfig: boolean;
  serverManagedApi?: boolean;
  apiKey: string | null;
  apiProxyUrl: string | null;
  openaiCompatibleApiKey: string | null;
  openaiCompatibleBaseUrl: string | null;
  openaiCompatibleModelId: string;
  openaiCompatibleModels: ModelOption[];
  useApiProxy?: boolean;
  language: 'en' | 'zh' | 'system';
  translationTargetLanguage: TranslationTargetLanguage;
  inputTranslationModelId?: string;
  thoughtTranslationTargetLanguage?: TranslationTargetLanguage;
  thoughtTranslationModelId?: string;
  showInputTranslationButton?: boolean;
  isStreamingEnabled: boolean;
  transcriptionModelId: string;
  filesApiConfig: FilesApiConfig;
  expandCodeBlocksByDefault: boolean;
  isAutoTitleEnabled: boolean;
  isMermaidRenderingEnabled: boolean;
  isGraphvizRenderingEnabled?: boolean;
  isCompletionNotificationEnabled: boolean;
  isCompletionSoundEnabled?: boolean;
  isSuggestionsEnabled: boolean;
  isAutoScrollOnSendEnabled?: boolean;
  isAutoSendOnSuggestionClick?: boolean;
  generateQuadImages?: boolean;
  autoFullscreenHtml?: boolean;
  showWelcomeSuggestions?: boolean;
  isAudioCompressionEnabled: boolean;
  autoLiveArtifactsVisualization?: boolean;
  autoLiveArtifactsModelId: string;
  liveArtifactsPromptMode?: LiveArtifactsPromptMode;
  liveArtifactsSystemPrompt?: string;
  liveArtifactsSystemPrompts?: LiveArtifactsSystemPrompts;
  isPasteRichTextAsMarkdownEnabled?: boolean;
  isPasteAsTextFileEnabled?: boolean;
  showInputPasteButton?: boolean;
  showInputClearButton?: boolean;
  isCopySelectionFormattingEnabled?: boolean;
  isSystemAudioRecordingEnabled?: boolean;
  customShortcuts: Record<string, string>; // ID -> Key Combination String
  tabModelCycleIds?: string[];
}
