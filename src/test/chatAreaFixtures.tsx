import { act, type ReactNode } from 'react';
import { createTestRenderer, type TestRenderer } from '@/test/testUtils';
import { vi } from 'vitest';
import { ChatAreaProvider, type ChatAreaProviderValue } from '../contexts/ChatAreaContext';
import { I18nProvider } from '../contexts/I18nContext';
import { WindowProvider } from '../contexts/WindowContext';
import type { ChatAreaProps } from '../components/layout/chat-area/ChatAreaProps';
import type { AppSettings, ChatSettings, ChatToolToggleStates } from '../types';
import { MediaResolution } from '../types';

type ChatAreaInputOverrides = Omit<
  Partial<ChatAreaProviderValue['input']>,
  'appSettings' | 'currentChatSettings' | 'toolStates'
> & {
  appSettings?: Partial<AppSettings>;
  currentChatSettings?: Partial<ChatSettings>;
  toolStates?: Partial<ChatToolToggleStates>;
};

interface ChatAreaProviderValueOverrides {
  messageList?: Partial<ChatAreaProviderValue['messageList']>;
  input?: ChatAreaInputOverrides;
}

type ChatAreaSessionOverrides = Omit<Partial<ChatAreaProps['chatArea']['session']>, 'currentChatSettings'> & {
  currentChatSettings?: Partial<ChatSettings>;
};

interface ChatAreaPropsOverrides {
  session?: ChatAreaSessionOverrides;
  shell?: Partial<ChatAreaProps['chatArea']['shell']>;
  header?: Partial<ChatAreaProps['chatArea']['header']>;
  messageActions?: Partial<ChatAreaProps['chatArea']['messageActions']>;
  inputActions?: Partial<ChatAreaProps['chatArea']['inputActions']>;
  features?: Partial<ChatAreaProps['chatArea']['features']>;
}

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
  mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,
  ...overrides,
});

export const createAppSettings = (overrides: Partial<AppSettings> = {}): AppSettings => ({
  ...createChatSettings(),
  themeId: 'pearl',
  baseFontSize: 14,
  apiMode: 'gemini-native',
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
  isAudioCompressionEnabled: false,
  autoCanvasModelId: 'gemini-3.1-pro-preview',
  isPasteRichTextAsMarkdownEnabled: true,
  isSystemAudioRecordingEnabled: false,
  customShortcuts: {},
  ...overrides,
});

const createToolStates = (overrides: Partial<ChatToolToggleStates> = {}): ChatToolToggleStates => ({
  googleSearch: { isEnabled: false, onToggle: vi.fn() },
  deepSearch: { isEnabled: false, onToggle: vi.fn() },
  codeExecution: { isEnabled: false, onToggle: vi.fn() },
  localPython: { isEnabled: false, onToggle: vi.fn() },
  urlContext: { isEnabled: false, onToggle: vi.fn() },
  ...overrides,
});

export const createChatAreaProviderValue = (overrides: ChatAreaProviderValueOverrides = {}): ChatAreaProviderValue => {
  const { appSettings, currentChatSettings, toolStates, ...inputOverrides } = overrides.input ?? {};

  return {
    messageList: {
      messages: [],
      sessionTitle: 'Test',
      setScrollContainerRef: vi.fn(),
      onEditMessage: vi.fn(),
      onDeleteMessage: vi.fn(),
      onRetryMessage: vi.fn(),
      onUpdateMessageFile: vi.fn(),
      showThoughts: false,
      onSuggestionClick: vi.fn(),
      onOrganizeInfoClick: vi.fn(),
      onFollowUpSuggestionClick: vi.fn(),
      onGenerateCanvas: vi.fn(),
      onContinueGeneration: vi.fn(),
      onForkMessage: vi.fn(),
      onQuickTTS: vi.fn(async () => null),
      chatInputHeight: 0,
      currentModelId: 'gemini-3.1-pro-preview',
      onOpenSidePanel: vi.fn(),
      onQuote: vi.fn(),
      onInsert: vi.fn(),
      activeSessionId: 'session-1',
      ...overrides.messageList,
    },
    input: {
      appSettings: createAppSettings(appSettings),
      currentChatSettings: createChatSettings(currentChatSettings),
      setAppFileError: vi.fn(),
      activeSessionId: 'session-1',
      commandedInput: null,
      onMessageSent: vi.fn(),
      selectedFiles: [],
      setSelectedFiles: vi.fn(),
      onSendMessage: vi.fn(),
      isLoading: false,
      isEditing: false,
      onStopGenerating: vi.fn(),
      onCancelEdit: vi.fn(),
      onProcessFiles: vi.fn(async () => {}),
      onAddFileById: vi.fn(async () => {}),
      onCancelUpload: vi.fn(),
      onTranscribeAudio: vi.fn(async () => null),
      isProcessingFile: false,
      fileError: null,
      isImagenModel: false,
      isImageEditModel: false,
      aspectRatio: '1:1',
      setAspectRatio: vi.fn(),
      imageSize: '1K',
      setImageSize: vi.fn(),
      toolStates: createToolStates(toolStates),
      isGoogleSearchEnabled: false,
      onToggleGoogleSearch: vi.fn(),
      isCodeExecutionEnabled: false,
      onToggleCodeExecution: vi.fn(),
      isLocalPythonEnabled: false,
      onToggleLocalPython: vi.fn(),
      isUrlContextEnabled: false,
      onToggleUrlContext: vi.fn(),
      isDeepSearchEnabled: false,
      onToggleDeepSearch: vi.fn(),
      onClearChat: vi.fn(),
      onNewChat: vi.fn(),
      onOpenSettings: vi.fn(),
      onToggleCanvasPrompt: vi.fn(),
      onTogglePinCurrentSession: vi.fn(),
      onRetryLastTurn: vi.fn(),
      onSelectModel: vi.fn(),
      availableModels: [],
      onEditLastUserMessage: vi.fn(),
      onTogglePip: vi.fn(),
      isPipActive: false,
      generateQuadImages: false,
      onToggleQuadImages: vi.fn(),
      setCurrentChatSettings: vi.fn(),
      onSuggestionClick: vi.fn(),
      onOrganizeInfoClick: vi.fn(),
      showEmptyStateSuggestions: false,
      editMode: 'update',
      onUpdateMessageContent: vi.fn(),
      editingMessageId: null,
      setEditingMessageId: vi.fn(),
      onAddUserMessage: vi.fn(),
      onLiveTranscript: vi.fn(),
      onToggleBBox: vi.fn(),
      isBBoxModeActive: false,
      onToggleGuide: vi.fn(),
      isGuideModeActive: false,
      themeId: 'pearl',
      ...inputOverrides,
    },
  };
};

export const createChatAreaProps = (overrides: ChatAreaPropsOverrides = {}): ChatAreaProps => {
  const { currentChatSettings, ...sessionOverrides } = overrides.session ?? {};

  return {
    chatArea: {
      session: {
        activeSessionId: 'session-1',
        sessionTitle: 'Session',
        currentChatSettings: createChatSettings(currentChatSettings),
        messages: [
          {
            id: 'message-1',
            role: 'user',
            content: 'hello',
            timestamp: new Date('2026-04-12T00:00:00.000Z'),
          },
        ],
        isLoading: false,
        isEditing: false,
        showThoughts: false,
        ...sessionOverrides,
      },
      shell: {
        isAppDraggingOver: false,
        modelsLoadingError: null,
        handleAppDragEnter: vi.fn(),
        handleAppDragOver: vi.fn(),
        handleAppDragLeave: vi.fn(),
        handleAppDrop: vi.fn(),
        ...overrides.shell,
      },
      header: {
        currentModelName: 'Gemini 3.1 Pro',
        availableModels: [],
        selectedModelId: 'gemini-3.1-pro-preview',
        isCanvasPromptActive: false,
        isPipSupported: false,
        isPipActive: false,
        onNewChat: vi.fn(),
        onOpenScenariosModal: vi.fn(),
        onToggleHistorySidebar: vi.fn(),
        onLoadCanvasPrompt: vi.fn(),
        onSelectModel: vi.fn(),
        onSetThinkingLevel: vi.fn(),
        onToggleGemmaReasoning: vi.fn(),
        onTogglePip: vi.fn(),
        ...overrides.header,
      },
      messageActions: {
        setScrollContainerRef: vi.fn(),
        onEditMessage: vi.fn(),
        onDeleteMessage: vi.fn(),
        onRetryMessage: vi.fn(),
        onUpdateMessageFile: vi.fn(),
        onSuggestionClick: vi.fn(),
        onOrganizeInfoClick: vi.fn(),
        onFollowUpSuggestionClick: vi.fn(),
        onGenerateCanvas: vi.fn(),
        onContinueGeneration: vi.fn(),
        onForkMessage: vi.fn(),
        onQuickTTS: vi.fn(async () => null),
        onOpenSidePanel: vi.fn(),
        ...overrides.messageActions,
      },
      inputActions: {
        onMessageSent: vi.fn(),
        onSendMessage: vi.fn(),
        onStopGenerating: vi.fn(),
        onCancelEdit: vi.fn(),
        onProcessFiles: vi.fn(async () => {}),
        onAddFileById: vi.fn(async () => {}),
        onCancelUpload: vi.fn(),
        onTranscribeAudio: vi.fn(async () => null),
        onClearChat: vi.fn(),
        onOpenSettings: vi.fn(),
        onToggleCanvasPrompt: vi.fn(),
        onTogglePinCurrentSession: vi.fn(),
        onRetryLastTurn: vi.fn(),
        onEditLastUserMessage: vi.fn(),
        onToggleQuadImages: vi.fn(),
        setCurrentChatSettings: vi.fn(),
        onAddUserMessage: vi.fn(),
        onLiveTranscript: vi.fn(),
        onEditMessageContent: vi.fn(),
        onToggleBBox: vi.fn(),
        onToggleGuide: vi.fn(),
        ...overrides.inputActions,
      },
      features: {
        isImageEditModel: false,
        isBBoxModeActive: false,
        isGuideModeActive: false,
        generateQuadImages: false,
        ...overrides.features,
      },
    },
  };
};

interface RenderWithChatAreaProvidersOptions {
  attachToDocument?: boolean;
  chatArea?: ChatAreaProviderValueOverrides;
  value?: ChatAreaProviderValue;
}

export const renderWithChatAreaProviders = (children: ReactNode, options: RenderWithChatAreaProvidersOptions = {}) => {
  const root: TestRenderer = createTestRenderer({ attachToDocument: options.attachToDocument !== false });
  const { container } = root;
  const providerValue = options.value ?? createChatAreaProviderValue(options.chatArea);

  act(() => {
    root.render(
      <I18nProvider>
        <WindowProvider>
          <ChatAreaProvider value={providerValue}>{children}</ChatAreaProvider>
        </WindowProvider>
      </I18nProvider>,
    );
  });

  return {
    container,
    providerValue,
    root,
    unmount: () => {
      act(() => {
        root.unmount();
      });
    },
  };
};
