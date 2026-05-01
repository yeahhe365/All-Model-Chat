import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_APP_SETTINGS } from '../../constants/appConstants';
import { useMainContentViewModel } from './useMainContentViewModel';
import { renderHook } from '@/test/testUtils';

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

vi.mock('../../stores/uiStore', () => ({
  useUIStore: (selector: (state: typeof mockStores.ui) => unknown) => selector(mockStores.ui),
}));

vi.mock('../../stores/chatStore', () => ({
  useChatStore: mockStores.useChatStoreMock,
}));

vi.mock('../../utils/shortcutUtils', () => ({
  getShortcutDisplay: vi.fn(() => 'shortcut'),
}));

const buildApp = (overrides: Record<string, unknown> = {}) => {
  const appSettings = {
    ...DEFAULT_APP_SETTINGS,
    apiMode: 'openai-compatible',
    modelId: 'gemini-3-flash-preview',
    openaiCompatibleModelId: 'gpt-5.5',
    openaiCompatibleModels: [
      { id: 'gpt-5.5', name: 'GPT-5.5', isPinned: true },
      { id: 'gpt-4.1', name: 'GPT-4.1' },
    ],
  };
  const handleSelectModelInHeader = vi.fn();
  const setAppSettings = vi.fn();

  return {
    appSettings,
    setAppSettings,
    currentTheme: { id: 'pearl' },
    uiState: {
      isHistorySidebarOpen: false,
      setIsHistorySidebarOpen: vi.fn(),
      setIsHistorySidebarOpenTransient: vi.fn(),
    },
    pipState: {
      isPipSupported: false,
      isPipActive: false,
      togglePip: vi.fn(),
    },
    eventsState: {
      handleInstallPwa: vi.fn(),
      installState: { state: 'installed' },
    },
    chatState: {
      activeSessionId: 'session-1',
      apiModels: [{ id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview' }],
      currentChatSettings: { ...DEFAULT_APP_SETTINGS, modelId: 'gemini-3-flash-preview' },
      messages: [],
      isLoading: false,
      editingMessageId: null,
      isAppDraggingOver: false,
      savedSessions: [],
      savedGroups: [],
      savedScenarios: [],
      loadingSessionIds: new Set(),
      generatingTitleSessionIds: new Set(),
      loadChatSession: vi.fn(),
      handleSendMessage: vi.fn(),
      setScrollContainerRef: vi.fn(),
      handleEditMessage: vi.fn(),
      handleDeleteMessage: vi.fn(),
      handleRetryMessage: vi.fn(),
      handleUpdateMessageFile: vi.fn(),
      handleGenerateCanvas: vi.fn(),
      handleContinueGeneration: vi.fn(),
      handleForkMessage: vi.fn(),
      handleQuickTTS: vi.fn(),
      handleStopGenerating: vi.fn(),
      handleCancelEdit: vi.fn(),
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
    handleLoadCanvasPromptAndSave: vi.fn(),
    handleToggleBBoxMode: vi.fn(),
    handleToggleGuideMode: vi.fn(),
    handleSuggestionClick: vi.fn(),
    isCanvasPromptActive: false,
    isCanvasPromptBusy: false,
    handleSetThinkingLevel: vi.fn(),
    getCurrentModelDisplayName: vi.fn(() => 'GPT-5.5'),
    handleExportSettings: vi.fn(),
    handleExportHistory: vi.fn(),
    handleExportAllScenarios: vi.fn(),
    handleImportSettings: vi.fn(),
    handleImportHistory: vi.fn(),
    handleImportAllScenarios: vi.fn(),
    ...overrides,
  } as any;
};

describe('useMainContentViewModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows Gemini and OpenAI-compatible models together while OpenAI mode is active', () => {
    const app = buildApp();
    const { result, unmount } = renderHook(() => useMainContentViewModel({ app }));
    const header = result.current.chatArea.header;

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
    const updater = app.setAppSettings.mock.calls[0][0];
    expect(updater(app.appSettings)).toEqual(
      expect.objectContaining({
        apiMode: 'openai-compatible',
        modelId: 'gemini-3-flash-preview',
        openaiCompatibleModelId: 'gpt-4.1',
      }),
    );

    unmount();
  });

  it('shows Gemini and OpenAI-compatible models together while Gemini-native mode is active', () => {
    const app = buildApp({
      appSettings: {
        ...DEFAULT_APP_SETTINGS,
        apiMode: 'gemini-native',
        modelId: 'gemini-3-flash-preview',
        openaiCompatibleModelId: 'gpt-5.5',
        openaiCompatibleModels: [{ id: 'gpt-5.5', name: 'GPT-5.5', isPinned: true }],
      },
      getCurrentModelDisplayName: vi.fn(() => 'Gemini 3 Flash Preview'),
    });
    const { result, unmount } = renderHook(() => useMainContentViewModel({ app }));
    const header = result.current.chatArea.header;

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

    unmount();
  });

  it('switches API mode when selecting a model from the other provider list', () => {
    const app = buildApp({
      appSettings: {
        ...DEFAULT_APP_SETTINGS,
        apiMode: 'gemini-native',
        modelId: 'gemini-3-flash-preview',
        openaiCompatibleModelId: 'gpt-5.5',
        openaiCompatibleModels: [{ id: 'gpt-5.5', name: 'GPT-5.5', isPinned: true }],
      },
      getCurrentModelDisplayName: vi.fn(() => 'Gemini 3 Flash Preview'),
    });
    const { result, unmount } = renderHook(() => useMainContentViewModel({ app }));

    act(() => {
      result.current.chatArea.header.onSelectModel('gpt-5.5');
    });

    expect(app.chatState.handleSelectModelInHeader).not.toHaveBeenCalled();
    expect(app.setAppSettings).toHaveBeenCalledOnce();
    const switchToOpenAI = app.setAppSettings.mock.calls[0][0];
    expect(switchToOpenAI(app.appSettings)).toEqual(
      expect.objectContaining({
        apiMode: 'openai-compatible',
        modelId: 'gemini-3-flash-preview',
        openaiCompatibleModelId: 'gpt-5.5',
      }),
    );

    unmount();
  });

  it('switches back to Gemini-native mode when selecting a Gemini model from OpenAI mode', () => {
    const app = buildApp();
    const { result, unmount } = renderHook(() => useMainContentViewModel({ app }));

    act(() => {
      result.current.chatArea.header.onSelectModel('gemini-3-flash-preview');
    });

    expect(app.chatState.handleSelectModelInHeader).toHaveBeenCalledWith('gemini-3-flash-preview');
    expect(app.setAppSettings).toHaveBeenCalledOnce();
    const switchToGemini = app.setAppSettings.mock.calls[0][0];
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
