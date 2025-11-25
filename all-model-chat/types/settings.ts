
import { ThemeColors } from '../constants/themeConstants';

export interface ModelOption {
  id: string;
  name: string;
  isPinned?: boolean;
}

export interface ChatSettings {
  modelId: string;
  temperature: number;
  topP: number;
  showThoughts: boolean;
  systemInstruction: string;
  ttsVoice: string;
  thinkingBudget: number;
  thinkingLevel?: 'LOW' | 'HIGH'; // New for Gemini 3.0
  lockedApiKey?: string | null;
  isGoogleSearchEnabled?: boolean;
  isCodeExecutionEnabled?: boolean;
  isUrlContextEnabled?: boolean;
  isDeepSearchEnabled?: boolean;
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
 isTranscriptionThinkingEnabled: boolean;
 useFilesApiForImages: boolean;
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
}
