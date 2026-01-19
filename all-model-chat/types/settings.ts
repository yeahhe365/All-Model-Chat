
export interface ModelOption {
  id: string;
  name: string;
  isPinned?: boolean;
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
  showThoughts: boolean;
  systemInstruction: string;
  ttsVoice: string;
  thinkingBudget: number;
  thinkingLevel?: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH';
  lockedApiKey?: string | null;
  isGoogleSearchEnabled?: boolean;
  isCodeExecutionEnabled?: boolean;
  isUrlContextEnabled?: boolean;
  isDeepSearchEnabled?: boolean;
  isRawModeEnabled?: boolean;
  hideThinkingInContext?: boolean;
  safetySettings?: SafetySetting[];
  mediaResolution?: MediaResolution;
}

export interface AppSettings extends ChatSettings {
 themeId: 'system' | 'onyx' | 'pearl';
 baseFontSize: number;
 useCustomApiConfig: boolean;
 apiKey: string | null;
 apiProxyUrl: string | null;
 useApiProxy?: boolean;
 language: 'en' | 'zh' | 'system';
 isStreamingEnabled: boolean;
 transcriptionModelId: string;
 filesApiConfig: FilesApiConfig;
 expandCodeBlocksByDefault: boolean;
 isAutoTitleEnabled: boolean;
 isMermaidRenderingEnabled: boolean;
 isGraphvizRenderingEnabled?: boolean;
 isCompletionNotificationEnabled: boolean;
 isSuggestionsEnabled: boolean;
 isAutoScrollOnSendEnabled?: boolean;
 isAutoSendOnSuggestionClick?: boolean;
 generateQuadImages?: boolean;
 autoFullscreenHtml?: boolean;
 showWelcomeSuggestions?: boolean;
 isAudioCompressionEnabled: boolean;
 autoCanvasVisualization?: boolean;
 autoCanvasModelId: string;
 isPasteRichTextAsMarkdownEnabled?: boolean;
 isPasteAsTextFileEnabled?: boolean;
 isSystemAudioRecordingEnabled?: boolean;
 customShortcuts: Record<string, string>; // ID -> Key Combination String
}