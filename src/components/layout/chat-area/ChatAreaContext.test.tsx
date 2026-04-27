import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../../contexts/I18nContext';
import type { AppSettings, ChatSettings } from '../../../types';
import { ChatAreaProvider, ChatAreaProviderValue, useChatAreaInput, useChatAreaMessageList } from './ChatAreaContext';

const createProviderValue = (): ChatAreaProviderValue => ({
  messageList: {
    messages: [
      {
        id: 'message-1',
        role: 'user',
        content: 'hello',
        timestamp: new Date('2026-04-11T00:00:00.000Z'),
      },
      {
        id: 'message-2',
        role: 'model',
        content: 'world',
        timestamp: new Date('2026-04-11T00:00:01.000Z'),
      },
    ],
    sessionTitle: 'Provider Test',
    setScrollContainerRef: vi.fn(),
    onEditMessage: vi.fn(),
    onDeleteMessage: vi.fn(),
    onRetryMessage: vi.fn(),
    onUpdateMessageFile: vi.fn(),
    showThoughts: false,
    themeId: 'pearl',
    baseFontSize: 14,
    expandCodeBlocksByDefault: false,
    isMermaidRenderingEnabled: false,
    isGraphvizRenderingEnabled: true,
    onSuggestionClick: vi.fn(),
    onOrganizeInfoClick: vi.fn(),
    onFollowUpSuggestionClick: vi.fn(),
    onGenerateCanvas: vi.fn(),
    onContinueGeneration: vi.fn(),
    onQuickTTS: vi.fn(async () => null),
    chatInputHeight: 0,
    appSettings: { showWelcomeSuggestions: true } as AppSettings,
    currentModelId: 'gemini-3.1-pro-preview',
    onOpenSidePanel: vi.fn(),
    onQuote: vi.fn(),
    onInsert: vi.fn(),
    activeSessionId: 'session-1',
  },
  input: {
    appSettings: {
      isSystemAudioRecordingEnabled: false,
      isPasteRichTextAsMarkdownEnabled: true,
    } as AppSettings,
    currentChatSettings: {
      modelId: 'gemini-3.1-pro-preview',
      ttsVoice: 'Aoede',
      thinkingLevel: 'MEDIUM',
    } as ChatSettings,
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
  },
});

const HookProbe = () => {
  const messageList = useChatAreaMessageList();
  const input = useChatAreaInput();

  return (
    <div>
      <div data-testid="message-count">{String(messageList.messages.length)}</div>
      <div data-testid="input-model">{input.currentChatSettings.modelId}</div>
    </div>
  );
};

const OutsideProviderProbe = () => {
  useChatAreaMessageList();
  return null;
};

const MessageListRenderProbe = React.memo(({ onRender }: { onRender: () => void }) => {
  React.useEffect(() => {
    onRender();
  }, [onRender]);

  const { messages } = useChatAreaMessageList();

  return <div data-testid="render-probe">{messages.length}</div>;
});

describe('ChatAreaContext', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('throws when a slice hook is used outside ChatAreaProvider', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const suppressExpectedProviderError = (event: ErrorEvent) => {
      const message =
        event.error instanceof Error ? event.error.message : typeof event.message === 'string' ? event.message : '';

      if (message.includes('ChatAreaProvider')) {
        event.preventDefault();
      }
    };

    window.addEventListener('error', suppressExpectedProviderError);

    try {
      expect(() => {
        act(() => {
          root.render(<OutsideProviderProbe />);
        });
      }).toThrow(/ChatAreaProvider/);
    } finally {
      window.removeEventListener('error', suppressExpectedProviderError);
      consoleErrorSpy.mockRestore();
    }
  });

  it('exposes the message-list and chat-input slices from one provider value', () => {
    const value = createProviderValue();

    act(() => {
      root.render(
        <I18nProvider>
          <ChatAreaProvider value={value}>
            <HookProbe />
          </ChatAreaProvider>
        </I18nProvider>,
      );
    });

    expect(container.querySelector('[data-testid="message-count"]')?.textContent).toBe('2');
    expect(container.querySelector('[data-testid="input-model"]')?.textContent).toBe('gemini-3.1-pro-preview');
  });

  it('does not re-render message-list consumers when only the input slice changes', () => {
    const initialValue = createProviderValue();
    const onRender = vi.fn();

    act(() => {
      root.render(
        <I18nProvider>
          <ChatAreaProvider value={initialValue}>
            <MessageListRenderProbe onRender={onRender} />
          </ChatAreaProvider>
        </I18nProvider>,
      );
    });

    expect(onRender).toHaveBeenCalledTimes(1);

    const updatedValue: ChatAreaProviderValue = {
      messageList: initialValue.messageList,
      input: {
        ...initialValue.input,
        commandedInput: { id: 1, mode: 'replace', text: 'typed text' },
      },
    };

    act(() => {
      root.render(
        <I18nProvider>
          <ChatAreaProvider value={updatedValue}>
            <MessageListRenderProbe onRender={onRender} />
          </ChatAreaProvider>
        </I18nProvider>,
      );
    });

    expect(onRender).toHaveBeenCalledTimes(1);
  });
});
