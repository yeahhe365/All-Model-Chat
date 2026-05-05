import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppSettings, ChatMessage, ModelOption, SavedChatSession } from '../../types';
import { createAppSettings, createChatSettings } from '../../test/chatAreaFixtures';
import { useApp } from './useApp';
import { renderHook } from '@/test/testUtils';

const mockSetIsHistorySidebarOpen = vi.fn();
const mockSetIsLogViewerOpen = vi.fn();
const mockSetAppSettings = vi.fn();
const CANVAS_PROMPT = '<title>Canvas 助手：响应式视觉指南</title>\ncanvas prompt';

const fullMessages: ChatMessage[] = [
  {
    id: 'message-1',
    role: 'user',
    content: 'Export me',
    timestamp: new Date('2026-04-20T08:00:00.000Z'),
  },
];

const metadataOnlySession: SavedChatSession = {
  id: 'session-1',
  title: 'Portable Export',
  timestamp: Date.now(),
  messages: [],
  settings: createChatSettings({
    modelId: 'gemini-test',
  }),
};

const hydratedSession: SavedChatSession = {
  ...metadataOnlySession,
  messages: fullMessages,
};

let currentAppSettings = createAppSettings({
  modelId: 'gemini-test',
  language: 'en',
  themeId: 'pearl',
  systemInstruction: '',
});

type MockChatState = ReturnType<typeof buildChatState>;

const buildChatState = () => ({
  activeChat: hydratedSession as SavedChatSession | undefined,
  activeSessionId: 'session-1',
  apiModels: [] as ModelOption[],
  currentChatSettings: hydratedSession.settings,
  handleSaveAllScenarios: vi.fn(),
  handleSelectModelInHeader: vi.fn(),
  handleSendMessage: vi.fn(),
  handleStopGenerating: vi.fn(),
  isLoading: false,
  isSwitchingModel: false,
  messages: fullMessages,
  savedGroups: [],
  savedScenarios: [],
  savedSessions: [metadataOnlySession],
  scrollContainerRef: { current: null },
  setCommandedInput: vi.fn(),
  startNewChat: vi.fn(),
  updateAndPersistGroups: vi.fn(),
  updateAndPersistSessions: vi.fn(),
});

let currentChatState: MockChatState;
const mockSetCurrentChatSettings = vi.fn(
  (updater: (prev: SavedChatSession['settings']) => SavedChatSession['settings']) => {
    if (!currentChatState.activeChat) {
      return;
    }

    const nextSettings = updater(currentChatState.activeChat.settings);
    currentChatState.activeChat = {
      ...currentChatState.activeChat,
      settings: nextSettings,
    };
  },
);

vi.mock('../core/useAppSettings', () => ({
  useAppSettings: () => ({
    appSettings: currentAppSettings,
    setAppSettings: mockSetAppSettings,
    currentTheme: { id: 'pearl' },
    language: 'en',
  }),
}));

vi.mock('../chat/useChat', () => ({
  useChat: () => ({
    ...currentChatState,
    currentChatSettings: currentChatState.activeChat?.settings ?? currentAppSettings,
    setCurrentChatSettings: mockSetCurrentChatSettings,
  }),
}));

vi.mock('../../constants/promptHelpers', () => ({
  isCanvasSystemInstruction: (instruction?: string | null) =>
    !!instruction && instruction.includes('<title>Canvas 助手：响应式视觉指南</title>'),
  isBboxSystemInstruction: () => false,
  isHdGuideSystemInstruction: () => false,
  loadCanvasSystemPrompt: vi.fn(async () => CANVAS_PROMPT),
  loadBboxSystemPrompt: vi.fn(async () => 'bbox prompt'),
  loadHdGuideSystemPrompt: vi.fn(async () => 'guide prompt'),
}));

vi.mock('../core/useAppUI', () => ({
  useAppUI: () => ({}),
}));

vi.mock('../core/useAppEvents', () => ({
  useAppEvents: () => ({}),
}));

vi.mock('../core/usePictureInPicture', () => ({
  usePictureInPicture: () => ({
    pipWindow: null,
    togglePip: vi.fn(),
    isPipSupported: false,
  }),
}));

vi.mock('./useAppInitialization', () => ({
  useAppInitialization: vi.fn(),
}));

vi.mock('./useAppTitle', () => ({
  useAppTitle: vi.fn(),
}));

vi.mock('../data-management/useDataExport', () => ({
  useDataExport: () => ({
    handleExportSettings: vi.fn(),
    handleExportHistory: vi.fn(),
    handleExportAllScenarios: vi.fn(),
  }),
}));

vi.mock('../data-management/useDataImport', () => ({
  useDataImport: () => ({
    handleImportSettings: vi.fn(),
    handleImportHistory: vi.fn(),
    handleImportAllScenarios: vi.fn(),
  }),
}));

vi.mock('../data-management/useChatSessionExport', () => ({
  useChatSessionExport: () => ({
    exportChatLogic: vi.fn(),
  }),
}));

vi.mock('../../stores/uiStore', () => ({
  useUIStore: (
    selector: (state: {
      setIsHistorySidebarOpen: typeof mockSetIsHistorySidebarOpen;
      setIsLogViewerOpen: typeof mockSetIsLogViewerOpen;
    }) => unknown,
  ) =>
    selector({
      setIsHistorySidebarOpen: mockSetIsHistorySidebarOpen,
      setIsLogViewerOpen: mockSetIsLogViewerOpen,
    }),
}));

vi.mock('../../utils/translations', () => ({
  getTranslator: () => (key: string) => key,
}));

vi.mock('../../utils/uiUtils', () => ({
  applyThemeToDocument: vi.fn(),
}));

vi.mock('../../services/logService', async () => {
  const { createLogServiceMockModule } = await import('../../test/moduleMockDoubles');

  return createLogServiceMockModule();
});

describe('useApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentAppSettings = createAppSettings({
      modelId: 'gemini-test',
      language: 'en',
      themeId: 'pearl',
      systemInstruction: '',
    });
    mockSetAppSettings.mockImplementation((updater: AppSettings | ((prev: AppSettings) => AppSettings)) => {
      currentAppSettings = typeof updater === 'function' ? updater(currentAppSettings) : updater;
    });
    currentChatState = buildChatState();
    mockSetCurrentChatSettings.mockClear();
  });

  it('exposes the hydrated active chat instead of sidebar metadata when exporting', () => {
    const { result, unmount } = renderHook(() => useApp());

    expect(result.current.activeChat?.messages).toEqual(fullMessages);
    expect(result.current.sessionTitle).toBe('Portable Export');

    unmount();
  });

  it('re-applies the canvas prompt after the active session stabilizes', async () => {
    currentChatState.activeChat = undefined;
    currentChatState.activeSessionId = 'session-race';
    currentChatState.savedSessions = [];

    const { result, rerender, unmount } = renderHook(() => useApp());

    await act(async () => {
      await result.current.handleSuggestionClick('organize', 'Create an interactive HTML board');
    });

    expect(currentAppSettings.systemInstruction).toBe(CANVAS_PROMPT);
    expect(currentChatState.activeChat).toBeUndefined();

    currentChatState.activeChat = {
      id: 'session-race',
      title: 'New Chat',
      timestamp: Date.now(),
      messages: [],
      settings: createChatSettings({
        modelId: 'gemini-test',
        systemInstruction: '',
      }),
    };
    currentChatState.savedSessions = [{ ...currentChatState.activeChat, messages: [] }];

    rerender();
    rerender();

    expect(currentChatState.activeChat.settings.systemInstruction).toBe(CANVAS_PROMPT);

    unmount();
  });

  it('resets Gemini thinking budget when switching to a fast thinking preset', () => {
    currentAppSettings = {
      ...currentAppSettings,
      modelId: 'gemini-3-flash-preview',
      thinkingBudget: 4096,
      thinkingLevel: 'HIGH',
    };

    currentChatState.activeChat = {
      ...hydratedSession,
      settings: {
        ...hydratedSession.settings,
        modelId: 'gemini-3-flash-preview',
        thinkingBudget: 4096,
        thinkingLevel: 'HIGH',
      },
    };

    const { result, unmount } = renderHook(() => useApp());

    act(() => {
      result.current.handleSetThinkingLevel('MINIMAL');
    });

    expect(currentAppSettings.thinkingLevel).toBe('MINIMAL');
    expect(currentAppSettings.thinkingBudget).toBe(-1);
    expect(currentChatState.activeChat?.settings.thinkingLevel).toBe('MINIMAL');
    expect(currentChatState.activeChat?.settings.thinkingBudget).toBe(-1);

    unmount();
  });

  it('keeps Gemini header thinking toggles in level mode when switching back to high thinking', () => {
    currentAppSettings = {
      ...currentAppSettings,
      modelId: 'gemini-3.1-pro-preview',
      thinkingBudget: 2048,
      thinkingLevel: 'LOW',
    };

    currentChatState.activeChat = {
      ...hydratedSession,
      settings: {
        ...hydratedSession.settings,
        modelId: 'gemini-3.1-pro-preview',
        thinkingBudget: 2048,
        thinkingLevel: 'LOW',
      },
    };

    const { result, unmount } = renderHook(() => useApp());

    act(() => {
      result.current.handleSetThinkingLevel('HIGH');
    });

    expect(currentAppSettings.thinkingLevel).toBe('HIGH');
    expect(currentAppSettings.thinkingBudget).toBe(-1);
    expect(currentChatState.activeChat?.settings.thinkingLevel).toBe('HIGH');
    expect(currentChatState.activeChat?.settings.thinkingBudget).toBe(-1);

    unmount();
  });

  it('saves default settings without mutating the active chat settings', () => {
    currentChatState.activeChat = {
      ...hydratedSession,
      settings: {
        ...hydratedSession.settings,
        modelId: 'session-model',
        temperature: 0.2,
      },
    };

    const { result, unmount } = renderHook(() => useApp());

    act(() => {
      result.current.handleSaveSettings({
        ...currentAppSettings,
        modelId: 'default-model',
        temperature: 1.4,
      });
    });

    expect(currentAppSettings.modelId).toBe('default-model');
    expect(currentAppSettings.temperature).toBe(1.4);
    expect(currentChatState.activeChat.settings.modelId).toBe('session-model');
    expect(currentChatState.activeChat.settings.temperature).toBe(0.2);

    unmount();
  });

  it('saves current chat settings without mutating default settings', () => {
    currentAppSettings = {
      ...currentAppSettings,
      modelId: 'default-model',
      temperature: 0.8,
    };
    currentChatState.activeChat = {
      ...hydratedSession,
      settings: {
        ...hydratedSession.settings,
        modelId: 'session-model',
        temperature: 0.2,
      },
    };

    const { result, unmount } = renderHook(() => useApp());

    act(() => {
      result.current.handleSaveCurrentChatSettings({
        ...currentChatState.activeChat!.settings,
        modelId: 'current-model',
        temperature: 1.2,
      });
    });

    expect(currentChatState.activeChat.settings.modelId).toBe('current-model');
    expect(currentChatState.activeChat.settings.temperature).toBe(1.2);
    expect(currentAppSettings.modelId).toBe('default-model');
    expect(currentAppSettings.temperature).toBe(0.8);

    unmount();
  });

  it('displays the independent OpenAI-compatible model name in OpenAI-compatible mode', () => {
    currentAppSettings = {
      ...currentAppSettings,
      apiMode: 'openai-compatible',
      modelId: 'gemini-3-flash-preview',
      openaiCompatibleModelId: 'gpt-5.5',
      openaiCompatibleModels: [
        { id: 'gpt-5.5', name: 'GPT-5.5', isPinned: true },
        { id: 'gpt-4.1', name: 'GPT-4.1' },
      ],
    };
    currentChatState.activeChat = {
      ...hydratedSession,
      settings: {
        ...hydratedSession.settings,
        modelId: 'gemini-3-flash-preview',
      },
    };
    currentChatState.apiModels = [{ id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview' }];

    const { result, unmount } = renderHook(() => useApp());

    expect(result.current.getCurrentModelDisplayName()).toBe('GPT-5.5');

    unmount();
  });
});
