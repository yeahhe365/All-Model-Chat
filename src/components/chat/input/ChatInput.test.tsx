import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MediaResolution,
  type AppSettings,
  type ChatSettings,
  type InputCommand,
  type UploadedFile,
} from '../../../types';
import { ChatAreaProvider, type ChatAreaProviderValue } from '../../layout/chat-area/ChatAreaContext';
import { ChatInput } from './ChatInput';

const mockChatStoreState = vi.hoisted(() => ({
  selectedFiles: [] as unknown[],
}));
const mockModelCapabilities = vi.hoisted(() => ({
  value: {
    isImagenModel: false,
    isGemini3ImageModel: false,
    isTtsModel: false,
    isNativeAudioModel: false,
    isGemini3: false,
    supportedAspectRatios: [] as string[],
    supportedImageSizes: [] as string[],
  },
}));
const mockLiveApiState = vi.hoisted(() => ({
  connect: vi.fn(async () => true),
  disconnect: vi.fn(),
  toggleMute: vi.fn(),
  sendText: vi.fn(async () => true),
  sendContent: vi.fn(async () => true),
  startCamera: vi.fn(async () => true),
  startScreenShare: vi.fn(async () => true),
  stopVideo: vi.fn(),
  isConnected: false,
  isReconnecting: false,
  isMuted: false,
  isSpeaking: false,
  volume: 0,
  error: null as string | null,
  videoSource: null as 'camera' | 'screen' | null,
}));
const mockApiUtils = vi.hoisted(() => ({
  getKeyForRequest: vi.fn(() => ({ key: 'api-key', isNewKey: false })),
}));
const mockGeminiService = vi.hoisted(() => ({
  translateText: vi.fn(async () => 'Translated text'),
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
  useLiveAPI: () => mockLiveApiState,
}));

vi.mock('../../../utils/apiUtils', () => ({
  getKeyForRequest: mockApiUtils.getKeyForRequest,
}));

vi.mock('../../../services/geminiService', () => ({
  geminiServiceInstance: mockGeminiService,
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
  getModelCapabilities: () => mockModelCapabilities.value,
  isGemini3Model: (modelId: string) => modelId.includes('gemini-3'),
}));

vi.mock('../../../stores/chatStore', () => {
  const useChatStore = Object.assign(
    (selector?: (state: typeof mockChatStoreState) => unknown) =>
      selector ? selector(mockChatStoreState) : mockChatStoreState,
    {
      getState: () => mockChatStoreState,
      subscribe: (listener: (state: typeof mockChatStoreState, previousState: typeof mockChatStoreState) => void) => {
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
  const {
    useChatInputActionsView,
    useChatInputFileDisplayView,
    useChatInputFormView,
    useChatInputTextAreaView,
    useLiveStatusView,
    useQueuedSubmissionView,
  } = await import('./ChatInputViewContext');

  const ChatInputArea = () => {
    const formProps = useChatInputFormView();
    const inputProps = useChatInputTextAreaView();
    const actionsProps = useChatInputActionsView();
    const fileDisplayProps = useChatInputFileDisplayView();
    const queuedProps = useQueuedSubmissionView();
    const liveStatusProps = useLiveStatusView();
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
        {liveStatusProps ? (
          <div data-testid="live-status">
            <span data-testid="live-connected">{String(liveStatusProps.isConnected)}</span>
            <span data-testid="live-reconnecting">{String(liveStatusProps.isReconnecting)}</span>
            <span data-testid="live-error">{liveStatusProps.error ?? ''}</span>
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
        {actionsProps.showInputTranslationButton === true && (
          <button type="button" data-testid="translate-button" onClick={actionsProps.onTranslate}>
            translate
          </button>
        )}
        {actionsProps.showInputPasteButton !== false && (
          <button type="button" data-testid="paste-button" onClick={actionsProps.onPasteFromClipboard}>
            paste
          </button>
        )}
        {actionsProps.showInputClearButton === true && (
          <button type="button" data-testid="clear-input-button" onClick={actionsProps.onClearInput}>
            clear
          </button>
        )}
        <button type="button" data-testid="live-camera-button" onClick={actionsProps.onStartLiveCamera}>
          camera
        </button>
        <button type="button" data-testid="live-screen-button" onClick={actionsProps.onStartLiveScreenShare}>
          screen
        </button>
        {fileDisplayProps.selectedFiles.map((file: UploadedFile) => (
          <button
            key={file.id}
            type="button"
            data-testid={`move-file-${file.id}`}
            onClick={() => fileDisplayProps.onMoveTextToInput?.(file)}
          >
            move {file.name}
          </button>
        ))}
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
      onForkMessage: vi.fn(),
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
      selectedFiles: [] as UploadedFile[],
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
    mockModelCapabilities.value = {
      isImagenModel: false,
      isGemini3ImageModel: false,
      isTtsModel: false,
      isNativeAudioModel: false,
      isGemini3: false,
      supportedAspectRatios: [],
      supportedImageSizes: [],
    };
    Object.assign(mockLiveApiState, {
      connect: vi.fn(async () => true),
      disconnect: vi.fn(),
      toggleMute: vi.fn(),
      sendText: vi.fn(async () => true),
      sendContent: vi.fn(async () => true),
      startCamera: vi.fn(async () => true),
      startScreenShare: vi.fn(async () => true),
      stopVideo: vi.fn(),
      isConnected: false,
      isReconnecting: false,
      isMuted: false,
      isSpeaking: false,
      volume: 0,
      error: null,
      videoSource: null,
    });
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

  it('sends Live text turns with selected attachments through client content', async () => {
    const onAddUserMessage = vi.fn();
    const selectedFiles: UploadedFile[] = [
      {
        id: 'image-file',
        name: 'diagram.png',
        type: 'image/png',
        size: 128,
        uploadState: 'active',
        fileUri: 'files/diagram',
      },
    ];
    const providerValue = createProviderValue(null);
    providerValue.input.isLoading = false;
    providerValue.input.isEditing = false;
    providerValue.input.editMode = 'resend';
    providerValue.input.editingMessageId = null;
    providerValue.input.selectedFiles = selectedFiles;
    providerValue.input.onAddUserMessage = onAddUserMessage;
    providerValue.input.currentChatSettings.modelId = 'gemini-3.1-flash-live-preview';
    mockModelCapabilities.value = {
      ...mockModelCapabilities.value,
      isNativeAudioModel: true,
      isGemini3: true,
    };

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

      setTextareaValue(textarea, 'Describe this');
      dispatchKeyDown(textarea, 'Enter');
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockLiveApiState.connect).toHaveBeenCalled();
    expect(mockLiveApiState.sendContent).toHaveBeenCalledWith([
      {
        fileData: { mimeType: 'image/png', fileUri: 'files/diagram' },
        mediaResolution: { level: 'MEDIA_RESOLUTION_MEDIUM' },
      },
      { text: 'Describe this' },
    ]);
    expect(mockLiveApiState.sendText).not.toHaveBeenCalled();
    expect(onAddUserMessage).toHaveBeenCalledWith('Describe this', selectedFiles);
  });

  it('starts screen sharing and connects Live when the session is not connected', async () => {
    const providerValue = createProviderValue(null);
    providerValue.input.currentChatSettings.modelId = 'gemini-3.1-flash-live-preview';
    mockModelCapabilities.value = {
      ...mockModelCapabilities.value,
      isNativeAudioModel: true,
      isGemini3: true,
    };

    await act(async () => {
      root.render(
        <ChatAreaProvider value={providerValue}>
          <ChatInput />
        </ChatAreaProvider>,
      );
    });

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="live-screen-button"]')?.click();
      await Promise.resolve();
    });

    expect(mockLiveApiState.startScreenShare).toHaveBeenCalledTimes(1);
    expect(mockLiveApiState.connect).toHaveBeenCalledTimes(1);
  });

  it('starts the camera without reconnecting when Live is already connected', async () => {
    const providerValue = createProviderValue(null);
    providerValue.input.currentChatSettings.modelId = 'gemini-3.1-flash-live-preview';
    mockLiveApiState.isConnected = true;
    mockModelCapabilities.value = {
      ...mockModelCapabilities.value,
      isNativeAudioModel: true,
      isGemini3: true,
    };

    await act(async () => {
      root.render(
        <ChatAreaProvider value={providerValue}>
          <ChatInput />
        </ChatAreaProvider>,
      );
    });

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="live-camera-button"]')?.click();
      await Promise.resolve();
    });

    expect(mockLiveApiState.startCamera).toHaveBeenCalledTimes(1);
    expect(mockLiveApiState.connect).not.toHaveBeenCalled();
  });

  it('passes Live status through the focused status view hook', async () => {
    const providerValue = createProviderValue(null);
    mockLiveApiState.isConnected = true;
    mockLiveApiState.isReconnecting = true;
    mockLiveApiState.error = 'Live reconnecting';

    await act(async () => {
      root.render(
        <ChatAreaProvider value={providerValue}>
          <ChatInput />
        </ChatAreaProvider>,
      );
    });

    expect(container.querySelector('[data-testid="live-connected"]')?.textContent).toBe('true');
    expect(container.querySelector('[data-testid="live-reconnecting"]')?.textContent).toBe('true');
    expect(container.querySelector('[data-testid="live-error"]')?.textContent).toBe('Live reconnecting');
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
    expect(container.querySelector('[data-testid="queued-title"]')?.textContent).toBe('queuedSubmission_title');
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

  it('queues the next draft when pressing Enter while loading and auto-sends it after loading finishes', async () => {
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
    expect(textarea).not.toBeNull();

    await act(async () => {
      if (!textarea) {
        return;
      }

      setTextareaValue(textarea, 'Queue this via Enter');
      dispatchKeyDown(textarea, 'Enter');
    });

    expect(container.querySelector('[data-testid="queued-card"]')?.textContent).toContain('Queue this via Enter');
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

    expect(onSendMessage).toHaveBeenCalledWith('Queue this via Enter', { isFastMode: false, files: undefined });
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

  it('moves text file content into the composer and removes only that file from the selection', async () => {
    const setSelectedFiles = vi.fn();
    const providerValue = createProviderValue(null);
    const selectedFiles: UploadedFile[] = [
      {
        id: 'text-file',
        name: 'prompt.txt',
        type: 'text/plain',
        size: 24,
        uploadState: 'active',
        textContent: 'Prompt from attachment',
      },
      {
        id: 'image-file',
        name: 'diagram.png',
        type: 'image/png',
        size: 128,
        uploadState: 'active',
      },
    ];
    providerValue.input.selectedFiles = selectedFiles;
    providerValue.input.setSelectedFiles = setSelectedFiles;

    await act(async () => {
      root.render(
        <ChatAreaProvider value={providerValue}>
          <ChatInput />
        </ChatAreaProvider>,
      );
    });

    const textarea = container.querySelector<HTMLTextAreaElement>('[data-testid="chat-input-textarea"]');
    const moveButton = container.querySelector<HTMLButtonElement>('[data-testid="move-file-text-file"]');

    expect(textarea).not.toBeNull();
    expect(moveButton).not.toBeNull();

    await act(async () => {
      moveButton?.click();
    });

    expect(textarea?.value).toBe('Prompt from attachment');
    expect(setSelectedFiles).toHaveBeenCalledTimes(1);

    const removeConvertedFile = setSelectedFiles.mock.calls[0]?.[0] as
      | ((files: Array<{ id: string }>) => Array<{ id: string }>)
      | undefined;

    expect(removeConvertedFile).toBeTypeOf('function');
    expect(removeConvertedFile?.([{ id: 'text-file' }, { id: 'image-file' }])).toEqual([{ id: 'image-file' }]);
  });

  it('translates composer text using the configured target language', async () => {
    mockGeminiService.translateText.mockResolvedValueOnce('Bonjour');
    const providerValue = createProviderValue(null);
    providerValue.input.appSettings = {
      ...providerValue.input.appSettings,
      translationTargetLanguage: 'French',
      showInputTranslationButton: true,
    };
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
    const translateButton = container.querySelector<HTMLButtonElement>('[data-testid="translate-button"]');
    expect(textarea).not.toBeNull();
    expect(translateButton).not.toBeNull();

    await act(async () => {
      if (!textarea) {
        return;
      }

      setTextareaValue(textarea, 'Hello');
    });

    await act(async () => {
      translateButton?.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockGeminiService.translateText).toHaveBeenCalledWith('api-key', 'Hello', 'French', undefined);
    expect(textarea?.value).toBe('Bonjour');
  });

  it('translates composer text using the configured input translation model', async () => {
    mockGeminiService.translateText.mockResolvedValueOnce('Bonjour');
    const providerValue = createProviderValue(null);
    providerValue.input.appSettings = {
      ...providerValue.input.appSettings,
      translationTargetLanguage: 'French',
      inputTranslationModelId: 'gemini-custom-input-translator',
      showInputTranslationButton: true,
    } as AppSettings;
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
    const translateButton = container.querySelector<HTMLButtonElement>('[data-testid="translate-button"]');

    await act(async () => {
      if (!textarea) {
        return;
      }

      setTextareaValue(textarea, 'Hello');
    });

    await act(async () => {
      translateButton?.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockGeminiService.translateText).toHaveBeenCalledWith(
      'api-key',
      'Hello',
      'French',
      'gemini-custom-input-translator',
    );
  });

  it('hides the composer translate button when the setting is disabled', async () => {
    const providerValue = createProviderValue(null);
    providerValue.input.appSettings = {
      ...providerValue.input.appSettings,
      showInputTranslationButton: false,
    } as AppSettings;
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

    expect(container.querySelector('[data-testid="translate-button"]')).toBeNull();
  });

  it('hides the composer translate button by default', async () => {
    const providerValue = createProviderValue(null);
    providerValue.input.appSettings = {
      ...providerValue.input.appSettings,
      showInputTranslationButton: undefined,
    } as AppSettings;
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

    expect(container.querySelector('[data-testid="translate-button"]')).toBeNull();
  });

  it('appends clipboard text to the composer from the paste action', async () => {
    const readText = vi.fn(async () => ' clipboard text');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { readText },
    });
    const providerValue = createProviderValue(null);
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
    const pasteButton = container.querySelector<HTMLButtonElement>('[data-testid="paste-button"]');

    expect(textarea).not.toBeNull();
    expect(pasteButton).not.toBeNull();

    await act(async () => {
      if (!textarea) {
        return;
      }

      setTextareaValue(textarea, 'Existing');
    });

    await act(async () => {
      pasteButton?.click();
      await Promise.resolve();
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(readText).toHaveBeenCalledTimes(1);
    expect(textarea?.value).toBe('Existing clipboard text');
    expect(document.activeElement).toBe(textarea);
  });

  it('hides the paste button when the interface setting is disabled', async () => {
    const providerValue = createProviderValue(null);
    providerValue.input.appSettings = {
      ...providerValue.input.appSettings,
      showInputPasteButton: false,
    } as AppSettings;
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

    expect(container.querySelector('[data-testid="paste-button"]')).toBeNull();
  });

  it('clears the composer from the clear input action when enabled', async () => {
    const providerValue = createProviderValue(null);
    providerValue.input.appSettings = {
      ...providerValue.input.appSettings,
      showInputClearButton: true,
    } as AppSettings;
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
    const clearButton = container.querySelector<HTMLButtonElement>('[data-testid="clear-input-button"]');

    expect(textarea).not.toBeNull();
    expect(clearButton).not.toBeNull();

    await act(async () => {
      if (!textarea) {
        return;
      }

      setTextareaValue(textarea, 'Text to clear');
    });

    await act(async () => {
      clearButton?.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(textarea?.value).toBe('');
    expect(document.activeElement).toBe(textarea);
  });

  it('hides the clear input button by default', async () => {
    const providerValue = createProviderValue(null);
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

    expect(container.querySelector('[data-testid="clear-input-button"]')).toBeNull();
  });

  it('does not auto-send a pending message when an attachment finishes as failed', async () => {
    const onSendMessage = vi.fn();
    const setAppFileError = vi.fn();
    const processingFile: UploadedFile = {
      id: 'processing-file',
      name: 'large.pdf',
      type: 'application/pdf',
      size: 4096,
      uploadState: 'processing_api',
      isProcessing: true,
    };
    const failedFile: UploadedFile = {
      ...processingFile,
      uploadState: 'failed',
      isProcessing: false,
      error: 'Backend processing failed.',
    };
    const providerValue = createProviderValue(null);
    providerValue.input.isLoading = false;
    providerValue.input.isEditing = false;
    providerValue.input.editMode = 'resend';
    providerValue.input.editingMessageId = null;
    providerValue.input.selectedFiles = [processingFile];
    providerValue.input.onSendMessage = onSendMessage;
    providerValue.input.setAppFileError = setAppFileError;
    mockChatStoreState.selectedFiles = [processingFile];

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

      setTextareaValue(textarea, 'Summarize this file');
      dispatchKeyDown(textarea, 'Enter');
    });

    expect(onSendMessage).not.toHaveBeenCalled();

    await act(async () => {
      const previousState = { selectedFiles: [processingFile] };
      const nextState = { selectedFiles: [failedFile] };
      mockChatStoreState.selectedFiles = nextState.selectedFiles;
      mockChatStoreSubscribers.forEach((subscriber) => subscriber(nextState, previousState));
    });

    expect(onSendMessage).not.toHaveBeenCalled();
    expect(setAppFileError).toHaveBeenCalledWith('messageSender_fileUploadFailedBeforeSend');
  });
});
