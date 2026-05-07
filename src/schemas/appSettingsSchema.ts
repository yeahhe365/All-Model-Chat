import { z } from 'zod';
import { DEFAULT_APP_SETTINGS } from '../constants/appConstants';
import type { AppSettings, FilesApiConfig, ModelOption, SafetySetting } from '../types';
import {
  HarmBlockThreshold,
  HarmCategory,
  MediaResolution,
  type ApiMode,
  type TranslationTargetLanguage,
} from '../types/settings';

const THEME_IDS = ['system', 'onyx', 'pearl'] as const;
const LANGUAGE_IDS = ['en', 'zh', 'system'] as const;
const THINKING_LEVELS = ['MINIMAL', 'LOW', 'MEDIUM', 'HIGH'] as const;
const API_MODES = ['gemini-native', 'openai-compatible'] as const;
const TRANSLATION_TARGET_LANGUAGES = [
  'English',
  'Simplified Chinese',
  'Traditional Chinese',
  'Japanese',
  'Korean',
  'Spanish',
  'French',
  'German',
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const withDefault = <Output>(schema: z.ZodType<Output>, fallback: Output): z.ZodType<Output> =>
  z.unknown().optional().transform((value) => {
    if (value === undefined) {
      return fallback;
    }

    const parsed = schema.safeParse(value);
    return parsed.success ? parsed.data : fallback;
  });

const optionalWithDefault = <Output>(
  schema: z.ZodType<Output>,
  fallback: Output | undefined,
): z.ZodType<Output | undefined> =>
  z.unknown().optional().transform((value) => {
    if (value === undefined) {
      return fallback;
    }

    const parsed = schema.safeParse(value);
    return parsed.success ? parsed.data : fallback;
  });

const nullableStringWithDefault = (fallback: string | null) => z.string().nullable().default(fallback).catch(fallback);

const booleanWithDefault = (fallback: boolean) => withDefault(z.boolean(), fallback);
const optionalBooleanWithDefault = (fallback: boolean | undefined) => optionalWithDefault(z.boolean(), fallback);
const numberWithDefault = (fallback: number) => withDefault(z.number().finite(), fallback);
const stringWithDefault = (fallback: string) => withDefault(z.string(), fallback);
const optionalStringWithDefault = (fallback: string | undefined) => optionalWithDefault(z.string(), fallback);

const modelOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  isPinned: z.boolean().optional(),
  apiMode: z.enum(API_MODES).optional(),
});

const sanitizeModelOptions = (value: unknown, fallback: ModelOption[]): ModelOption[] => {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const modelOptions = value.flatMap((item) => {
    const parsed = modelOptionSchema.safeParse(item);
    return parsed.success ? [parsed.data as ModelOption] : [];
  });

  return modelOptions.length > 0 ? modelOptions : fallback;
};

const filesApiConfigSchema: z.ZodType<FilesApiConfig> = z
  .object({
    images: booleanWithDefault(DEFAULT_APP_SETTINGS.filesApiConfig.images),
    pdfs: booleanWithDefault(DEFAULT_APP_SETTINGS.filesApiConfig.pdfs),
    audio: booleanWithDefault(DEFAULT_APP_SETTINGS.filesApiConfig.audio),
    video: booleanWithDefault(DEFAULT_APP_SETTINGS.filesApiConfig.video),
    text: booleanWithDefault(DEFAULT_APP_SETTINGS.filesApiConfig.text),
  })
  .default(DEFAULT_APP_SETTINGS.filesApiConfig)
  .catch(DEFAULT_APP_SETTINGS.filesApiConfig);

const safetySettingSchema = z.object({
  category: z.nativeEnum(HarmCategory),
  threshold: z.nativeEnum(HarmBlockThreshold),
});

const sanitizeSafetySettings = (value: unknown, fallback: SafetySetting[] | undefined): SafetySetting[] | undefined => {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const settings = value.flatMap((item) => {
    const parsed = safetySettingSchema.safeParse(item);
    return parsed.success ? [parsed.data as SafetySetting] : [];
  });

  return settings.length > 0 ? settings : fallback;
};

const sanitizeCustomShortcuts = (value: unknown, fallback: Record<string, string>): Record<string, string> => {
  if (!isRecord(value)) {
    return fallback;
  }

  const shortcuts = Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  );

  return shortcuts;
};

const sanitizeTabModelCycleIds = (value: unknown, fallback: string[] | undefined): string[] | undefined => {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const seenIds = new Set<string>();
  const ids = value.reduce<string[]>((nextIds, item) => {
    if (typeof item !== 'string') {
      return nextIds;
    }

    const normalizedId = item.trim();
    if (!normalizedId || seenIds.has(normalizedId)) {
      return nextIds;
    }

    seenIds.add(normalizedId);
    nextIds.push(normalizedId);
    return nextIds;
  }, []);

  return ids.length > 0 ? ids : fallback;
};

const appSettingsSchema: z.ZodType<AppSettings> = z.object({
  modelId: stringWithDefault(DEFAULT_APP_SETTINGS.modelId),
  temperature: numberWithDefault(DEFAULT_APP_SETTINGS.temperature),
  topP: numberWithDefault(DEFAULT_APP_SETTINGS.topP),
  topK: numberWithDefault(DEFAULT_APP_SETTINGS.topK),
  showThoughts: booleanWithDefault(DEFAULT_APP_SETTINGS.showThoughts),
  systemInstruction: stringWithDefault(DEFAULT_APP_SETTINGS.systemInstruction),
  ttsVoice: stringWithDefault(DEFAULT_APP_SETTINGS.ttsVoice),
  thinkingBudget: numberWithDefault(DEFAULT_APP_SETTINGS.thinkingBudget),
  thinkingLevel: optionalWithDefault(z.enum(THINKING_LEVELS), DEFAULT_APP_SETTINGS.thinkingLevel),
  lockedApiKey: nullableStringWithDefault(DEFAULT_APP_SETTINGS.lockedApiKey ?? null),
  isGoogleSearchEnabled: optionalBooleanWithDefault(DEFAULT_APP_SETTINGS.isGoogleSearchEnabled),
  isCodeExecutionEnabled: optionalBooleanWithDefault(DEFAULT_APP_SETTINGS.isCodeExecutionEnabled),
  isLocalPythonEnabled: optionalBooleanWithDefault(DEFAULT_APP_SETTINGS.isLocalPythonEnabled),
  isUrlContextEnabled: optionalBooleanWithDefault(DEFAULT_APP_SETTINGS.isUrlContextEnabled),
  isDeepSearchEnabled: optionalBooleanWithDefault(DEFAULT_APP_SETTINGS.isDeepSearchEnabled),
  isRawModeEnabled: optionalBooleanWithDefault(DEFAULT_APP_SETTINGS.isRawModeEnabled),
  hideThinkingInContext: optionalBooleanWithDefault(DEFAULT_APP_SETTINGS.hideThinkingInContext),
  safetySettings: z
    .unknown()
    .optional()
    .transform((value) => sanitizeSafetySettings(value, DEFAULT_APP_SETTINGS.safetySettings)),
  mediaResolution: optionalWithDefault(z.nativeEnum(MediaResolution), DEFAULT_APP_SETTINGS.mediaResolution),
  themeId: withDefault(z.enum(THEME_IDS), DEFAULT_APP_SETTINGS.themeId),
  baseFontSize: numberWithDefault(DEFAULT_APP_SETTINGS.baseFontSize),
  apiMode: withDefault(z.enum(API_MODES), DEFAULT_APP_SETTINGS.apiMode as ApiMode),
  isOpenAICompatibleApiEnabled: booleanWithDefault(DEFAULT_APP_SETTINGS.isOpenAICompatibleApiEnabled ?? false),
  useCustomApiConfig: booleanWithDefault(DEFAULT_APP_SETTINGS.useCustomApiConfig),
  serverManagedApi: optionalBooleanWithDefault(DEFAULT_APP_SETTINGS.serverManagedApi),
  apiKey: nullableStringWithDefault(DEFAULT_APP_SETTINGS.apiKey),
  apiProxyUrl: nullableStringWithDefault(DEFAULT_APP_SETTINGS.apiProxyUrl),
  openaiCompatibleApiKey: nullableStringWithDefault(DEFAULT_APP_SETTINGS.openaiCompatibleApiKey),
  openaiCompatibleBaseUrl: nullableStringWithDefault(DEFAULT_APP_SETTINGS.openaiCompatibleBaseUrl),
  openaiCompatibleModelId: stringWithDefault(DEFAULT_APP_SETTINGS.openaiCompatibleModelId),
  openaiCompatibleModels: z
    .unknown()
    .optional()
    .transform((value) => sanitizeModelOptions(value, DEFAULT_APP_SETTINGS.openaiCompatibleModels))
    .default(DEFAULT_APP_SETTINGS.openaiCompatibleModels),
  useApiProxy: optionalBooleanWithDefault(DEFAULT_APP_SETTINGS.useApiProxy),
  language: withDefault(z.enum(LANGUAGE_IDS), DEFAULT_APP_SETTINGS.language),
  translationTargetLanguage: withDefault(
    z.enum(TRANSLATION_TARGET_LANGUAGES),
    DEFAULT_APP_SETTINGS.translationTargetLanguage as TranslationTargetLanguage,
  ),
  inputTranslationModelId: optionalStringWithDefault(DEFAULT_APP_SETTINGS.inputTranslationModelId),
  thoughtTranslationTargetLanguage: optionalWithDefault(
    z.enum(TRANSLATION_TARGET_LANGUAGES),
    DEFAULT_APP_SETTINGS.thoughtTranslationTargetLanguage,
  ),
  thoughtTranslationModelId: optionalStringWithDefault(DEFAULT_APP_SETTINGS.thoughtTranslationModelId),
  showInputTranslationButton: optionalBooleanWithDefault(DEFAULT_APP_SETTINGS.showInputTranslationButton),
  isStreamingEnabled: booleanWithDefault(DEFAULT_APP_SETTINGS.isStreamingEnabled),
  transcriptionModelId: stringWithDefault(DEFAULT_APP_SETTINGS.transcriptionModelId),
  filesApiConfig: filesApiConfigSchema,
  expandCodeBlocksByDefault: booleanWithDefault(DEFAULT_APP_SETTINGS.expandCodeBlocksByDefault),
  isAutoTitleEnabled: booleanWithDefault(DEFAULT_APP_SETTINGS.isAutoTitleEnabled),
  isMermaidRenderingEnabled: booleanWithDefault(DEFAULT_APP_SETTINGS.isMermaidRenderingEnabled),
  isGraphvizRenderingEnabled: optionalBooleanWithDefault(DEFAULT_APP_SETTINGS.isGraphvizRenderingEnabled),
  isCompletionNotificationEnabled: booleanWithDefault(DEFAULT_APP_SETTINGS.isCompletionNotificationEnabled),
  isCompletionSoundEnabled: optionalBooleanWithDefault(DEFAULT_APP_SETTINGS.isCompletionSoundEnabled),
  isSuggestionsEnabled: booleanWithDefault(DEFAULT_APP_SETTINGS.isSuggestionsEnabled),
  isAutoScrollOnSendEnabled: optionalBooleanWithDefault(DEFAULT_APP_SETTINGS.isAutoScrollOnSendEnabled),
  isAutoSendOnSuggestionClick: optionalBooleanWithDefault(DEFAULT_APP_SETTINGS.isAutoSendOnSuggestionClick),
  generateQuadImages: optionalBooleanWithDefault(DEFAULT_APP_SETTINGS.generateQuadImages),
  autoFullscreenHtml: optionalBooleanWithDefault(DEFAULT_APP_SETTINGS.autoFullscreenHtml),
  showWelcomeSuggestions: optionalBooleanWithDefault(DEFAULT_APP_SETTINGS.showWelcomeSuggestions),
  isAudioCompressionEnabled: booleanWithDefault(DEFAULT_APP_SETTINGS.isAudioCompressionEnabled),
  autoCanvasVisualization: optionalBooleanWithDefault(DEFAULT_APP_SETTINGS.autoCanvasVisualization),
  autoCanvasModelId: stringWithDefault(DEFAULT_APP_SETTINGS.autoCanvasModelId),
  isPasteRichTextAsMarkdownEnabled: optionalBooleanWithDefault(DEFAULT_APP_SETTINGS.isPasteRichTextAsMarkdownEnabled),
  isPasteAsTextFileEnabled: optionalBooleanWithDefault(DEFAULT_APP_SETTINGS.isPasteAsTextFileEnabled),
  showInputPasteButton: optionalBooleanWithDefault(DEFAULT_APP_SETTINGS.showInputPasteButton),
  showInputClearButton: optionalBooleanWithDefault(DEFAULT_APP_SETTINGS.showInputClearButton),
  isCopySelectionFormattingEnabled: optionalBooleanWithDefault(DEFAULT_APP_SETTINGS.isCopySelectionFormattingEnabled),
  isSystemAudioRecordingEnabled: optionalBooleanWithDefault(DEFAULT_APP_SETTINGS.isSystemAudioRecordingEnabled),
  customShortcuts: z
    .unknown()
    .optional()
    .transform((value) => sanitizeCustomShortcuts(value, DEFAULT_APP_SETTINGS.customShortcuts))
    .default(DEFAULT_APP_SETTINGS.customShortcuts),
  tabModelCycleIds: z
    .unknown()
    .optional()
    .transform((value) => sanitizeTabModelCycleIds(value, DEFAULT_APP_SETTINGS.tabModelCycleIds)),
});

const coerceDisabledOpenAICompatibleMode = (settings: AppSettings): AppSettings => ({
  ...settings,
  apiMode: settings.isOpenAICompatibleApiEnabled ? settings.apiMode : 'gemini-native',
});

export const sanitizeImportedAppSettings = (value: unknown): AppSettings =>
  coerceDisabledOpenAICompatibleMode(appSettingsSchema.parse(isRecord(value) ? value : {}));
