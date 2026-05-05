import React, { act } from 'react';
import { setupTestRenderer } from '@/test/testUtils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createChatAreaProps } from '../../test/chatAreaFixtures';
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
    selectedFiles: [] as Array<{ id: string; name: string }>,
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
    imageOutputMode: 'IMAGE_TEXT',
    setImageOutputMode: vi.fn(),
    personGeneration: 'ALLOW_ADULT',
    setPersonGeneration: vi.fn(),
  },
  ui: {
    isHistorySidebarOpen: false,
  },
  renders: {
    messageList: vi.fn(),
    chatInput: vi.fn(),
  },
  lastInputContext: null as Record<string, unknown> | null,
}));

const dispatchTouchEvent = (
  node: Element,
  type: 'touchstart' | 'touchend',
  touches: Array<{ clientX: number; clientY: number }>,
) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'touches', {
    configurable: true,
    value: type === 'touchend' ? [] : touches,
  });
  Object.defineProperty(event, 'changedTouches', {
    configurable: true,
    value: touches,
  });
  node.dispatchEvent(event);
};

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
  const { useChatStore } = await import('../../stores/chatStore');
  const { useChatAreaInput } = await import('./chat-area/ChatAreaContext');

  const ChatInput = React.memo(() => {
    mockState.renders.chatInput();
    const commandedInput = useChatStore((state) => state.commandedInput);
    mockState.lastInputContext = useChatAreaInput() as unknown as Record<string, unknown>;
    return <div data-testid="chat-input">{commandedInput?.text ?? 'empty'}</div>;
  });

  return { ChatInput };
});

describe('ChatArea provider slice memoization', () => {
  const renderer = setupTestRenderer();
  let matchMediaMatches = false;
  let windowInnerWidth = 1024;
  const virtualKeyboardShow = vi.fn();

  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: windowInnerWidth,
    });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: matchMediaMatches,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
        onchange: null,
      })),
    });
    Object.defineProperty(window.navigator, 'virtualKeyboard', {
      configurable: true,
      value: {
        show: virtualKeyboardShow,
      },
    });

    mockState.chat.commandedInput = null;
    mockState.chat.selectedFiles = [];
    mockState.chat.editingMessageId = null;
    mockState.chat.appFileError = null;
    mockState.lastInputContext = null;
    mockState.ui.isHistorySidebarOpen = false;
    mockState.renders.messageList.mockClear();
    mockState.renders.chatInput.mockClear();
    virtualKeyboardShow.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('does not re-render message-list consumers when only input slice state changes', () => {
    const props = createChatAreaProps();

    act(() => {
      renderer.root.render(<ChatArea {...props} />);
    });

    const messageListRenderCount = mockState.renders.messageList.mock.calls.length;
    mockState.chat.commandedInput = {
      id: 1,
      mode: 'replace',
      text: 'updated input',
    };

    act(() => {
      renderer.root.render(<ChatArea {...props} />);
    });

    expect(mockState.renders.messageList.mock.calls.length).toBe(messageListRenderCount);
  });

  it('provides store-backed composer state through the input context', () => {
    mockState.chat.selectedFiles = [{ id: 'file-1', name: 'one.png' }];
    mockState.chat.commandedInput = {
      id: 1,
      mode: 'replace',
      text: 'context input',
    };

    const props = createChatAreaProps();

    act(() => {
      renderer.root.render(<ChatArea {...props} />);
    });

    expect(mockState.lastInputContext).toMatchObject({
      appSettings: mockState.settings.appSettings,
      activeSessionId: 'session-1',
      commandedInput: mockState.chat.commandedInput,
      selectedFiles: mockState.chat.selectedFiles,
      setSelectedFiles: mockState.chat.setSelectedFiles,
      setAppFileError: mockState.chat.setAppFileError,
      editMode: mockState.chat.editMode,
      editingMessageId: mockState.chat.editingMessageId,
      setEditingMessageId: mockState.chat.setEditingMessageId,
      isProcessingFile: mockState.chat.isAppProcessingFile,
      fileError: mockState.chat.appFileError,
      aspectRatio: mockState.chat.aspectRatio,
      setAspectRatio: mockState.chat.setAspectRatio,
      imageSize: mockState.chat.imageSize,
      setImageSize: mockState.chat.setImageSize,
      imageOutputMode: mockState.chat.imageOutputMode,
      setImageOutputMode: mockState.chat.setImageOutputMode,
      personGeneration: mockState.chat.personGeneration,
      setPersonGeneration: mockState.chat.setPersonGeneration,
      themeId: mockState.settings.currentTheme.id,
    });
  });

  it('does not re-render chat-input consumers when only message-list slice data changes', () => {
    const props = createChatAreaProps();

    act(() => {
      renderer.root.render(<ChatArea {...props} />);
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
      renderer.root.render(<ChatArea {...updatedProps} />);
    });

    expect(mockState.renders.messageList.mock.calls.length).toBeGreaterThan(messageListRenderCount);
    expect(mockState.renders.chatInput.mock.calls.length).toBe(chatInputRenderCount);
  });

  it('does not focus the composer after a downward swipe in the chat area on mobile', () => {
    matchMediaMatches = true;
    windowInnerWidth = 390;
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: windowInnerWidth,
    });

    const composer = document.createElement('textarea');
    composer.setAttribute('aria-label', 'Chat message input');
    composer.value = 'Draft message';
    document.body.appendChild(composer);
    const focusSpy = vi.spyOn(composer, 'focus');
    const selectionSpy = vi.spyOn(composer, 'setSelectionRange');

    const props = createChatAreaProps();

    act(() => {
      renderer.root.render(<ChatArea {...props} />);
    });

    const chatArea = renderer.container.querySelector('.chat-bg-enhancement');
    expect(chatArea).not.toBeNull();

    act(() => {
      dispatchTouchEvent(chatArea!, 'touchstart', [{ clientX: 100, clientY: 160 }]);
      dispatchTouchEvent(chatArea!, 'touchend', [{ clientX: 102, clientY: 250 }]);
    });

    expect(focusSpy).not.toHaveBeenCalled();
    expect(selectionSpy).not.toHaveBeenCalled();
    expect(virtualKeyboardShow).not.toHaveBeenCalled();
  });
});
