import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaResolution, type AppSettings, type ChatSettings, type InputCommand } from '../../../types';
import { ChatAreaProvider, type ChatAreaProviderValue } from '../../layout/chat-area/ChatAreaContext';
import { ChatInput } from './ChatInput';

const mockChatStoreState = vi.hoisted(() => ({
  selectedFiles: [] as unknown[],
}));

const mockChatStoreSubscribers = vi.hoisted(
  () => new Set<(state: typeof mockChatStoreState, previousState: typeof mockChatStoreState) => void>(),
);

vi.mock('../../../contexts/I18nContext', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../../hooks/useDevice', () => ({
  useIsDesktop: () => true,
  useIsMobile: () => false,
}));

vi.mock('../../../contexts/WindowContext', () => ({
  useWindowContext: () => ({
    document,
  }),
}));

vi.mock('../../../hooks/useVoiceInput', () => ({
  useVoiceInput: () => ({
    isRecording: false,
    isMicInitializing: false,
    isTranscribing: false,
    handleVoiceInputClick: vi.fn(),
    handleCancelRecording: vi.fn(),
  }),
}));

vi.mock('../../../hooks/useLiveAPI', () => ({
  useLiveAPI: () => ({
    connect: vi.fn(async () => {}),
    disconnect: vi.fn(),
    toggleMute: vi.fn(),
    sendText: vi.fn(),
    isConnected: false,
    isMuted: false,
    isSpeaking: false,
    volume: 0,
    error: null,
  }),
}));

vi.mock('../../../hooks/ui/useFileModalState', () => ({
  useFileModalState: () => ({
    previewFile: null,
    closePreview: vi.fn(),
    allImages: [],
    currentImageIndex: 0,
    handlePrevImage: vi.fn(),
    handleNextImage: vi.fn(),
    configuringFile: null,
    setConfiguringFile: vi.fn(),
    openPreview: vi.fn(),
    openConfiguration: vi.fn(),
    isPreviewEditable: false,
  }),
}));

vi.mock('../../../utils/modelHelpers', () => ({
  getModelCapabilities: () => ({
    isImagenModel: false,
    isGemini3ImageModel: false,
    isTtsModel: false,
    isNativeAudioModel: false,
    isGemini3: false,
    supportedAspectRatios: [],
    supportedImageSizes: [],
  }),
}));

vi.mock('../../../stores/chatStore', () => {
  const useChatStore = Object.assign(
    (selector?: (state: typeof mockChatStoreState) => unknown) =>
      selector ? selector(mockChatStoreState) : mockChatStoreState,
    {
      getState: () => mockChatStoreState,
      subscribe: (
        listener: (state: typeof mockChatStoreState, previousState: typeof mockChatStoreState) => void,
      ) => {
        mockChatStoreSubscribers.add(listener);
        return () => mockChatStoreSubscribers.delete(listener);
      },
    },
  );

  return { useChatStore };
});

vi.mock('./ChatInputModals', () => ({
  ChatInputModals: () => null,
}));

vi.mock('./ChatInputFileModals', () => ({
  ChatInputFileModals: () => null,
}));

vi.mock('./ChatInputArea', async () => {
  const { useChatInputView } = await import('./ChatInputViewContext');

  const ChatInputArea = () => {
    const { formProps, inputProps, actionsProps } = useChatInputView();
    const queuedProps = (useChatInputView() as any).queuedSubmissionProps;
    const extendedActionsProps = actionsProps as typeof actionsProps & {
      canQueueMessage?: boolean;
      onQueueMessage?: () => void;
    };

    return (
      <form onSubmit={formProps.onSubmit}>
        <div data-testid="chat-input-value">{inputProps.value}</div>
        {queuedProps ? (
          <div data-testid="queued-card">
            <div data-testid="queued-title">{queuedProps.title}</div>
            <div data-testid="queued-preview">{queuedProps.previewText}</div>
            <button type="button" data-testid="queued-edit" onClick={queuedProps.onEdit}>
              edit
            </button>
            <button type="button" data-testid="queued-remove" onClick={queuedProps.onRemove}>
              remove
            </button>
          </div>
        ) : null}
        <textarea
          data-testid="chat-input-textarea"
          ref={inputProps.textareaRef}
          value={inputProps.value}
          onChange={inputProps.onChange}
          onKeyDown={inputProps.onKeyDown}
          onPaste={inputProps.onPaste}
          onCompositionStart={inputProps.onCompositionStart}
          onCompositionEnd={inputProps.onCompositionEnd}
          onFocus={inputProps.onFocus}
          disabled={inputProps.disabled}
        />
        <button
          type="button"
          data-testid="queue-button"
          onClick={() => extendedActionsProps.onQueueMessage?.()}
          disabled={!extendedActionsProps.canQueueMessage}
        >
          queue
        </button>
      </form>
    );
  };

  return { ChatInputArea };
});

const createProviderValue = (commandedInput: InputCommand | null) =>
  ({
    messageList: {
      messages: [],
      sessionTitle: 'Session',
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
      appSettings: { showWelcomeSuggestions: false } as AppSettings,
      currentModelId: 'gemini-3.1-pro-preview',
      onOpenSidePanel: vi.fn(),
      onQuote: vi.fn(),
      onInsert: vi.fn(),
      activeSessionId: 'session-1',
    },
    input: {
      appSettings: {
        isAudioCompressionEnabled: false,
        isSystemAudioRecordingEnabled: false,
        isPasteRichTextAsMarkdownEnabled: true,
      } as AppSettings,
      currentChatSettings: {
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
      } as ChatSettings,
      setAppFileError: vi.fn(),
      activeSessionId: 'session-1',
      commandedInput,
      onMessageSent: vi.fn(),
      selectedFiles: [],
      setSelectedFiles: vi.fn(),
      onSendMessage: vi.fn(),
      isLoading: false as boolean,
      isEditing: true as boolean,
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
      editMode: 'update' as 'update' | 'resend',
      onUpdateMessageContent: vi.fn(),
      editingMessageId: 'message-1' as string | null,
      setEditingMessageId: vi.fn(),
      onAddUserMessage: vi.fn(),
      onLiveTranscript: vi.fn(),
      liveClientFunctions: undefined,
      onToggleBBox: vi.fn(),
      isBBoxModeActive: false,
      onToggleGuide: vi.fn(),
      isGuideModeActive: false,
      themeId: 'pearl',
    },
  }) satisfies ChatAreaProviderValue;

describe('ChatInput', () => {
  let container: HTMLDivElement;
  let root: Root;

  const setTextareaValue = (textarea: HTMLTextAreaElement, value: string) => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');

    descriptor?.set?.call(textarea, value);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const dispatchKeyDown = (element: HTMLTextAreaElement, key: string) => {
    element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  };

  beforeEach(() => {
    localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockChatStoreState.selectedFiles = [];
    mockChatStoreSubscribers.clear();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('preserves user edits after commanded input pre-fills edit mode text', async () => {
    const providerValue = createProviderValue({
      id: 1,
      mode: 'replace',
      text: 'Original message',
    });

    await act(async () => {
      root.render(
        <ChatAreaProvider value={providerValue}>
          <ChatInput />
        </ChatAreaProvider>,
      );
    });

    const textarea = container.querySelector<HTMLTextAreaElement>('[data-testid="chat-input-textarea"]');
    const valueProbe = container.querySelector<HTMLElement>('[data-testid="chat-input-value"]');
    expect(textarea).not.toBeNull();
    expect(textarea?.value).toBe('Original message');
    expect(valueProbe?.textContent).toBe('Original message');

    await act(async () => {
      if (!textarea) {
        return;
      }

      setTextareaValue(textarea, 'Original message updated');
    });

    expect(textarea?.value).toBe('Original message updated');
    expect(valueProbe?.textContent).toBe('Original message updated');
  });

  it('sends slash-prefixed text when it does not match an executable command', async () => {
    const onSendMessage = vi.fn();
    const providerValue = createProviderValue(null);
    providerValue.input.isLoading = false;
    providerValue.input.isEditing = false;
    providerValue.input.editMode = 'resend';
    providerValue.input.editingMessageId = null;
    providerValue.input.onSendMessage = onSendMessage;

    await act(async () => {
      root.render(
        <ChatAreaProvider value={providerValue}>
          <ChatInput />
        </ChatAreaProvider>,
      );
    });

    const textarea = container.querySelector<HTMLTextAreaElement>('[data-testid="chat-input-textarea"]');
    expect(textarea).not.toBeNull();

    await act(async () => {
      if (!textarea) {
        return;
      }

      setTextareaValue(textarea, '/api/v1 docs');
      dispatchKeyDown(textarea, 'Enter');
    });

    expect(onSendMessage).toHaveBeenCalledWith('/api/v1 docs', { isFastMode: false, files: undefined });
  });

  it('sends exact command text with trailing whitespace instead of auto-executing it', async () => {
    const onSendMessage = vi.fn();
    const providerValue = createProviderValue(null);
    providerValue.input.isLoading = false;
    providerValue.input.isEditing = false;
    providerValue.input.editMode = 'resend';
    providerValue.input.editingMessageId = null;
    providerValue.input.onSendMessage = onSendMessage;

    await act(async () => {
      root.render(
        <ChatAreaProvider value={providerValue}>
          <ChatInput />
        </ChatAreaProvider>,
      );
    });

    const textarea = container.querySelector<HTMLTextAreaElement>('[data-testid="chat-input-textarea"]');
    expect(textarea).not.toBeNull();

    await act(async () => {
      if (!textarea) {
        return;
      }

      setTextareaValue(textarea, '/help ');
      dispatchKeyDown(textarea, 'Enter');
    });

    expect(onSendMessage).toHaveBeenCalledWith('/help ', { isFastMode: false, files: undefined });
    expect(providerValue.input.onClearChat).not.toHaveBeenCalled();
  });

  it('queues the next draft while loading and auto-sends it after loading finishes', async () => {
    const onSendMessage = vi.fn();
    const providerValue = createProviderValue(null);
    providerValue.input.isLoading = true;
    providerValue.input.isEditing = false;
    providerValue.input.editMode = 'resend';
    providerValue.input.editingMessageId = null;
    providerValue.input.onSendMessage = onSendMessage;

    await act(async () => {
      root.render(
        <ChatAreaProvider value={providerValue}>
          <ChatInput />
        </ChatAreaProvider>,
      );
    });

    const textarea = container.querySelector<HTMLTextAreaElement>('[data-testid="chat-input-textarea"]');
    const queueButton = container.querySelector<HTMLButtonElement>('[data-testid="queue-button"]');
    expect(textarea).not.toBeNull();
    expect(queueButton).not.toBeNull();

    await act(async () => {
      if (!textarea) {
        return;
      }

      setTextareaValue(textarea, 'Queue this next');
    });

    expect(queueButton?.disabled).toBe(false);

    await act(async () => {
      queueButton?.click();
    });

    expect(container.querySelector('[data-testid="queued-card"]')?.textContent).toContain('Queue this next');
    expect(textarea?.value).toBe('');

    const completedProviderValue = {
      ...providerValue,
      input: {
        ...providerValue.input,
        isLoading: false,
      },
    } satisfies ChatAreaProviderValue;

    await act(async () => {
      root.render(
        <ChatAreaProvider value={completedProviderValue}>
          <ChatInput />
        </ChatAreaProvider>,
      );
    });

    expect(onSendMessage).toHaveBeenCalledWith('Queue this next', { isFastMode: false, files: undefined });
  });

  it('preserves a newer draft when a queued message auto-sends', async () => {
    const onSendMessage = vi.fn();
    const providerValue = createProviderValue(null);
    providerValue.input.isLoading = true;
    providerValue.input.isEditing = false;
    providerValue.input.editMode = 'resend';
    providerValue.input.editingMessageId = null;
    providerValue.input.onSendMessage = onSendMessage;

    await act(async () => {
      root.render(
        <ChatAreaProvider value={providerValue}>
          <ChatInput />
        </ChatAreaProvider>,
      );
    });

    const textarea = container.querySelector<HTMLTextAreaElement>('[data-testid="chat-input-textarea"]');
    const queueButton = container.querySelector<HTMLButtonElement>('[data-testid="queue-button"]');
    expect(textarea).not.toBeNull();
    expect(queueButton).not.toBeNull();

    await act(async () => {
      if (!textarea) {
        return;
      }

      setTextareaValue(textarea, 'Queue this next');
      queueButton?.click();
    });

    await act(async () => {
      if (!textarea) {
        return;
      }

      setTextareaValue(textarea, 'Draft after queueing');
    });

    const completedProviderValue = {
      ...providerValue,
      input: {
        ...providerValue.input,
        isLoading: false,
      },
    } satisfies ChatAreaProviderValue;

    await act(async () => {
      root.render(
        <ChatAreaProvider value={completedProviderValue}>
          <ChatInput />
        </ChatAreaProvider>,
      );
    });

    expect(onSendMessage).toHaveBeenCalledWith('Queue this next', { isFastMode: false, files: undefined });
    expect(textarea?.value).toBe('Draft after queueing');
  });

  it('keeps a queued message bound to its original session before auto-sending', async () => {
    const sessionOneSend = vi.fn();
    const sessionTwoSend = vi.fn();
    const providerValue = createProviderValue(null);
    providerValue.input.isLoading = true;
    providerValue.input.isEditing = false;
    providerValue.input.editMode = 'resend';
    providerValue.input.editingMessageId = null;
    providerValue.input.onSendMessage = sessionOneSend;

    await act(async () => {
      root.render(
        <ChatAreaProvider value={providerValue}>
          <ChatInput />
        </ChatAreaProvider>,
      );
    });

    const textarea = container.querySelector<HTMLTextAreaElement>('[data-testid="chat-input-textarea"]');
    const queueButton = container.querySelector<HTMLButtonElement>('[data-testid="queue-button"]');
    expect(textarea).not.toBeNull();
    expect(queueButton).not.toBeNull();

    await act(async () => {
      if (!textarea) {
        return;
      }

      setTextareaValue(textarea, 'Queue for session one');
      queueButton?.click();
    });

    const sessionTwoProviderValue = {
      ...providerValue,
      messageList: {
        ...providerValue.messageList,
        activeSessionId: 'session-2',
      },
      input: {
        ...providerValue.input,
        activeSessionId: 'session-2',
        isLoading: false,
        onSendMessage: sessionTwoSend,
      },
    } satisfies ChatAreaProviderValue;

    await act(async () => {
      root.render(
        <ChatAreaProvider value={sessionTwoProviderValue}>
          <ChatInput />
        </ChatAreaProvider>,
      );
    });

    expect(sessionTwoSend).not.toHaveBeenCalled();
    expect(container.querySelector('[data-testid="queued-card"]')).toBeNull();

    const completedOriginalSession = {
      ...providerValue,
      input: {
        ...providerValue.input,
        isLoading: false,
        onSendMessage: sessionOneSend,
      },
    } satisfies ChatAreaProviderValue;

    await act(async () => {
      root.render(
        <ChatAreaProvider value={completedOriginalSession}>
          <ChatInput />
        </ChatAreaProvider>,
      );
    });

    expect(sessionOneSend).toHaveBeenCalledWith('Queue for session one', {
      isFastMode: false,
      files: undefined,
    });
  });

  it('restores queued draft text back into the composer when editing the queued card', async () => {
    const providerValue = createProviderValue(null);
    providerValue.input.isLoading = true;
    providerValue.input.isEditing = false;
    providerValue.input.editMode = 'resend';
    providerValue.input.editingMessageId = null;

    await act(async () => {
      root.render(
        <ChatAreaProvider value={providerValue}>
          <ChatInput />
        </ChatAreaProvider>,
      );
    });

    const textarea = container.querySelector<HTMLTextAreaElement>('[data-testid="chat-input-textarea"]');
    const queueButton = container.querySelector<HTMLButtonElement>('[data-testid="queue-button"]');
    expect(textarea).not.toBeNull();
    expect(queueButton).not.toBeNull();

    await act(async () => {
      if (!textarea) {
        return;
      }

      setTextareaValue(textarea, 'Bring this back');
      queueButton?.click();
    });

    expect(container.querySelector('[data-testid="queued-card"]')).not.toBeNull();

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="queued-edit"]')?.click();
    });

    expect(container.querySelector('[data-testid="queued-card"]')).toBeNull();
    expect(textarea?.value).toBe('Bring this back');
  });
});
