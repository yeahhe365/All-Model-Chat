import { act, type ComponentProps, type ReactNode } from 'react';
import { createTestRenderer, type TestRenderer } from '@/test/testUtils';
import { vi } from 'vitest';
import { I18nProvider } from '@/contexts/I18nContext';
import { WindowProvider } from '@/contexts/WindowContext';
import { ChatRuntimeValuesProvider } from '@/components/layout/chat-runtime/ChatRuntimeContext';
import { useChatStore } from '@/stores/chatStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUIStore } from '@/stores/uiStore';
import { AVAILABLE_THEMES } from '@/constants/themeConstants';
import type { AppSettings, ChatMessage, ChatSettings, ChatToolToggleStates, ModelOption, UploadedFile } from '@/types';
import { createAppSettings, createChatSettings } from './factories';
import { createChatToolToggleStates } from './chatToolFixtures';

export { createAppSettings, createChatSettings } from './factories';

type ChatRuntimeValues = ComponentProps<typeof ChatRuntimeValuesProvider>['value'];

type ChatAreaInputValue = {
  appSettings: AppSettings;
  currentChatSettings: ChatSettings;
  setAppFileError: (error: string | null) => void;
  activeSessionId: string | null;
  commandedInput: { id: number; text: string; mode?: 'replace' | 'append' | 'quote' | 'insert' } | null;
  onMessageSent: () => void;
  selectedFiles: UploadedFile[];
  setSelectedFiles: (files: UploadedFile[] | ((prev: UploadedFile[]) => UploadedFile[])) => void;
  onSendMessage: (text: string, options?: { isFastMode?: boolean; files?: UploadedFile[] }) => void;
  isLoading: boolean;
  isEditing: boolean;
  onStopGenerating: () => void;
  onCancelEdit: () => void;
  onProcessFiles: (files: FileList | File[]) => Promise<void>;
  onAddFileById: (fileId: string) => Promise<void>;
  onCancelUpload: (fileId: string) => void;
  onTranscribeAudio: (file: File) => Promise<string | null>;
  isProcessingFile: boolean;
  fileError: string | null;
  isImageEditModel?: boolean;
  aspectRatio?: string;
  setAspectRatio?: (ratio: string) => void;
  imageSize?: string;
  setImageSize?: (size: string) => void;
  toolStates: ChatToolToggleStates;
  onClearChat: () => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
  onToggleLiveArtifactsPrompt: () => void;
  onTogglePinCurrentSession: () => void;
  onRetryLastTurn: () => void;
  onSelectModel: (modelId: string) => void;
  availableModels: ModelOption[];
  onEditLastUserMessage: () => void;
  onTogglePip: () => void;
  isPipActive: boolean;
  generateQuadImages: boolean;
  onToggleQuadImages: () => void;
  setCurrentChatSettings: (updater: (prev: ChatSettings) => ChatSettings) => void;
  onSuggestionClick: (suggestion: string) => void;
  onOrganizeInfoClick: (suggestion: string) => void;
  showEmptyStateSuggestions: boolean;
  editMode: 'update' | 'resend';
  onUpdateMessageContent: (messageId: string, content: string) => void;
  editingMessageId: string | null;
  setEditingMessageId: (id: string | null) => void;
  onAddUserMessage: (text: string, files?: UploadedFile[]) => void;
  onLiveTranscript: () => void;
  onToggleBBox: () => void;
  isBBoxModeActive: boolean;
  onToggleGuide: () => void;
  isGuideModeActive: boolean;
  themeId: string;
};

type ChatAreaMessageListValue = {
  messages: ChatMessage[];
  sessionTitle: string;
  setScrollContainerRef: (node: HTMLDivElement | null) => void;
  onEditMessage: (messageId: string, mode?: 'update' | 'resend') => void;
  onDeleteMessage: (messageId: string) => void;
  onRetryMessage: (messageId: string) => void;
  onUpdateMessageFile: () => void;
  showThoughts: boolean;
  onSuggestionClick: (suggestion: string) => void;
  onOrganizeInfoClick: (suggestion: string) => void;
  onFollowUpSuggestionClick: (suggestion: string) => void;
  onFollowUpSuggestionFill: (suggestion: string) => void;
  onContinueGeneration: (messageId: string) => void;
  onForkMessage: (messageId: string) => void;
  onQuickTTS: (text: string) => Promise<string | null>;
  chatInputHeight: number;
  currentModelId: string;
  onOpenSidePanel: () => void;
  activeSessionId: string | null;
};

export interface ChatAreaProviderValue {
  header: ChatRuntimeValues['header'];
  messageList: ChatAreaMessageListValue;
  input: ChatAreaInputValue;
}

type ChatAreaInputOverrides = Omit<
  Partial<ChatAreaInputValue>,
  'appSettings' | 'currentChatSettings' | 'toolStates'
> & {
  appSettings?: Partial<AppSettings>;
  currentChatSettings?: Partial<ChatSettings>;
  toolStates?: Partial<ChatToolToggleStates>;
};

interface ChatAreaProviderValueOverrides {
  header?: Partial<ChatRuntimeValues['header']>;
  messageList?: Partial<ChatAreaMessageListValue>;
  input?: ChatAreaInputOverrides;
}

export const createChatAreaProviderValue = (overrides: ChatAreaProviderValueOverrides = {}): ChatAreaProviderValue => {
  const { appSettings, currentChatSettings, toolStates, ...inputOverrides } = overrides.input ?? {};

  return {
    header: {
      isAppDraggingOver: false,
      modelsLoadingError: null,
      handleAppDragEnter: vi.fn(),
      handleAppDragOver: vi.fn(),
      handleAppDragLeave: vi.fn(),
      handleAppDrop: vi.fn(),
      currentModelName: 'Test Model',
      availableModels: inputOverrides.availableModels ?? [],
      selectedModelId: currentChatSettings?.modelId ?? createChatSettings().modelId,
      isLiveArtifactsPromptActive: false,
      isLiveArtifactsPromptBusy: false,
      isPipSupported: true,
      isPipActive: inputOverrides.isPipActive ?? false,
      onNewChat: inputOverrides.onNewChat ?? vi.fn(),
      onOpenScenariosModal: vi.fn(),
      onToggleHistorySidebar: vi.fn(),
      onLoadLiveArtifactsPrompt: inputOverrides.onToggleLiveArtifactsPrompt ?? vi.fn(),
      onSelectModel: inputOverrides.onSelectModel ?? vi.fn(),
      onSetThinkingLevel: vi.fn(),
      onToggleGemmaReasoning: vi.fn(),
      onTogglePip: inputOverrides.onTogglePip ?? vi.fn(),
      ...overrides.header,
    },
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
      onFollowUpSuggestionFill: vi.fn(),
      onContinueGeneration: vi.fn(),
      onForkMessage: vi.fn(),
      onQuickTTS: vi.fn(async () => null),
      chatInputHeight: 0,
      currentModelId: 'gemini-3.1-pro-preview',
      onOpenSidePanel: vi.fn(),
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
      isImageEditModel: false,
      aspectRatio: '1:1',
      setAspectRatio: vi.fn(),
      imageSize: '1K',
      setImageSize: vi.fn(),
      toolStates: createChatToolToggleStates(toolStates),
      onClearChat: vi.fn(),
      onNewChat: vi.fn(),
      onOpenSettings: vi.fn(),
      onToggleLiveArtifactsPrompt: vi.fn(),
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

export const applyChatAreaProviderValue = (value: ChatAreaProviderValue) => {
  useSettingsStore.setState({
    appSettings: value.input.appSettings,
    currentTheme: AVAILABLE_THEMES.find((theme) => theme.id === value.input.themeId) ?? AVAILABLE_THEMES[0],
  });

  useChatStore.setState({
    activeSessionId: value.input.activeSessionId,
    savedSessions: value.input.activeSessionId
      ? [
          {
            id: value.input.activeSessionId,
            title: value.messageList.sessionTitle,
            timestamp: Date.parse('2026-04-12T00:00:00.000Z'),
            messages: [],
            settings: value.input.currentChatSettings,
          },
        ]
      : [],
    activeMessages: value.messageList.messages,
    selectedFiles: value.input.selectedFiles,
    commandedInput: value.input.commandedInput,
    editingMessageId: value.input.editingMessageId,
    editMode: value.input.editMode,
    isAppProcessingFile: value.input.isProcessingFile,
    appFileError: value.input.fileError,
    aspectRatio: value.input.aspectRatio ?? '1:1',
    imageSize: value.input.imageSize ?? '1K',
    loadingSessionIds:
      value.input.isLoading && value.input.activeSessionId ? new Set([value.input.activeSessionId]) : new Set(),
  });

  useUIStore.setState({ chatInputHeight: value.messageList.chatInputHeight });
};

export const createChatRuntimeValues = (value: ChatAreaProviderValue): ChatRuntimeValues => ({
  header: value.header,
  messageList: value.messageList,
  input: {
    onMessageSent: value.input.onMessageSent,
    onSendMessage: value.input.onSendMessage,
    onStopGenerating: value.input.onStopGenerating,
    onCancelEdit: value.input.onCancelEdit,
    onProcessFiles: value.input.onProcessFiles,
    onAddFileById: value.input.onAddFileById,
    onCancelUpload: value.input.onCancelUpload,
    onTranscribeAudio: value.input.onTranscribeAudio,
    onClearChat: value.input.onClearChat,
    onNewChat: value.input.onNewChat,
    onOpenSettings: value.input.onOpenSettings,
    onToggleLiveArtifactsPrompt: value.input.onToggleLiveArtifactsPrompt,
    onTogglePinCurrentSession: value.input.onTogglePinCurrentSession,
    onRetryLastTurn: value.input.onRetryLastTurn,
    onSelectModel: value.input.onSelectModel,
    availableModels: value.input.availableModels,
    onEditLastUserMessage: value.input.onEditLastUserMessage,
    onTogglePip: value.input.onTogglePip,
    isPipActive: value.input.isPipActive,
    onToggleQuadImages: value.input.onToggleQuadImages,
    setCurrentChatSettings: value.input.setCurrentChatSettings,
    onSuggestionClick: value.input.onSuggestionClick,
    onOrganizeInfoClick: value.input.onOrganizeInfoClick,
    onAddUserMessage: value.input.onAddUserMessage,
    onLiveTranscript: value.input.onLiveTranscript,
    onEditMessageContent: value.input.onUpdateMessageContent,
    onToggleBBox: value.input.onToggleBBox,
    onToggleGuide: value.input.onToggleGuide,
  },
});

export const renderWithChatAreaProviders = (
  children: ReactNode,
  options: {
    attachToDocument?: boolean;
    chatArea?: ChatAreaProviderValueOverrides;
    value?: ChatAreaProviderValue;
  } = {},
) => {
  const root: TestRenderer = createTestRenderer({ attachToDocument: options.attachToDocument !== false });
  const { container } = root;
  const providerValue = options.value ?? createChatAreaProviderValue(options.chatArea);

  applyChatAreaProviderValue(providerValue);

  act(() => {
    root.render(
      <I18nProvider>
        <WindowProvider>
          <ChatRuntimeValuesProvider value={createChatRuntimeValues(providerValue)}>
            {children}
          </ChatRuntimeValuesProvider>
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
