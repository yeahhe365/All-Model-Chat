

import { AppSettings, FilesApiConfig } from '../types';
import { HarmCategory, HarmBlockThreshold, SafetySetting, MediaResolution } from '../types/settings';

// Re-exporting from new modules
export * from './modelConstants';
export * from './promptConstants';
export * from './shortcuts';

export const APP_LOGO_SVG_DATA_URI = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9Ii0xNSAxOCAxOCAxOTUgNzUiPjxkZWZzPjxsaW5lYXJHcmFkaWVudCBpZD0iZyIgeDE9IjAlIiB5MT0iMCUiIHgyPSIwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiMwMGZmZmYiIHN0b3Atb3BhY2l0eT0iMSIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2FhMDBmZiIgc3RvcC1vcGFjaXR5PSIxIi8+PC9saW5lYXJHcmFkaWVudD48bWFzayBpZD0ibSI+PHJlY3QgeD0iLTUwIiB5PSIwIiB3aWR0aD0iMzUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0id2hpdGUiLz48cmVjdCB4PSItNTAiIHk9IjQ1IiB3aWR0aD0iMzUwIiBoZWlnaHQ9IjQiIGZpbGw9ImJsYWNrIi8+PHJlY3QgeD0iLTUwIiB5PSI2MCIgd2lkdGg9IjM1MCIgaGVpZ2h0PSIyIiBmaWxsPSJibGFjayIvPjxyZWN0IHg9IjM2IiB5PSI1NSIgd2lkdGg9IjgiIGhlaWdodD0iOCIgZmlsbD0iYmxhY2siLz48L21hc2s+PC9kZWZzPjxnIHRyYW5zZm9ybT0ic2tld1goLTE1KSI+PGcgbWFNrPSJ1cmwoI20pIiBmaWxsPSJ1cmwoI2cpIj48cGF0aCBkPSJNMjAsODAgTDQwLDIwIEw2MCw4MCBMNDgsODAgTDQ0LDY4IEwzNiw2OCBMMzIsODAgWiIvPjxwYXRoIGQ9Ik03MCw4MCBMNzAsMjAgTDg1LDIwIEw9NSw1MCBMMTA1LDIwIEwxMjAsMjAgTDEyMCw4MCBMMTEwLDgwIEwxMTAsNDAgTDk4LDcwIEw5Miw3MCBMODAsNDAgTDgwLDgwIFoiLz48cGF0aCBkPSJNMTY1LDI1IEwxNDAsMjUgTDEzNSw0MCBMMTM1LDY1IEwxNDAsODAgTDE2NSw4MCBMMTY1LDcwIEwxNDUsNzAgTDE0NSwzNSBMMTY1LDM1IFoiLz48L2c+PHJlY3QgeD0iMTcwIiB5PSIyMCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjMDBmZmZmIi8+PHJlY3QgeD0iMTAiIHk9Ijg1IiB3aWR0aD0iMjAiIGhlaWdodD0iMyIgZmlsbD0iIzAwZmZmZiIvPjwvZz48L3N2Zz4=';

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
export const DEFAULT_IS_AUDIO_COMPRESSION_ENABLED = true;

// localStorage keys
export const APP_SETTINGS_KEY = 'chatAppSettings';
export const PRELOADED_SCENARIO_KEY = 'chatPreloadedScenario';
export const CHAT_HISTORY_SESSIONS_KEY = 'chatHistorySessions';
export const CHAT_HISTORY_GROUPS_KEY = 'chatHistoryGroups';
export const ACTIVE_CHAT_SESSION_ID_KEY = 'activeChatSessionId';
export const API_KEY_LAST_USED_INDEX_KEY = 'chatApiKeyLastUsedIndex';

// Shared UI Styles
export const MESSAGE_BLOCK_BUTTON_CLASS = "p-1.5 rounded-md text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)]/50 transition-all duration-200 focus:outline-none opacity-70 hover:opacity-100";
export const CHAT_INPUT_BUTTON_CLASS = "h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme-bg-input)] p-0 m-0 border-0 leading-none";
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

export const DEFAULT_MEDIA_RESOLUTION = MediaResolution.MEDIA_RESOLUTION_UNSPECIFIED;

// Composite default objects
export const DEFAULT_CHAT_SETTINGS = {
  modelId: DEFAULT_MODEL_ID,
  temperature: DEFAULT_TEMPERATURE,
  topP: DEFAULT_TOP_P,
  showThoughts: DEFAULT_SHOW_THOUGHTS,
  systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
  ttsVoice: DEFAULT_TTS_VOICE,
  thinkingBudget: DEFAULT_THINKING_BUDGET,
  thinkingLevel: DEFAULT_THINKING_LEVEL as 'LOW' | 'HIGH',
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
  isAudioCompressionEnabled: DEFAULT_IS_AUDIO_COMPRESSION_ENABLED,
  autoCanvasVisualization: false,
  autoCanvasModelId: 'gemini-3-flash-preview',
  isPasteRichTextAsMarkdownEnabled: true,
  isPasteAsTextFileEnabled: true,
  isSystemAudioRecordingEnabled: false,
  customShortcuts: {}, // Empty object implies using defaults
};

export const SUGGESTIONS_KEYS = [
  { titleKey: 'suggestion_html_title', descKey: 'suggestion_html_desc', shortKey: 'suggestion_html_short', specialAction: 'organize', icon: 'AppWindow' },
  { titleKey: 'suggestion_translate_title', descKey: 'suggestion_translate_desc', shortKey: 'suggestion_translate_short', icon: 'Languages' },
  { titleKey: 'suggestion_ocr_title', descKey: 'suggestion_ocr_desc', shortKey: 'suggestion_ocr_short', icon: 'ScanText' }, 
  { titleKey: 'suggestion_asr_title', descKey: 'suggestion_asr_desc', shortKey: 'suggestion_asr_short', icon: 'AudioWaveform' },
  { titleKey: 'suggestion_srt_title', descKey: 'suggestion_srt_desc', shortKey: 'suggestion_srt_short', icon: 'Captions' },
  { titleKey: 'suggestion_explain_title', descKey: 'suggestion_explain_desc', shortKey: 'suggestion_explain_short', icon: 'Lightbulb' },
  { titleKey: 'suggestion_summarize_title', descKey: 'suggestion_summarize_desc', shortKey: 'suggestion_summarize_short', icon: 'FileText' },
];

export const BBOX_SYSTEM_PROMPT = `**任务：** 请作为一位计算机视觉专家，对这张图片进行通用的目标检测，并利用Python代码生成可视化的标注结果。

**第一步：目标识别与数据结构构建**
请识别图片中所有清晰可见的独立物体、人物、部件或背景元素（细粒度检测）。请构造一个名为 \`detections\` 的列表，列表包含多个字典，每个字典的格式如下：
*   \`'box_2d'\`: 包含4个整数的列表 \`[ymin, xmin, ymax, xmax]\`。**注意：坐标必须归一化到 0-1000 的尺度**（即 0 代表 0%，1000 代表 100%）。
*   \`'label'\`: 字符串，格式为 \`"英文名称 (中文拼音)"\`。

**第二步：可视化绘制 (必须严格复用以下代码逻辑)**
请编写并执行Python代码来绘制检测结果。在绘图函数中，必须包含以下具体的样式和逻辑：

1.  **颜色配置：** 定义颜色列表 \`colors = ['#FF0000', '#0000FF', '#00FF00', '#FFFF00', '#00FFFF', '#FF00FF', '#FFA500', '#800080', '#00FF00', '#FFC0CB', '#FFFFFF']\`。在遍历检测结果时，使用索引取模的方式 \`i % len(colors)\` 循环使用这些颜色。
2.  **坐标转换：** 将检测到的 \`0-1000\` 尺度坐标转换为实际像素坐标：
    *   \`left = xmin * width / 1000\`
    *   \`top = ymin * height / 1000\`
    *   （以此类推右下角坐标）
3.  **边界框样式：** 使用 \`PIL.ImageDraw\` 绘制矩形，线条宽度设为 **4像素** (\`width=4\`)。
4.  **标签样式与可见性优化：**
    *   **字体：** 尝试加载 \`LiberationSans-Bold.ttf\` (大小24)，若失败则使用默认字体。
    *   **文本背景：** 在绘制文字前，必须先绘制一个填充颜色的矩形作为背景（\`text_bbox\`），填充色与边界框颜色一致。
    *   **智能文字颜色：** 为了保证阅读对比度，请应用以下逻辑：
        *   如果背景色是 \`['#FFFF00', '#00FFFF', '#FFFFFF', '#FFC0CB', '#FFA500']\` (即黄、青、白、粉、橙) 之一，文字颜色设为 **黑色 ('black')**。
        *   否则，文字颜色设为 **白色 ('white')**。
    *   **位置：** 标签绘制在边界框的左上角。

**输出要求：**
请直接输出处理后的代码生成的图片文件。`;
