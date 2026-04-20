import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppSettings, ChatMessage, SavedChatSession } from '../../types';
import { useApp } from './useApp';

const mockSetIsHistorySidebarOpen = vi.fn();
const mockSetIsLogViewerOpen = vi.fn();

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
  settings: {
    modelId: 'gemini-test',
  } as SavedChatSession['settings'],
};

const hydratedSession: SavedChatSession = {
  ...metadataOnlySession,
  messages: fullMessages,
};

const appSettings = {
  modelId: 'gemini-test',
  language: 'en',
  themeId: 'pearl',
} as AppSettings;

vi.mock('../core/useAppSettings', () => ({
  useAppSettings: () => ({
    appSettings,
    setAppSettings: vi.fn(),
    currentTheme: { id: 'pearl' },
    language: 'en',
  }),
}));

vi.mock('../chat/useChat', () => ({
  useChat: () => ({
    activeChat: hydratedSession,
    activeSessionId: 'session-1',
    apiModels: [],
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
    setCurrentChatSettings: vi.fn(),
    startNewChat: vi.fn(),
    updateAndPersistGroups: vi.fn(),
    updateAndPersistSessions: vi.fn(),
  }),
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
  useUIStore: (selector: (state: { setIsHistorySidebarOpen: typeof mockSetIsHistorySidebarOpen; setIsLogViewerOpen: typeof mockSetIsLogViewerOpen }) => unknown) =>
    selector({
      setIsHistorySidebarOpen: mockSetIsHistorySidebarOpen,
      setIsLogViewerOpen: mockSetIsLogViewerOpen,
    }),
}));

vi.mock('../../utils/appUtils', async () => {
  const actual = await vi.importActual<typeof import('../../utils/appUtils')>('../../utils/appUtils');
  return {
    ...actual,
    getTranslator: () => (key: string) => key,
    applyThemeToDocument: vi.fn(),
    logService: {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    },
  };
});

const renderHook = <T,>(callback: () => T) => {
  const container = document.createElement('div');
  const root = createRoot(container);
  const result: { current: T | null } = { current: null };

  const TestComponent = () => {
    result.current = callback();
    return null;
  };

  act(() => {
    root.render(<TestComponent />);
  });

  return {
    result: result as { current: T },
    unmount: () => {
      act(() => {
        root.unmount();
      });
    },
  };
};

describe('useApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('exposes the hydrated active chat instead of sidebar metadata when exporting', () => {
    const { result, unmount } = renderHook(() => useApp());

    expect(result.current.activeChat?.messages).toEqual(fullMessages);
    expect(result.current.sessionTitle).toBe('Portable Export');

    unmount();
  });
});
