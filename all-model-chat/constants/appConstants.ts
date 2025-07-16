import { AppSettings } from '../types';
// Re-exporting from new modules
export * from './modelConstants';
export * from './promptConstants';

// Import specific constants needed to build the default objects
import { 
    DEFAULT_MODEL_ID,
    DEFAULT_TEMPERATURE,
    DEFAULT_TOP_P,
    DEFAULT_SHOW_THOUGHTS,
    DEFAULT_TTS_VOICE,
    DEFAULT_THINKING_BUDGET,
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
  lockedApiKey: null,
  isGoogleSearchEnabled: false,
  isCodeExecutionEnabled: false,
  isUrlContextEnabled: false,
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  ...DEFAULT_CHAT_SETTINGS,
  themeId: 'pearl', // Corresponds to DEFAULT_THEME_ID from themeConstants
  baseFontSize: DEFAULT_BASE_FONT_SIZE,
  useCustomApiConfig: false,
  apiKey: null,
  apiProxyUrl: null,
  language: 'system',
  isStreamingEnabled: DEFAULT_IS_STREAMING_ENABLED,
  transcriptionModelId: DEFAULT_TRANSCRIPTION_MODEL_ID,
  isTranscriptionThinkingEnabled: DEFAULT_TRANSCRIPTION_THINKING_ENABLED,
  useFilesApiForImages: false,
  expandCodeBlocksByDefault: false,
  isAutoTitleEnabled: true,
};