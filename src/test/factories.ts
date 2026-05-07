import type { AppSettings, ChatMessage, ChatSettings, SavedChatSession, Theme, UploadedFile } from '../types';
import { MediaResolution } from '../types';
import { AVAILABLE_THEMES } from '../constants/themeConstants';

export const createChatSettings = (overrides: Partial<ChatSettings> = {}): ChatSettings => ({
  modelId: 'gemini-3.1-pro-preview',
  temperature: 1,
  topP: 1,
  topK: 1,
  showThoughts: false,
  systemInstruction: '',
  ttsVoice: 'Aoede',
  thinkingBudget: 0,
  thinkingLevel: 'MEDIUM',
  lockedApiKey: null,
  isGoogleSearchEnabled: false,
  isCodeExecutionEnabled: false,
  isLocalPythonEnabled: false,
  isUrlContextEnabled: false,
  isDeepSearchEnabled: false,
  isRawModeEnabled: false,
  hideThinkingInContext: false,
  safetySettings: [],
  mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,
  ...overrides,
});

export const createAppSettings = (overrides: Partial<AppSettings> = {}): AppSettings => ({
  ...createChatSettings(),
  themeId: 'pearl',
  baseFontSize: 14,
  apiMode: 'gemini-native',
  isOpenAICompatibleApiEnabled: false,
  useCustomApiConfig: false,
  apiKey: 'api-key',
  apiProxyUrl: null,
  openaiCompatibleApiKey: null,
  openaiCompatibleBaseUrl: null,
  openaiCompatibleModelId: '',
  openaiCompatibleModels: [],
  language: 'en',
  translationTargetLanguage: 'English',
  isStreamingEnabled: true,
  transcriptionModelId: 'gemini-2.5-flash',
  filesApiConfig: {
    images: true,
    pdfs: true,
    audio: true,
    video: true,
    text: true,
  },
  expandCodeBlocksByDefault: false,
  isAutoTitleEnabled: true,
  isMermaidRenderingEnabled: true,
  isGraphvizRenderingEnabled: true,
  isCompletionNotificationEnabled: false,
  isCompletionSoundEnabled: false,
  isSuggestionsEnabled: true,
  isAutoScrollOnSendEnabled: true,
  generateQuadImages: false,
  isAudioCompressionEnabled: false,
  autoCanvasVisualization: false,
  autoCanvasModelId: 'gemini-3.1-pro-preview',
  isPasteRichTextAsMarkdownEnabled: true,
  isSystemAudioRecordingEnabled: false,
  customShortcuts: {},
  ...overrides,
});

export const createUploadedFile = (overrides: Partial<UploadedFile> = {}): UploadedFile => ({
  id: 'file-1',
  name: 'attachment.png',
  type: 'image/png',
  size: 123,
  uploadState: 'active',
  ...overrides,
});

export const createChatMessage = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 'message-1',
  role: 'user',
  content: 'hello',
  timestamp: new Date('2026-04-12T00:00:00.000Z'),
  ...overrides,
});

export const createSavedChatSession = (overrides: Partial<SavedChatSession> = {}): SavedChatSession => ({
  id: 'session-1',
  title: 'Session',
  timestamp: new Date('2026-04-12T00:00:00.000Z').getTime(),
  messages: [createChatMessage()],
  settings: createChatSettings(),
  ...overrides,
});

export const createTheme = (overrides: Partial<Theme> = {}): Theme => ({
  ...AVAILABLE_THEMES.find((theme) => theme.id === 'pearl')!,
  ...overrides,
});
