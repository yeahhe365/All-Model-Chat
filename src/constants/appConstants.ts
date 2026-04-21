import { AppSettings, FilesApiConfig } from '../types';
import { HarmCategory, HarmBlockThreshold, SafetySetting, MediaResolution } from '../types/settings';

export * from './modelConstants';
export * from './promptConstants';
export * from './shortcuts';

export const DEFAULT_SYSTEM_INSTRUCTION = '';

import {
    DEFAULT_MODEL_ID,
    DEFAULT_TEMPERATURE,
    DEFAULT_TOP_P,
    DEFAULT_TOP_K,
    DEFAULT_SHOW_THOUGHTS,
    DEFAULT_TTS_VOICE,
    DEFAULT_THINKING_BUDGET,
    DEFAULT_THINKING_LEVEL,
    DEFAULT_TRANSCRIPTION_MODEL_ID,
    DEFAULT_AUTO_CANVAS_MODEL_ID,
} from './modelConstants';
import { getRuntimeConfigAppSettingsOverrides } from '../runtime/runtimeConfig';

const DEFAULT_IS_STREAMING_ENABLED = true;
const DEFAULT_BASE_FONT_SIZE = 16;
const DEFAULT_IS_AUDIO_COMPRESSION_ENABLED = true;

export const ACTIVE_CHAT_SESSION_ID_KEY = 'activeChatSessionId';
export const API_KEY_LAST_USED_INDEX_KEY = 'chatApiKeyLastUsedIndex';
export const CREATE_TEXT_FILE_EDITOR_LAST_EXTENSION_KEY = 'createTextFileEditorLastExtension';

export const MESSAGE_BLOCK_BUTTON_CLASS = "p-1.5 rounded-md text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)]/50 transition-all duration-200 focus:outline-none opacity-70 hover:opacity-100";
export const CHAT_INPUT_BUTTON_CLASS = "h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme-bg-input)] p-0 m-0 border-0 leading-none active:scale-90 hover:scale-105";
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

const DEFAULT_MEDIA_RESOLUTION = MediaResolution.MEDIA_RESOLUTION_UNSPECIFIED;

export const DEFAULT_CHAT_SETTINGS = {
    modelId: DEFAULT_MODEL_ID,
    temperature: DEFAULT_TEMPERATURE,
    topP: DEFAULT_TOP_P,
    topK: DEFAULT_TOP_K,
    showThoughts: DEFAULT_SHOW_THOUGHTS,
    systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
    ttsVoice: DEFAULT_TTS_VOICE,
    thinkingBudget: DEFAULT_THINKING_BUDGET,
    thinkingLevel: DEFAULT_THINKING_LEVEL as 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH',
    lockedApiKey: null,
    isGoogleSearchEnabled: false,
    isCodeExecutionEnabled: false,
    isUrlContextEnabled: false,
    isDeepSearchEnabled: false,
    isRawModeEnabled: false,
    hideThinkingInContext: false,
    safetySettings: DEFAULT_SAFETY_SETTINGS,
    mediaResolution: DEFAULT_MEDIA_RESOLUTION,
};

const BASE_DEFAULT_APP_SETTINGS: AppSettings = {
    ...DEFAULT_CHAT_SETTINGS,
    themeId: 'pearl',
    baseFontSize: DEFAULT_BASE_FONT_SIZE,
    useCustomApiConfig: false,
    serverManagedApi: false,
    apiKey: null,
    apiProxyUrl: "https://api-proxy.de/gemini",
    useApiProxy: false,
    liveApiEphemeralTokenEndpoint: null,
    language: 'system',
    isStreamingEnabled: DEFAULT_IS_STREAMING_ENABLED,
    transcriptionModelId: DEFAULT_TRANSCRIPTION_MODEL_ID,
    filesApiConfig: DEFAULT_FILES_API_CONFIG,
    expandCodeBlocksByDefault: false,
    isAutoTitleEnabled: true,
    isMermaidRenderingEnabled: true,
    isGraphvizRenderingEnabled: true,
    isCompletionNotificationEnabled: false,
    isCompletionSoundEnabled: false,
    isSuggestionsEnabled: true,
    isAutoScrollOnSendEnabled: true,
    isAutoSendOnSuggestionClick: true,
    generateQuadImages: false,
    autoFullscreenHtml: true,
    showWelcomeSuggestions: true,
    isAudioCompressionEnabled: DEFAULT_IS_AUDIO_COMPRESSION_ENABLED,
    autoCanvasVisualization: false,
    autoCanvasModelId: DEFAULT_AUTO_CANVAS_MODEL_ID,
    isPasteRichTextAsMarkdownEnabled: true,
    isPasteAsTextFileEnabled: true,
    isSystemAudioRecordingEnabled: false,
    customShortcuts: {},
    tabModelCycleIds: undefined,
};

export function getDefaultAppSettings(): AppSettings {
    return {
        ...BASE_DEFAULT_APP_SETTINGS,
        ...getRuntimeConfigAppSettingsOverrides(),
    };
}

export const DEFAULT_APP_SETTINGS: AppSettings = getDefaultAppSettings();

export const SUGGESTIONS_KEYS = [
    { titleKey: 'suggestion_html_title', descKey: 'suggestion_html_desc', shortKey: 'suggestion_html_short', specialAction: 'organize', icon: 'AppWindow' },
    { titleKey: 'suggestion_translate_title', descKey: 'suggestion_translate_desc', shortKey: 'suggestion_translate_short', icon: 'Languages' },
    { titleKey: 'suggestion_ocr_title', descKey: 'suggestion_ocr_desc', shortKey: 'suggestion_ocr_short', icon: 'ScanText' },
    { titleKey: 'suggestion_asr_title', descKey: 'suggestion_asr_desc', shortKey: 'suggestion_asr_short', icon: 'AudioWaveform' },
    { titleKey: 'suggestion_srt_title', descKey: 'suggestion_srt_desc', shortKey: 'suggestion_srt_short', icon: 'Captions' },
    { titleKey: 'suggestion_explain_title', descKey: 'suggestion_explain_desc', shortKey: 'suggestion_explain_short', icon: 'Lightbulb' },
    { titleKey: 'suggestion_summarize_title', descKey: 'suggestion_summarize_desc', shortKey: 'suggestion_summarize_short', icon: 'FileText' },
];
