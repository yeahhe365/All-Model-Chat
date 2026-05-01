import type { ComponentType, ReactNode } from 'react';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppSettings, ChatMessage, ChatSettings, UploadedFile } from '../../types';
import type { ChatAreaProviderValue } from '../layout/chat-area/ChatAreaContext';

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

const createProviderValue = (): ChatAreaProviderValue => ({
  messageList: {
    messages,
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

const mockedModuleIds = [
  'react-virtuoso',
  '../message/Message',
  '../modals/FilePreviewModal',
  '../modals/FileConfigurationModal',
  './message-list/hooks/useMessageListScroll',
  './message-list/ScrollNavigation',
  './message-list/TextSelectionToolbar',
  './message-list/MessageListFooter',
  './message-list/WelcomeScreen',
];

const loadMessageList = async (moduleLoadTracker: { count: number }) => {
  vi.resetModules();

  vi.doMock('react-virtuoso', () => ({
    Virtuoso: ({ data, itemContent, components }: VirtuosoMockProps<ChatMessage>) => (
      <div data-testid="virtuoso">
        {data.map((item, index) => itemContent(index, item))}
        {components?.Footer ? <components.Footer /> : null}
      </div>
    ),
  }));

  vi.doMock('../message/Message', () => ({
    Message: ({ message, onImageClick }: MessageMockProps) => (
      <button type="button" data-testid={`open-preview-${message.id}`} onClick={() => onImageClick(message.files![0])}>
        Open preview
      </button>
    ),
  }));

  vi.doMock('../modals/FilePreviewModal', () => {
    moduleLoadTracker.count += 1;

    return {
      FilePreviewModal: ({ file: previewFile }: { file: UploadedFile | null }) =>
        previewFile ? <div data-testid="file-preview-modal">{previewFile.name}</div> : null,
    };
  });

  vi.doMock('../modals/FileConfigurationModal', () => ({
    FileConfigurationModal: () => null,
  }));

  vi.doMock('./message-list/hooks/useMessageListScroll', () => ({
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

  vi.doMock('./message-list/ScrollNavigation', () => ({
    ScrollNavigation: () => null,
  }));

  vi.doMock('./message-list/TextSelectionToolbar', () => ({
    TextSelectionToolbar: () => null,
  }));

  vi.doMock('./message-list/MessageListFooter', () => ({
    MessageListFooter: () => null,
  }));

  vi.doMock('./message-list/WelcomeScreen', () => ({
    WelcomeScreen: () => null,
  }));

  const module = await import('./MessageList');
  const contextModule = await import('../layout/chat-area/ChatAreaContext');
  const i18nModule = await import('../../contexts/I18nContext');

  return {
    MessageList: module.MessageList,
    ChatAreaProvider: contextModule.ChatAreaProvider,
    I18nProvider: i18nModule.I18nProvider,
  };
};

describe('MessageList preview chunking', () => {
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
    vi.resetModules();

    mockedModuleIds.forEach((moduleId) => {
      vi.doUnmock(moduleId);
    });
  });

  it('does not load the file preview modal module until the user opens a preview', async () => {
    const moduleLoadTracker = { count: 0 };
    const { MessageList, ChatAreaProvider, I18nProvider } = await loadMessageList(moduleLoadTracker);

    expect(moduleLoadTracker.count).toBe(0);

    act(() => {
      root.render(
        <I18nProvider>
          <ChatAreaProvider value={createProviderValue()}>
            <MessageList />
          </ChatAreaProvider>
        </I18nProvider>,
      );
    });

    expect(moduleLoadTracker.count).toBe(0);

    const trigger = document.querySelector('[data-testid="open-preview-message-1"]');
    expect(trigger).not.toBeNull();

    await act(async () => {
      trigger!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(moduleLoadTracker.count).toBe(1);
    expect(document.querySelector('[data-testid="file-preview-modal"]')).toBeInTheDocument();
  });
});
