import { act, type PropsWithChildren, type SetStateAction } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppViewModel } from '@/hooks/app/useApp';
import type { AppSettings } from '@/types';
import { renderHook } from '@/test/testUtils';
import { createAppSettings, createChatSettings, createTheme } from '@/test/factories';
import { ChatRuntimeProvider, useChatHeaderRuntime } from './chat-runtime/ChatRuntimeContext';
import { CHAT_INPUT_TEXTAREA_SELECTOR } from '@/constants/appConstants';

const mockStores = vi.hoisted(() => {
  const ui = {
    isSettingsModalOpen: false,
    setIsSettingsModalOpen: vi.fn(),
    isPreloadedMessagesModalOpen: false,
    setIsPreloadedMessagesModalOpen: vi.fn(),
    isLogViewerOpen: false,
    setIsLogViewerOpen: vi.fn(),
  };
  const chat = {
    setCommandedInput: vi.fn(),
  };
  const useChatStoreMock = Object.assign((selector: (state: typeof chat) => unknown) => selector(chat), {
    getState: () => chat,
  });

  return {
    ui,
    chat,
    useChatStoreMock,
  };
});

vi.mock('@/stores/uiStore', () => ({
  useUIStore: (selector: (state: typeof mockStores.ui) => unknown) => selector(mockStores.ui),
}));

vi.mock('@/stores/chatStore', () => ({
  useChatStore: mockStores.useChatStoreMock,
}));

vi.mock('@/utils/shortcutUtils', () => ({
  getShortcutDisplay: vi.fn(() => 'shortcut'),
}));

const renderChatHeaderRuntime = (app: AppViewModel) =>
  renderHook(() => useChatHeaderRuntime(), {
    wrapper: ({ children }: PropsWithChildren) => <ChatRuntimeProvider app={app}>{children}</ChatRuntimeProvider>,
  });

const buildApp = (overrides: Partial<AppViewModel> = {}) => {
  const appSettings = createAppSettings({
    isOpenAICompatibleApiEnabled: true,
    apiMode: 'openai-compatible',
    modelId: 'gemini-3-flash-preview',
    openaiCompatibleModelId: 'gpt-5.5',
    openaiCompatibleModels: [
      { id: 'gpt-5.5', name: 'GPT-5.5', isPinned: true },
      { id: 'gpt-4.1', name: 'GPT-4.1' },
    ],
  });
  const handleSelectModelInHeader = vi.fn();
  const setAppSettings = vi.fn<(value: SetStateAction<AppSettings>) => void>();

  return {
    appSettings,
    setAppSettings,
    currentTheme: createTheme(),
    language: 'en',
    t: vi.fn((key: string) => key),
    uiState: {
      isHistorySidebarOpen: false,
      setIsHistorySidebarOpen: vi.fn(),
      setIsHistorySidebarOpenTransient: vi.fn(),
      isSettingsModalOpen: false,
      setIsSettingsModalOpen: vi.fn(),
      isPreloadedMessagesModalOpen: false,
      setIsPreloadedMessagesModalOpen: vi.fn(),
      isLogViewerOpen: false,
      setIsLogViewerOpen: vi.fn(),
      handleTouchStart: vi.fn(),
      handleTouchEnd: vi.fn(),
    },
    pipState: {
      isPipSupported: false,
      isPipActive: false,
      togglePip: vi.fn(),
      pipContainer: null,
      pipWindow: null,
    },
    eventsState: {
      installPromptEvent: null,
      handleInstallPwa: vi.fn(),
      installState: { state: 'installed', canInstall: false },
      needRefresh: false,
      updateDismissed: false,
      dismissUpdateBanner: vi.fn(),
      handleRefreshApp: vi.fn(),
    },
    chatState: {
      activeChat: undefined,
      activeSessionId: 'session-1',
      apiModels: [{ id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview' }],
      currentChatSettings: createChatSettings({ modelId: 'gemini-3-flash-preview' }),
      messages: [],
      isLoading: false,
      editingMessageId: null,
      editMode: 'resend',
      commandedInput: null,
      isAppDraggingOver: false,
      isProcessingDrop: false,
      selectedFiles: [],
      appFileError: null,
      isAppProcessingFile: false,
      savedSessions: [],
      savedGroups: [],
      savedScenarios: [],
      loadingSessionIds: new Set(),
      generatingTitleSessionIds: new Set(),
      isModelsLoading: false,
      modelsLoadingError: null,
      isSwitchingModel: false,
      aspectRatio: '1:1',
      imageSize: '1K',
      updateAndPersistSessions: vi.fn(),
      updateAndPersistGroups: vi.fn(),
      scrollContainerRef: { current: null },
      loadChatSession: vi.fn(),
      handleSendMessage: vi.fn(),
      setScrollContainerRef: vi.fn(),
      handleEditMessage: vi.fn(),
      handleDeleteMessage: vi.fn(),
      handleRetryMessage: vi.fn(),
      handleUpdateMessageFile: vi.fn(),
      handleContinueGeneration: vi.fn(),
      handleForkMessage: vi.fn(),
      handleQuickTTS: vi.fn(),
      handleStopGenerating: vi.fn(),
      handleCancelEdit: vi.fn(),
      setCommandedInput: vi.fn(),
      handleProcessAndAddFiles: vi.fn(),
      handleAddFileById: vi.fn(),
      handleCancelFileUpload: vi.fn(),
      handleTranscribeAudio: vi.fn(),
      toggleGoogleSearch: vi.fn(),
      toggleCodeExecution: vi.fn(),
      toggleLocalPython: vi.fn(),
      toggleUrlContext: vi.fn(),
      toggleDeepSearch: vi.fn(),
      handleClearCurrentChat: vi.fn(),
      handleTogglePinCurrentSession: vi.fn(),
      handleTogglePinSession: vi.fn(),
      handleRetryLastTurn: vi.fn(),
      handleEditLastUserMessage: vi.fn(),
      setCurrentChatSettings: vi.fn(),
      handleAddUserMessage: vi.fn(),
      handleLiveTranscript: vi.fn(),
      liveClientFunctions: {},
      handleUpdateMessageContent: vi.fn(),
      startNewChat: vi.fn(),
      handleDeleteChatHistorySession: vi.fn(),
      handleRenameSession: vi.fn(),
      handleDuplicateSession: vi.fn(),
      handleAddNewGroup: vi.fn(),
      handleDeleteGroup: vi.fn(),
      handleRenameGroup: vi.fn(),
      handleMoveSessionToGroup: vi.fn(),
      handleToggleGroupExpansion: vi.fn(),
      clearCacheAndReload: vi.fn(),
      clearAllHistory: vi.fn(),
      handleSaveAllScenarios: vi.fn(),
      handleLoadPreloadedScenario: vi.fn(),
      setApiModels: vi.fn(),
      handleSelectModelInHeader,
      handleAppDragEnter: vi.fn(),
      handleAppDragOver: vi.fn(),
      handleAppDragLeave: vi.fn(),
      handleAppDrop: vi.fn(),
    },
    activeChat: undefined,
    sidePanelContent: null,
    handleOpenSidePanel: vi.fn(),
    handleCloseSidePanel: vi.fn(),
    isExportModalOpen: false,
    setIsExportModalOpen: vi.fn(),
    exportStatus: 'idle',
    handleExportChat: vi.fn(),
    sessionTitle: 'Session',
    handleSaveSettings: vi.fn(),
    handleSaveCurrentChatSettings: vi.fn(),
    handleLoadLiveArtifactsPromptAndSave: vi.fn(),
    handleToggleBBoxMode: vi.fn(),
    handleToggleGuideMode: vi.fn(),
    handleSuggestionClick: vi.fn(),
    isLiveArtifactsPromptActive: false,
    isLiveArtifactsPromptBusy: false,
    handleSetThinkingLevel: vi.fn(),
    getCurrentModelDisplayName: vi.fn(() => 'GPT-5.5'),
    handleExportAllScenarios: vi.fn(),
    handleImportAllScenarios: vi.fn(),
    ...overrides,
  } satisfies AppViewModel;
};

describe('chat runtime values', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('shows API-configured OpenAI-compatible models in the header while OpenAI mode is active', () => {
    const app = buildApp();
    const { result, unmount } = renderChatHeaderRuntime(app);
    const header = result.current;

    expect(header.availableModels).toEqual([
      { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', apiMode: 'gemini-native' },
      { id: 'gpt-5.5', name: 'GPT-5.5', isPinned: true, apiMode: 'openai-compatible' },
      { id: 'gpt-4.1', name: 'GPT-4.1', apiMode: 'openai-compatible' },
    ]);
    expect(header.selectedModelId).toBe('gpt-5.5');
    expect(header.currentModelName).toBe('GPT-5.5');

    act(() => {
      header.onSelectModel('gpt-4.1');
    });

    expect(app.chatState.handleSelectModelInHeader).not.toHaveBeenCalled();
    expect(app.setAppSettings).toHaveBeenCalledOnce();
    const updater = vi.mocked(app.setAppSettings).mock.calls[0][0];
    expect(typeof updater).toBe('function');
    if (typeof updater !== 'function') {
      throw new Error('Expected setAppSettings to receive an updater function');
    }
    expect(updater(app.appSettings)).toEqual(
      expect.objectContaining({
        apiMode: 'openai-compatible',
        modelId: 'gemini-3-flash-preview',
        openaiCompatibleModelId: 'gpt-4.1',
      }),
    );

    unmount();
  });

  it('shows API-configured OpenAI-compatible models in the header while Gemini-native mode is active', () => {
    const app = buildApp({
      appSettings: {
        ...createAppSettings(),
        isOpenAICompatibleApiEnabled: true,
        apiMode: 'gemini-native',
        modelId: 'gemini-3-flash-preview',
        openaiCompatibleModelId: 'gpt-5.5',
        openaiCompatibleModels: [{ id: 'gpt-5.5', name: 'GPT-5.5', isPinned: true }],
      },
      getCurrentModelDisplayName: vi.fn(() => 'Gemini 3 Flash Preview'),
    });
    const { result, unmount } = renderChatHeaderRuntime(app);
    const header = result.current;

    expect(header.availableModels).toEqual([
      { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', apiMode: 'gemini-native' },
      { id: 'gpt-5.5', name: 'GPT-5.5', isPinned: true, apiMode: 'openai-compatible' },
    ]);
    expect(header.selectedModelId).toBe('gemini-3-flash-preview');

    act(() => {
      header.onSelectModel('gemini-3.1-pro-preview');
    });

    expect(app.chatState.handleSelectModelInHeader).toHaveBeenCalledWith('gemini-3.1-pro-preview');
    expect(app.setAppSettings).not.toHaveBeenCalled();

    act(() => {
      header.onSelectModel('gpt-5.5');
    });

    expect(app.setAppSettings).toHaveBeenCalledOnce();
    const switchToOpenAI = vi.mocked(app.setAppSettings).mock.calls[0][0];
    expect(typeof switchToOpenAI).toBe('function');
    if (typeof switchToOpenAI !== 'function') {
      throw new Error('Expected setAppSettings to receive an updater function');
    }
    expect(switchToOpenAI(app.appSettings)).toEqual(
      expect.objectContaining({
        apiMode: 'openai-compatible',
        openaiCompatibleModelId: 'gpt-5.5',
      }),
    );

    unmount();
  });

  it('focuses the chat input after selecting an OpenAI-compatible model from Gemini-native mode', () => {
    vi.useFakeTimers();
    const previousFocus = document.createElement('button');
    const textarea = document.createElement('textarea');
    textarea.setAttribute('data-chat-input-textarea', 'true');
    document.body.append(previousFocus, textarea);
    previousFocus.focus();

    const app = buildApp({
      appSettings: {
        ...createAppSettings(),
        isOpenAICompatibleApiEnabled: true,
        apiMode: 'gemini-native',
        modelId: 'gemini-3-flash-preview',
        openaiCompatibleModelId: 'gpt-5.5',
        openaiCompatibleModels: [{ id: 'gpt-5.5', name: 'GPT-5.5', isPinned: true }],
      },
      getCurrentModelDisplayName: vi.fn(() => 'Gemini 3 Flash Preview'),
    });
    const { result, unmount } = renderChatHeaderRuntime(app);

    try {
      act(() => {
        result.current.onSelectModel('gpt-5.5');
        vi.runAllTimers();
      });

      expect(document.querySelector(CHAT_INPUT_TEXTAREA_SELECTOR)).toBe(textarea);
      expect(document.activeElement).toBe(textarea);
    } finally {
      unmount();
      vi.useRealTimers();
    }
  });

  it('keeps OpenAI-compatible models hidden while the provider switch is off', () => {
    const app = buildApp({
      appSettings: {
        ...createAppSettings(),
        isOpenAICompatibleApiEnabled: false,
        apiMode: 'gemini-native',
        modelId: 'gemini-3-flash-preview',
        openaiCompatibleModelId: 'gpt-5.5',
        openaiCompatibleModels: [{ id: 'gpt-5.5', name: 'GPT-5.5', isPinned: true }],
      },
      getCurrentModelDisplayName: vi.fn(() => 'Gemini 3 Flash Preview'),
    });
    const { result, unmount } = renderChatHeaderRuntime(app);
    const header = result.current;

    expect(header.availableModels).toEqual([
      { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', apiMode: 'gemini-native' },
    ]);
    expect(header.selectedModelId).toBe('gemini-3-flash-preview');

    act(() => {
      header.onSelectModel('gpt-5.5');
    });

    expect(app.setAppSettings).not.toHaveBeenCalled();
    expect(app.chatState.handleSelectModelInHeader).toHaveBeenCalledWith('gpt-5.5');

    unmount();
  });

  it('switches back to Gemini-native mode when selecting a Gemini model from OpenAI mode', () => {
    const app = buildApp();
    const { result, unmount } = renderChatHeaderRuntime(app);
    const header = result.current;

    act(() => {
      header.onSelectModel('gemini-3-flash-preview');
    });

    expect(app.chatState.handleSelectModelInHeader).toHaveBeenCalledWith('gemini-3-flash-preview');
    expect(app.setAppSettings).toHaveBeenCalledOnce();
    const switchToGemini = vi.mocked(app.setAppSettings).mock.calls[0][0];
    expect(typeof switchToGemini).toBe('function');
    if (typeof switchToGemini !== 'function') {
      throw new Error('Expected setAppSettings to receive an updater function');
    }
    expect(switchToGemini(app.appSettings)).toEqual(
      expect.objectContaining({
        apiMode: 'gemini-native',
        modelId: 'gemini-3-flash-preview',
        openaiCompatibleModelId: 'gpt-5.5',
      }),
    );

    unmount();
  });
});
