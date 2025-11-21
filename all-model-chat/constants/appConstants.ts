
import { AppSettings } from '../types';
// Re-exporting from new modules
export * from './modelConstants';
export * from './promptConstants';

export const APP_LOGO_SVG_DATA_URI = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiBmaWxsPSJub25lIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcng9IjIwIiBmaWxsPSIjMWYyOTM3Ii8+PHBhdGggZD0iTTUwIDIwTDYwIDQwTDgwIDUwTDYwIDYwTDUwIDgwTDQwIDYwTDIwIDUwTDQwIDQwTDUwIDIwWiIgZmlsbD0idXJsKCNwYWludDBfbGluZWFyKSIvPjxkZWZzPjxsaW5lYXJHcmFkaWVudCBpZD0icGFpbnQwX2xpbmVhciIgeDE9IjIwIiB5MT0iMjAiIHgyPSI4MCIgeTI9IjgwIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHN0b3Agc3RvcC1jb2xvcj0iIzM4QkRGOCIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzM0RDM5OSIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjwvc3ZnPg==';

// Import specific constants needed to build the default objects
import { 
    DEFAULT_MODEL_ID,
    DEFAULT_TEMPERATURE,
    DEFAULT_TOP_P,
    DEFAULT_SHOW_THOUGHTS,
    DEFAULT_TTS_VOICE,
    DEFAULT_THINKING_BUDGET,
    DEFAULT_THINKING_LEVEL,
    DEFAULT_TRANSCRIPTION_MODEL_ID,
    DEFAULT_TRANSCRIPTION_THINKING_ENABLED
} from './modelConstants';
import { DEFAULT_SYSTEM_INSTRUCTION } from './promptConstants';

// Define constants that are truly app-level
export const DEFAULT_IS_STREAMING_ENABLED = true; 
export const DEFAULT_BASE_FONT_SIZE = 16; 

// localStorage keys
export const APP_SETTINGS_KEY = 'chatAppSettings';
export const PRELOADED_SCENARIO_KEY = 'chatPreloadedScenario';
export const CHAT_HISTORY_SESSIONS_KEY = 'chatHistorySessions';
export const CHAT_HISTORY_GROUPS_KEY = 'chatHistoryGroups';
export const ACTIVE_CHAT_SESSION_ID_KEY = 'activeChatSessionId';
export const API_KEY_LAST_USED_INDEX_KEY = 'chatApiKeyLastUsedIndex';

// Composite default objects
export const DEFAULT_CHAT_SETTINGS = {
  modelId: DEFAULT_MODEL_ID,
  temperature: DEFAULT_TEMPERATURE,
  topP: DEFAULT_TOP_P,
  showThoughts: DEFAULT_SHOW_THOUGHTS,
  systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
  ttsVoice: DEFAULT_TTS_VOICE,
  thinkingBudget: DEFAULT_THINKING_BUDGET,
  thinkingLevel: DEFAULT_THINKING_LEVEL,
  lockedApiKey: null,
  isGoogleSearchEnabled: false,
  isCodeExecutionEnabled: false,
  isUrlContextEnabled: false,
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  ...DEFAULT_CHAT_SETTINGS,
  themeId: 'pearl', 
  baseFontSize: DEFAULT_BASE_FONT_SIZE,
  useCustomApiConfig: false,
  apiKey: null,
  apiProxyUrl: 'https://api-proxy.me/gemini',
  useApiProxy: false,
  language: 'system',
  isStreamingEnabled: DEFAULT_IS_STREAMING_ENABLED,
  transcriptionModelId: DEFAULT_TRANSCRIPTION_MODEL_ID,
  isTranscriptionThinkingEnabled: DEFAULT_TRANSCRIPTION_THINKING_ENABLED,
  useFilesApiForImages: false,
  expandCodeBlocksByDefault: false,
  isAutoTitleEnabled: true,
  isMermaidRenderingEnabled: true,
  isGraphvizRenderingEnabled: true,
  isCompletionNotificationEnabled: false,
  isSuggestionsEnabled: true,
  isAutoScrollOnSendEnabled: true,
  isAutoSendOnSuggestionClick: true,
  generateQuadImages: false,
  autoFullscreenHtml: true,
};
