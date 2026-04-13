import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MessageList } from './MessageList';
import { ChatMessage, UploadedFile } from '../../types';
import { ChatAreaProvider, ChatAreaProviderValue } from '../layout/chat-area/ChatAreaContext';

vi.mock('react-virtuoso', () => ({
  Virtuoso: ({ data, itemContent, components }: any) => (
    <div data-testid="virtuoso">
      {data.map((item: any, index: number) => itemContent(index, item))}
      {components?.Footer ? <components.Footer /> : null}
    </div>
  ),
}));

vi.mock('../message/Message', () => ({
  Message: ({ message, onImageClick }: any) => (
    <button
      type="button"
      data-testid={`open-preview-${message.id}`}
      onClick={() => onImageClick(message.files[0])}
    >
      Open preview
    </button>
  ),
}));

vi.mock('../modals/FilePreviewModal', () => ({
  FilePreviewModal: ({ file }: { file: UploadedFile | null }) =>
    file ? <div data-testid="file-preview-modal">{file.name}</div> : null,
}));

vi.mock('./message-list/hooks/useMessageListScroll', () => ({
  useMessageListScroll: () => ({
    virtuosoRef: { current: null },
    handleScrollerRef: () => {},
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

  const createProviderValue = (): ChatAreaProviderValue => ({
    messageList: {
      messages,
      sessionTitle: 'Test',
      setScrollContainerRef: () => {},
      onScrollContainerScroll: () => {},
      onEditMessage: () => {},
      onDeleteMessage: () => {},
      onRetryMessage: () => {},
      onUpdateMessageFile: () => {},
      showThoughts: false,
      themeId: 'pearl',
      baseFontSize: 14,
      expandCodeBlocksByDefault: false,
      isMermaidRenderingEnabled: false,
      isGraphvizRenderingEnabled: false,
      onTextToSpeech: () => {},
      onGenerateCanvas: () => {},
      onContinueGeneration: () => {},
      ttsMessageId: null,
      onQuickTTS: async () => null,
      t: (key) => (key === 'imageZoom_title' ? 'Preview {filename}' : String(key)),
      language: 'zh',
      chatInputHeight: 0,
      appSettings: { showWelcomeSuggestions: true } as any,
      currentModelId: 'gemini-2.5-flash',
      onOpenSidePanel: () => {},
      onQuote: () => {},
      activeSessionId: 'session-1',
    },
    input: {
      appSettings: {
        isSystemAudioRecordingEnabled: false,
        isPasteRichTextAsMarkdownEnabled: true,
      } as any,
      currentChatSettings: {
        modelId: 'gemini-3.1-pro-preview',
        ttsVoice: 'Aoede',
        thinkingLevel: 'MEDIUM',
      } as any,
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
      t: (key) => key as any,
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
      isHistorySidebarOpen: false,
      generateQuadImages: false,
      onToggleQuadImages: () => {},
      setCurrentChatSettings: () => ({}) as any,
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
        <ChatAreaProvider value={createProviderValue()}>
          <MessageList />
        </ChatAreaProvider>
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
  });
});
