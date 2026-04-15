import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatArea } from './ChatArea';
import type { ChatAreaProps } from './ChatArea';

const mockState = vi.hoisted(() => ({
  settings: {
    appSettings: {
      baseFontSize: 14,
      expandCodeBlocksByDefault: false,
      isMermaidRenderingEnabled: true,
      isGraphvizRenderingEnabled: true,
    },
    currentTheme: { id: 'pearl' },
    language: 'zh' as const,
  },
  chat: {
    isSwitchingModel: false,
    commandedInput: null as { id: number; text: string; mode?: 'replace' | 'append' | 'quote' | 'insert' } | null,
    selectedFiles: [],
    setSelectedFiles: vi.fn(),
    editingMessageId: null as string | null,
    setEditingMessageId: vi.fn(),
    editMode: 'update' as const,
    isAppProcessingFile: false,
    appFileError: null as string | null,
    setAppFileError: vi.fn(),
    aspectRatio: '1:1',
    setAspectRatio: vi.fn(),
    imageSize: '1K',
    setImageSize: vi.fn(),
    ttsMessageId: null as string | null,
  },
  ui: {
    isHistorySidebarOpen: false,
  },
  renders: {
    messageList: vi.fn(),
    chatInput: vi.fn(),
  },
}));

vi.mock('../../stores/settingsStore', () => ({
  useSettingsStore: (selector: (state: typeof mockState.settings) => unknown) => selector(mockState.settings),
}));

vi.mock('../../stores/chatStore', () => ({
  useChatStore: (selector: (state: typeof mockState.chat) => unknown) => selector(mockState.chat),
}));

vi.mock('../../stores/uiStore', () => ({
  useUIStore: (selector: (state: typeof mockState.ui) => unknown) => selector(mockState.ui),
}));

vi.mock('../../utils/shortcutUtils', () => ({
  getShortcutDisplay: () => 'shortcut',
}));

vi.mock('../header/Header', () => ({
  Header: () => null,
}));

vi.mock('../chat/overlays/DragDropOverlay', () => ({
  DragDropOverlay: () => null,
}));

vi.mock('../chat/overlays/ModelsErrorDisplay', () => ({
  ModelsErrorDisplay: () => null,
}));

vi.mock('../chat/MessageList', async () => {
  const { useChatAreaMessageList } = await import('./chat-area/ChatAreaContext');

  const MessageList = React.memo(() => {
    mockState.renders.messageList();
    const { messages } = useChatAreaMessageList();
    return <div data-testid="message-list">{messages.length}</div>;
  });

  return { MessageList };
});

vi.mock('../chat/input/ChatInput', async () => {
  const { useChatAreaInput } = await import('./chat-area/ChatAreaContext');

  const ChatInput = React.memo(() => {
    mockState.renders.chatInput();
    const { commandedInput } = useChatAreaInput();
    return <div data-testid="chat-input">{commandedInput?.text ?? 'empty'}</div>;
  });

  return { ChatInput };
});

const createChatAreaProps = (overrides: Partial<ChatAreaProps['chatArea']> = {}): ChatAreaProps => ({
  chatArea: {
    session: {
      activeSessionId: 'session-1',
      sessionTitle: 'Session',
      currentChatSettings: {
        modelId: 'gemini-3.1-pro-preview',
        thinkingLevel: 'MEDIUM',
        showThoughts: false,
      } as any,
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
    },
    shell: {
      isAppDraggingOver: false,
      modelsLoadingError: null,
      handleAppDragEnter: vi.fn(),
      handleAppDragOver: vi.fn(),
      handleAppDragLeave: vi.fn(),
      handleAppDrop: vi.fn(),
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
      onTogglePip: vi.fn(),
    },
    messageActions: {
      setScrollContainerRef: vi.fn(),
      onScrollContainerScroll: vi.fn(),
      onEditMessage: vi.fn(),
      onDeleteMessage: vi.fn(),
      onRetryMessage: vi.fn(),
      onUpdateMessageFile: vi.fn(),
      onSuggestionClick: vi.fn(),
      onOrganizeInfoClick: vi.fn(),
      onFollowUpSuggestionClick: vi.fn(),
      onGenerateCanvas: vi.fn(),
      onContinueGeneration: vi.fn(),
      onQuickTTS: vi.fn(async () => null),
      onOpenSidePanel: vi.fn(),
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
      onToggleGoogleSearch: vi.fn(),
      onToggleCodeExecution: vi.fn(),
      onToggleLocalPython: vi.fn(),
      onToggleUrlContext: vi.fn(),
      onToggleDeepSearch: vi.fn(),
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
    },
    features: {
      isImageEditModel: false,
      isBBoxModeActive: false,
      isGuideModeActive: false,
      generateQuadImages: false,
      isGoogleSearchEnabled: false,
      isCodeExecutionEnabled: false,
      isLocalPythonEnabled: false,
      isUrlContextEnabled: false,
      isDeepSearchEnabled: false,
    },
    ...overrides,
  },
});

describe('ChatArea provider slice memoization', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mockState.chat.commandedInput = null;
    mockState.chat.selectedFiles = [];
    mockState.chat.editingMessageId = null;
    mockState.chat.appFileError = null;
    mockState.chat.ttsMessageId = null;
    mockState.ui.isHistorySidebarOpen = false;
    mockState.renders.messageList.mockClear();
    mockState.renders.chatInput.mockClear();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('does not re-render message-list consumers when only input slice state changes', () => {
    const props = createChatAreaProps();

    act(() => {
      root.render(<ChatArea {...props} />);
    });

    const messageListRenderCount = mockState.renders.messageList.mock.calls.length;
    const chatInputRenderCount = mockState.renders.chatInput.mock.calls.length;

    mockState.chat.commandedInput = {
      id: 1,
      mode: 'replace',
      text: 'updated input',
    };

    act(() => {
      root.render(<ChatArea {...props} />);
    });

    expect(mockState.renders.chatInput.mock.calls.length).toBeGreaterThan(chatInputRenderCount);
    expect(mockState.renders.messageList.mock.calls.length).toBe(messageListRenderCount);
  });

  it('does not re-render chat-input consumers when only message-list slice data changes', () => {
    const props = createChatAreaProps();

    act(() => {
      root.render(<ChatArea {...props} />);
    });

    const messageListRenderCount = mockState.renders.messageList.mock.calls.length;
    const chatInputRenderCount = mockState.renders.chatInput.mock.calls.length;

    const updatedProps: ChatAreaProps = {
      chatArea: {
        ...props.chatArea,
        session: {
          ...props.chatArea.session,
          messages: [
            ...props.chatArea.session.messages,
            {
              id: 'message-2',
              role: 'model',
              content: 'world',
              timestamp: new Date('2026-04-12T00:00:01.000Z'),
            },
          ],
        },
      },
    };

    act(() => {
      root.render(<ChatArea {...updatedProps} />);
    });

    expect(mockState.renders.messageList.mock.calls.length).toBeGreaterThan(messageListRenderCount);
    expect(mockState.renders.chatInput.mock.calls.length).toBe(chatInputRenderCount);
  });
});
