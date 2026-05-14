import { type AppSettings, type FilesApiConfig, type ModelOption, type TranslationTargetLanguage } from '@/types';
import { HarmCategory, HarmBlockThreshold, type SafetySetting, MediaResolution } from '@/types/settings';

export * from './modelConstants';
export * from './shortcuts';
export * from './storageKeys';
export * from './styleClasses';

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
  DEFAULT_THOUGHT_TRANSLATION_MODEL_ID,
} from './modelConstants';
import { getRuntimeConfigAppSettingsOverrides } from '@/runtime/runtimeConfig';
import { DEFAULT_OPENAI_COMPATIBLE_BASE_URL } from '@/utils/apiProxyUrl';
import { createEmptyLiveArtifactsSystemPrompts } from '@/utils/liveArtifactsPromptSettings';

const DEFAULT_IS_STREAMING_ENABLED = true;
const DEFAULT_BASE_FONT_SIZE = 16;
const DEFAULT_IS_AUDIO_COMPRESSION_ENABLED = true;
const DEFAULT_IS_OPENAI_COMPATIBLE_API_ENABLED = false;
const DEFAULT_TRANSLATION_TARGET_LANGUAGE: TranslationTargetLanguage = 'English';
const DEFAULT_THOUGHT_TRANSLATION_TARGET_LANGUAGE: TranslationTargetLanguage = 'Simplified Chinese';
const DEFAULT_OPENAI_COMPATIBLE_MODEL_ID = 'gpt-5.5';
const DEFAULT_OPENAI_COMPATIBLE_MODELS: ModelOption[] = [
  { id: DEFAULT_OPENAI_COMPATIBLE_MODEL_ID, name: 'GPT-5.5', isPinned: true },
];

export const TRANSLATION_TARGET_LANGUAGE_OPTIONS: Array<{
  value: TranslationTargetLanguage;
  labelKey: string;
}> = [
  { value: 'English', labelKey: 'translationTargetLanguage_english' },
  { value: 'Simplified Chinese', labelKey: 'translationTargetLanguage_simplifiedChinese' },
  { value: 'Traditional Chinese', labelKey: 'translationTargetLanguage_traditionalChinese' },
  { value: 'Japanese', labelKey: 'translationTargetLanguage_japanese' },
  { value: 'Korean', labelKey: 'translationTargetLanguage_korean' },
  { value: 'Spanish', labelKey: 'translationTargetLanguage_spanish' },
  { value: 'French', labelKey: 'translationTargetLanguage_french' },
  { value: 'German', labelKey: 'translationTargetLanguage_german' },
];

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
  apiMode: 'gemini-native',
  isOpenAICompatibleApiEnabled: DEFAULT_IS_OPENAI_COMPATIBLE_API_ENABLED,
  useCustomApiConfig: false,
  serverManagedApi: false,
  apiKey: null,
  apiProxyUrl: 'https://api-proxy.de/gemini',
  openaiCompatibleApiKey: null,
  openaiCompatibleBaseUrl: DEFAULT_OPENAI_COMPATIBLE_BASE_URL,
  openaiCompatibleModelId: DEFAULT_OPENAI_COMPATIBLE_MODEL_ID,
  openaiCompatibleModels: DEFAULT_OPENAI_COMPATIBLE_MODELS,
  useApiProxy: false,
  language: 'system',
  translationTargetLanguage: DEFAULT_TRANSLATION_TARGET_LANGUAGE,
  inputTranslationModelId: DEFAULT_THOUGHT_TRANSLATION_MODEL_ID,
  thoughtTranslationTargetLanguage: DEFAULT_THOUGHT_TRANSLATION_TARGET_LANGUAGE,
  thoughtTranslationModelId: DEFAULT_THOUGHT_TRANSLATION_MODEL_ID,
  showInputTranslationButton: false,
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
  liveArtifactsPromptMode: 'inline',
  liveArtifactsSystemPrompt: '',
  liveArtifactsSystemPrompts: createEmptyLiveArtifactsSystemPrompts(),
  isPasteRichTextAsMarkdownEnabled: true,
  isPasteAsTextFileEnabled: true,
  showInputPasteButton: true,
  showInputClearButton: true,
  isCopySelectionFormattingEnabled: true,
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
  {
    titleKey: 'suggestion_html_title',
    descKey: 'suggestion_html_desc',
    shortKey: 'suggestion_html_short',
    specialAction: 'organize',
    icon: 'AppWindow',
  },
  {
    titleKey: 'suggestion_translate_title',
    descKey: 'suggestion_translate_desc',
    shortKey: 'suggestion_translate_short',
    icon: 'Languages',
  },
  {
    titleKey: 'suggestion_ocr_title',
    descKey: 'suggestion_ocr_desc',
    shortKey: 'suggestion_ocr_short',
    icon: 'ScanText',
  },
  {
    titleKey: 'suggestion_asr_title',
    descKey: 'suggestion_asr_desc',
    shortKey: 'suggestion_asr_short',
    icon: 'AudioWaveform',
  },
  {
    titleKey: 'suggestion_srt_title',
    descKey: 'suggestion_srt_desc',
    shortKey: 'suggestion_srt_short',
    icon: 'Captions',
  },
  {
    titleKey: 'suggestion_explain_title',
    descKey: 'suggestion_explain_desc',
    shortKey: 'suggestion_explain_short',
    icon: 'Lightbulb',
  },
  {
    titleKey: 'suggestion_summarize_title',
    descKey: 'suggestion_summarize_desc',
    shortKey: 'suggestion_summarize_short',
    icon: 'FileText',
  },
];
