
import { AppSettings, FilesApiConfig } from '../types';
import { HarmCategory, HarmBlockThreshold, SafetySetting } from '../types/settings';

// Re-exporting from new modules
export * from './modelConstants';
export * from './promptConstants';

export const APP_LOGO_SVG_DATA_URI = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9Ii0xNSAxOCAxOTUgNzUiPjxkZWZzPjxsaW5lYXJHcmFkaWVudCBpZD0iZyIgeDE9IjAlIiB5MT0iMCUiIHgyPSIwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiMwMGZmZmYiIHN0b3Atb3BhY2l0eT0iMSIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2FhMDBmZiIgc3RvcC1vcGFjaXR5PSIxIi8+PC9saW5lYXJHcmFkaWVudD48bWFzayBpZD0ibSI+PHJlY3QgeD0iLTUwIiB5PSIwIiB3aWR0aD0iMzUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0id2hpdGUiLz48cmVjdCB4PSItNTAiIHk9IjQ1IiB3aWR0aD0iMzUwIiBoZWlnaHQ9IjQiIGZpbGw9ImJsYWNrIi8+PHJlY3QgeD0iLTUwIiB5PSI2MCIgd2lkdGg9IjM1MCIgaGVpZ2h0PSIyIiBmaWxsPSJibGFjayIvPjxyZWN0IHg9IjM2IiB5PSI1NSIgd2lkdGg9IjgiIGhlaWdodD0iOCIgZmlsbD0iYmxhY2siLz48L21hc2s+PC9kZWZzPjxnIHRyYW5zZm9ybT0ic2tld1goLTE1KSI+PGcgbWFNrPSJ1cmwoI20pIiBmaWxsPSJ1cmwoI2cpIj48cGF0aCBkPSJNMjAsODAgTDQwLDIwIEw2MCw4MCBMNDgsODAgTDQ0LDY4IEwzNiw2OCBMMzIsODAgWiIvPjxwYXRoIGQ9Ik03MCw4MCBMNzAsMjAgTDg1LDIwIEw9NSw1MCBMMTA1LDIwIEwxMjAsMjAgTDEyMCw4MCBMMTEwLDgwIEwxMTAsNDAgTDk4LDcwIEw5Miw3MCBMODAsNDAgTDgwLDgwIFoiLz48cGF0aCBkPSJNMTY1LDI1IEwxNDAsMjUgTDEzNSw0MCBMMTM1LDY1IEwxNDAsODAgTDE2NSw4MCBMMTY1LDcwIEwxNDUsNzAgTDE0NSwzNSBMMTY1LDM1IFoiLz48L2c+PHJlY3QgeD0iMTcwIiB5PSIyMCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjMDBmZmZmIi8+PHJlY3QgeD0iMTAiIHk9Ijg1IiB3aWR0aD0iMjAiIGhlaWdodD0iMyIgZmlsbD0iIzAwZmZmZiIvPjwvZz48L3N2Zz4=';

// Import specific constants needed to build the default objects
import { 
    DEFAULT_MODEL_ID,
    DEFAULT_TEMPERATURE,
    DEFAULT_TOP_P,
    DEFAULT_SHOW_THOUGHTS,
    DEFAULT_TTS_VOICE,
    DEFAULT_THINKING_BUDGET,
    DEFAULT_THINKING_LEVEL,
    DEFAULT_TRANSCRIPTION_MODEL_ID
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

// Shared UI Styles
export const MESSAGE_BLOCK_BUTTON_CLASS = "p-1.5 rounded-md text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)]/50 transition-all duration-200 focus:outline-none opacity-70 hover:opacity-100";
export const CHAT_INPUT_BUTTON_CLASS = "h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:visible:ring-2 focus:visible:ring-[var(--theme-border-focus)] focus:visible:ring-offset-2 focus:visible:ring-offset-[var(--theme-bg-input)]";
export const SETTINGS_INPUT_CLASS = "bg-[var(--theme-bg-input)] border-[var(--theme-border-secondary)] focus:border-[var(--theme-border-focus)] focus:ring-[var(--theme-border-focus)]/20 text-[var(--theme-text-primary)] placeholder-[var(--theme-text-tertiary)]";

export const DEFAULT_SAFETY_SETTINGS: SafetySetting[] = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_NONE },
];

export const DEFAULT_FILES_API_CONFIG: FilesApiConfig = {
    images: false,
    pdfs: true,
    audio: true,
    video: true,
    text: false,
};

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
  isDeepSearchEnabled: false,
  safetySettings: DEFAULT_SAFETY_SETTINGS,
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  ...DEFAULT_CHAT_SETTINGS,
  themeId: 'pearl', 
  baseFontSize: DEFAULT_BASE_FONT_SIZE,
  useCustomApiConfig: false,
  apiKey: null,
  apiProxyUrl: "https://api-proxy.de/gemini/v1beta",
  useApiProxy: false,
  language: 'system',
  isStreamingEnabled: DEFAULT_IS_STREAMING_ENABLED,
  transcriptionModelId: DEFAULT_TRANSCRIPTION_MODEL_ID,
  filesApiConfig: DEFAULT_FILES_API_CONFIG,
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
  showWelcomeSuggestions: true,
};

export const SUGGESTIONS_KEYS = [
  { titleKey: 'suggestion_organize_title', descKey: 'suggestion_organize_desc', shortKey: 'suggestion_organize_short', specialAction: 'organize', icon: 'Layers' },
  { titleKey: 'suggestion_translate_title', descKey: 'suggestion_translate_desc', shortKey: 'suggestion_translate_short', icon: 'Languages' },
  { titleKey: 'suggestion_ocr_title', descKey: 'suggestion_ocr_desc', shortKey: 'suggestion_ocr_short', icon: 'ScanText' }, 
  { titleKey: 'suggestion_asr_title', descKey: 'suggestion_asr_desc', shortKey: 'suggestion_asr_short', icon: 'AudioWaveform' },
  { titleKey: 'suggestion_srt_title', descKey: 'suggestion_srt_desc', shortKey: 'suggestion_srt_short', icon: 'Captions' },
  { titleKey: 'suggestion_explain_title', descKey: 'suggestion_explain_desc', shortKey: 'suggestion_explain_short', icon: 'Lightbulb' },
  { titleKey: 'suggestion_summarize_title', descKey: 'suggestion_summarize_desc', shortKey: 'suggestion_summarize_short', icon: 'FileText' },
];
