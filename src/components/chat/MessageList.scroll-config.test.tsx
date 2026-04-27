import type { ReactNode } from 'react';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppSettings, ChatMessage, ChatSettings } from '../../types';
import type { ChatAreaProviderValue } from '../layout/chat-area/ChatAreaContext';
import { MessageList } from './MessageList';
import { I18nProvider } from '../../contexts/I18nContext';
import { ChatAreaProvider } from '../layout/chat-area/ChatAreaContext';

const virtuosoPropsSpy = vi.fn();

interface VirtuosoMockProps<T> {
  data: T[];
  itemContent: (index: number, item: T) => ReactNode;
  computeItemKey?: (index: number, item: T) => React.Key;
}

vi.mock('react-virtuoso', async () => {
  const { forwardRef: reactForwardRef } = await import('react');

  return {
    Virtuoso: reactForwardRef<HTMLDivElement, VirtuosoMockProps<ChatMessage> & Record<string, unknown>>(
      (props, ref) => {
        const typedProps = props as VirtuosoMockProps<ChatMessage> & Record<string, unknown>;

        virtuosoPropsSpy(typedProps);

        return (
          <div ref={ref} data-testid="virtuoso">
            {typedProps.data.map((item: ChatMessage, index: number) => (
              <div key={item.id}>{typedProps.itemContent(index, item)}</div>
            ))}
          </div>
        );
      },
    ),
  };
});

vi.mock('../message/Message', () => ({
  Message: () => <div data-testid="message-row" />,
}));

vi.mock('../modals/FileConfigurationModal', () => ({
  FileConfigurationModal: () => null,
}));

vi.mock('../../hooks/useMessageListUI', () => ({
  useMessageListUI: () => ({
    previewFile: null,
    isHtmlPreviewModalOpen: false,
    htmlToPreview: null,
    initialTrueFullscreenRequest: false,
    configuringFile: null,
    setConfiguringFile: () => {},
    handleFileClick: () => {},
    closeFilePreviewModal: () => {},
    allImages: [],
    currentImageIndex: -1,
    handlePrevImage: () => {},
    handleNextImage: () => {},
    handleOpenHtmlPreview: () => {},
    handleCloseHtmlPreview: () => {},
    handleConfigureFile: () => {},
    handleSaveFileConfig: () => {},
  }),
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
    scrollerRef: null,
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

const messages: ChatMessage[] = [
  {
    id: 'message-1',
    role: 'user',
    content: 'Hello',
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
    themeId: 'pearl',
    baseFontSize: 14,
    expandCodeBlocksByDefault: false,
    isMermaidRenderingEnabled: false,
    isGraphvizRenderingEnabled: false,
    onGenerateCanvas: () => {},
    onContinueGeneration: () => {},
    onQuickTTS: async () => null,
    chatInputHeight: 0,
    appSettings: { showWelcomeSuggestions: true } as AppSettings,
    currentModelId: 'gemini-2.5-flash',
    onOpenSidePanel: () => {},
    onQuote: () => {},
    onInsert: () => {},
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

describe('MessageList scroll configuration', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    virtuosoPropsSpy.mockClear();
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

  it('configures Virtuoso to pre-render below the viewport and use stable message keys', () => {
    act(() => {
      root.render(
        <I18nProvider>
          <ChatAreaProvider value={createProviderValue()}>
            <MessageList />
          </ChatAreaProvider>
        </I18nProvider>,
      );
    });

    expect(virtuosoPropsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        increaseViewportBy: { bottom: 800, top: 0 },
        atBottomThreshold: 150,
        computeItemKey: expect.any(Function),
      }),
    );

    const props = virtuosoPropsSpy.mock.calls[0]?.[0] as VirtuosoMockProps<ChatMessage>;
    expect(props.computeItemKey?.(0, messages[0])).toBe('message-1');
  });
});
