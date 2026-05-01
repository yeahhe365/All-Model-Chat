import type { ComponentType, ReactNode } from 'react';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MessageList } from './MessageList';
import { AppSettings, ChatMessage, ChatSettings, UploadedFile } from '../../types';
import { I18nProvider } from '../../contexts/I18nContext';
import { ChatAreaProvider, ChatAreaProviderValue } from '../layout/chat-area/ChatAreaContext';

const messagePropsSpy = vi.fn();

interface VirtuosoMockProps<T> {
  data: T[];
  itemContent: (index: number, item: T) => ReactNode;
  components?: {
    Footer?: ComponentType;
  };
}

interface MessageMockProps {
  message: ChatMessage;
  onImageClick: (file: UploadedFile) => void;
}

vi.mock('react-virtuoso', () => ({
  Virtuoso: ({ data, itemContent, components }: VirtuosoMockProps<ChatMessage>) => (
    <div data-testid="virtuoso">
      {data.map((item, index) => itemContent(index, item))}
      {components?.Footer ? <components.Footer /> : null}
    </div>
  ),
}));

vi.mock('../message/Message', () => ({
  Message: (props: MessageMockProps) => {
    messagePropsSpy(props);

    return (
      <button
        type="button"
        data-testid={`open-preview-${props.message.id}`}
        onClick={() => props.onImageClick(props.message.files![0])}
      >
        Open preview
      </button>
    );
  },
}));

vi.mock('../modals/FilePreviewModal', () => ({
  FilePreviewModal: ({ file }: { file: UploadedFile | null }) =>
    file ? <div data-testid="file-preview-modal">{file.name}</div> : null,
}));

vi.mock('../modals/MarkdownPreviewModal', () => ({
  MarkdownPreviewModal: ({ file }: { file: UploadedFile | null }) =>
    file ? <div data-testid="markdown-preview-modal">{file.name}</div> : null,
}));

vi.mock('./message-list/hooks/useMessageListScroll', () => ({
  useMessageListScroll: () => ({
    virtuosoRef: { current: null },
    handleScrollerRef: () => {},
    handleScroll: () => {},
    setAtBottom: () => {},
    onRangeChanged: () => {},
    scrollToPrevTurn: () => {},
    scrollToNextTurn: () => {},
    showScrollDown: false,
    showScrollUp: false,
    scrollerRef: { current: null },
  }),
}));

vi.mock('./message-list/ScrollNavigation', () => ({
  ScrollNavigation: () => null,
}));

vi.mock('./message-list/TextSelectionToolbar', () => ({
  TextSelectionToolbar: () => null,
}));

vi.mock('./message-list/MessageListFooter', () => ({
  MessageListFooter: () => null,
}));

vi.mock('./message-list/WelcomeScreen', () => ({
  WelcomeScreen: () => null,
}));

describe('MessageList image preview', () => {
  let container: HTMLDivElement;
  let root: Root;

  const file: UploadedFile = {
    id: 'file-1',
    name: 'demo.png',
    type: 'image/png',
    size: 128,
    dataUrl: 'blob:demo',
    uploadState: 'active',
  };

  const messages: ChatMessage[] = [
    {
      id: 'message-1',
      role: 'model',
      content: '',
      files: [file],
      timestamp: new Date('2026-04-10T00:00:00.000Z'),
    },
  ];

  const createProviderValue = (messageFiles: UploadedFile[] = [file]): ChatAreaProviderValue => ({
    messageList: {
      messages: [{ ...messages[0], files: messageFiles }],
      sessionTitle: 'Test',
      setScrollContainerRef: () => {},
      onEditMessage: () => {},
      onDeleteMessage: () => {},
      onRetryMessage: () => {},
      onUpdateMessageFile: () => {},
      showThoughts: false,
      onGenerateCanvas: () => {},
      onContinueGeneration: () => {},
      onForkMessage: () => {},
      onQuickTTS: async () => null,
      chatInputHeight: 0,
      currentModelId: 'gemini-2.5-flash',
      onOpenSidePanel: () => {},
      onQuote: () => {},
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
      setAppFileError: () => {},
      activeSessionId: 'session-1',
      commandedInput: null,
      onMessageSent: () => {},
      selectedFiles: [],
      setSelectedFiles: () => {},
      onSendMessage: () => {},
      isLoading: false,
      isEditing: false,
      onStopGenerating: () => {},
      onCancelEdit: () => {},
      onProcessFiles: async () => {},
      onAddFileById: async () => {},
      onCancelUpload: () => {},
      onTranscribeAudio: async () => null,
      isProcessingFile: false,
      fileError: null,
      isImagenModel: false,
      isImageEditModel: false,
      aspectRatio: '1:1',
      setAspectRatio: () => {},
      imageSize: '1K',
      setImageSize: () => {},
      isGoogleSearchEnabled: false,
      onToggleGoogleSearch: () => {},
      isCodeExecutionEnabled: false,
      onToggleCodeExecution: () => {},
      isLocalPythonEnabled: false,
      onToggleLocalPython: () => {},
      isUrlContextEnabled: false,
      onToggleUrlContext: () => {},
      isDeepSearchEnabled: false,
      onToggleDeepSearch: () => {},
      onClearChat: () => {},
      onNewChat: () => {},
      onOpenSettings: () => {},
      onToggleCanvasPrompt: () => {},
      onTogglePinCurrentSession: () => {},
      onRetryLastTurn: () => {},
      onSelectModel: () => {},
      availableModels: [],
      onEditLastUserMessage: () => {},
      onTogglePip: () => {},
      isPipActive: false,
      generateQuadImages: false,
      onToggleQuadImages: () => {},
      setCurrentChatSettings: vi.fn(),
      onSuggestionClick: () => {},
      onOrganizeInfoClick: () => {},
      showEmptyStateSuggestions: false,
      editMode: 'update',
      onUpdateMessageContent: () => {},
      editingMessageId: null,
      setEditingMessageId: () => {},
      onAddUserMessage: () => {},
      onLiveTranscript: () => {},
      onToggleBBox: () => {},
      isBBoxModeActive: false,
      onToggleGuide: () => {},
      isGuideModeActive: false,
      themeId: 'pearl',
    },
  });

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

  it('shows the file preview after clicking an image', async () => {
    act(() => {
      root.render(
        <I18nProvider>
          <ChatAreaProvider value={createProviderValue()}>
            <MessageList />
          </ChatAreaProvider>
        </I18nProvider>,
      );
    });

    const trigger = document.querySelector('[data-testid="open-preview-message-1"]');
    expect(trigger).not.toBeNull();

    await act(async () => {
      trigger!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(document.querySelector('[data-testid="file-preview-modal"]')).toBeInTheDocument();
    expect(document.querySelector('[data-testid="markdown-preview-modal"]')).not.toBeInTheDocument();
  });

  it('opens markdown files in the dedicated markdown preview modal', async () => {
    const markdownFile: UploadedFile = {
      id: 'markdown-1',
      name: 'notes.md',
      type: 'text/markdown',
      size: 128,
      textContent: '# Notes',
      uploadState: 'active',
    };

    act(() => {
      root.render(
        <I18nProvider>
          <ChatAreaProvider value={createProviderValue([markdownFile])}>
            <MessageList />
          </ChatAreaProvider>
        </I18nProvider>,
      );
    });

    const trigger = document.querySelector('[data-testid="open-preview-message-1"]');
    expect(trigger).not.toBeNull();

    await act(async () => {
      trigger!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(document.querySelector('[data-testid="markdown-preview-modal"]')).toBeInTheDocument();
    expect(document.querySelector('[data-testid="file-preview-modal"]')).not.toBeInTheDocument();
  });

  it('does not pass global display settings through MessageList to Message', () => {
    act(() => {
      root.render(
        <I18nProvider>
          <ChatAreaProvider value={createProviderValue()}>
            <MessageList />
          </ChatAreaProvider>
        </I18nProvider>,
      );
    });

    const props = messagePropsSpy.mock.calls[0]?.[0] as Record<string, unknown> | undefined;

    expect(props).toBeDefined();
    expect(props).not.toHaveProperty('themeId');
    expect(props).not.toHaveProperty('baseFontSize');
    expect(props).not.toHaveProperty('expandCodeBlocksByDefault');
    expect(props).not.toHaveProperty('isMermaidRenderingEnabled');
    expect(props).not.toHaveProperty('isGraphvizRenderingEnabled');
    expect(props).not.toHaveProperty('appSettings');
  });
});
