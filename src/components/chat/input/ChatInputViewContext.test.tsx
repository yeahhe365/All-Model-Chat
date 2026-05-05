import { readFileSync } from 'fs';
import path from 'path';
import React from 'react';
import { act } from 'react';
import { setupTestRenderer } from '@/test/testUtils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ChatInputViewProvider,
  type ChatInputViewModel,
  useChatInputActionsView,
  useChatInputLayoutView,
  useLiveStatusView,
  useQueuedSubmissionView,
} from './ChatInputViewContext';

const createViewModel = (overrides: Partial<ChatInputViewModel> = {}): ChatInputViewModel => ({
  toolbarProps: {
    isImagenModel: false,
    fileError: null,
    showAddByIdInput: false,
    fileIdInput: '',
    setFileIdInput: vi.fn(),
    onAddFileByIdSubmit: vi.fn(),
    onCancelAddById: vi.fn(),
    isAddingById: false,
    showAddByUrlInput: false,
    urlInput: '',
    setUrlInput: vi.fn(),
    onAddUrlSubmit: vi.fn(),
    onCancelAddUrl: vi.fn(),
    isAddingByUrl: false,
    isLoading: false,
  },
  actionsProps: {
    onAttachmentAction: vi.fn(),
    disabled: false,
    currentModelId: 'gemini-3.1-pro-preview',
    toolStates: {},
    toolUtilityActions: {
      onAddYouTubeVideo: vi.fn(),
      onCountTokens: vi.fn(),
    },
    onRecordButtonClick: vi.fn(),
    isTranscribing: false,
    isLoading: false,
    onStopGenerating: vi.fn(),
    isEditing: false,
    onCancelEdit: vi.fn(),
    canSend: false,
    isWaitingForUpload: false,
    onCancelRecording: vi.fn(),
    onTranslate: vi.fn(),
    isTranslating: false,
    inputText: '',
  },
  slashCommandProps: {
    isOpen: false,
    commands: [],
    onSelect: vi.fn(),
    selectedIndex: 0,
  },
  fileDisplayProps: {
    selectedFiles: [],
    onRemove: vi.fn(),
    onCancelUpload: vi.fn(),
    onConfigure: vi.fn(),
    onMoveTextToInput: vi.fn(async () => undefined),
    onPreview: vi.fn(),
  },
  inputProps: {
    value: '',
    onChange: vi.fn(),
    onKeyDown: vi.fn(),
    onPaste: vi.fn(),
    textareaRef: React.createRef<HTMLTextAreaElement>(),
    placeholder: '',
    disabled: false,
    onCompositionStart: vi.fn(),
    onCompositionEnd: vi.fn(),
  },
  layoutProps: {
    isFullscreen: false,
    isPipActive: false,
    isAnimatingSend: false,
    isMobile: false,
    initialTextareaHeight: 28,
    isConverting: false,
  },
  fileInputs: {
    fileInputRef: React.createRef<HTMLInputElement>(),
    imageInputRef: React.createRef<HTMLInputElement>(),
    folderInputRef: React.createRef<HTMLInputElement>(),
    zipInputRef: React.createRef<HTMLInputElement>(),
    cameraInputRef: React.createRef<HTMLInputElement>(),
    handleFileChange: vi.fn(),
    handleFolderChange: vi.fn(),
  },
  formProps: {
    onSubmit: vi.fn(),
  },
  themeId: 'pearl',
  ...overrides,
});

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: string | null }> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }

  render() {
    if (this.state.error) {
      return <div data-testid="boundary-error">{this.state.error}</div>;
    }

    return this.props.children;
  }
}

describe('ChatInputViewContext', () => {
  const renderer = setupTestRenderer();
  const render = (node: React.ReactNode) => {
    act(() => {
      renderer.render(node);
    });

    return {
      container: renderer.container,
      rerender: (nextNode: React.ReactNode) => {
        act(() => {
          renderer.render(nextNode);
        });
      },
      unmount: () => {
        act(() => {
          renderer.unmount();
        });
      },
    };
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('requires the provider before chat input view hooks can be used', () => {
    const Consumer = () => {
      useChatInputActionsView();
      return null;
    };

    vi.spyOn(console, 'error').mockImplementation(() => {});
    const preventExpectedProviderError = (event: ErrorEvent) => {
      if (event.error?.message === 'ChatInputViewProvider is required before using chat input view hooks') {
        event.preventDefault();
      }
    };
    window.addEventListener('error', preventExpectedProviderError);

    let rendered: ReturnType<typeof render> | undefined;
    try {
      rendered = render(
        <ErrorBoundary>
          <Consumer />
        </ErrorBoundary>,
      );

      expect(rendered.container.querySelector('[data-testid="boundary-error"]')?.textContent).toBe(
        'ChatInputViewProvider is required before using chat input view hooks',
      );
    } finally {
      window.removeEventListener('error', preventExpectedProviderError);
      rendered?.unmount();
    }
  });

  it('provides focused view slices to chat input children', () => {
    const value = createViewModel({
      actionsProps: {
        ...createViewModel().actionsProps,
        canSend: true,
      },
      layoutProps: {
        ...createViewModel().layoutProps,
        isFullscreen: true,
      },
      themeId: 'onyx',
    });

    const Consumer = () => {
      const actions = useChatInputActionsView();
      const layout = useChatInputLayoutView();

      return (
        <div>
          <span data-testid="can-send">{String(actions.canSend)}</span>
          <span data-testid="fullscreen">{String(layout.isFullscreen)}</span>
        </div>
      );
    };

    const { container } = render(
      <ChatInputViewProvider value={value}>
        <Consumer />
      </ChatInputViewProvider>,
    );

    expect(container.querySelector('[data-testid="can-send"]')?.textContent).toBe('true');
    expect(container.querySelector('[data-testid="fullscreen"]')?.textContent).toBe('true');
  });

  it('provides focused status slices to chat input children', () => {
    const value = createViewModel({
      queuedSubmissionProps: {
        title: 'Queued',
        previewText: 'Queued preview',
        fileCount: 2,
        onEdit: vi.fn(),
        onRemove: vi.fn(),
      },
      liveStatusProps: {
        isConnected: true,
        isSpeaking: false,
        isReconnecting: false,
        volume: 0.25,
        error: null,
        onDisconnect: vi.fn(),
      },
    });

    const Consumer = () => {
      const queuedSubmission = useQueuedSubmissionView();
      const liveStatus = useLiveStatusView();

      return (
        <div>
          <span data-testid="queued-preview">{queuedSubmission?.previewText}</span>
          <span data-testid="live-connected">{String(liveStatus?.isConnected)}</span>
        </div>
      );
    };

    const { container } = render(
      <ChatInputViewProvider value={value}>
        <Consumer />
      </ChatInputViewProvider>,
    );

    expect(container.querySelector('[data-testid="queued-preview"]')?.textContent).toBe('Queued preview');
    expect(container.querySelector('[data-testid="live-connected"]')?.textContent).toBe('true');
  });

  it('isolates focused consumers when unrelated view slices change', () => {
    const actionsProps = {
      ...createViewModel().actionsProps,
      canSend: true,
      isLoading: false,
    };
    const baseValue = createViewModel({
      actionsProps,
    });
    const renderCounts = {
      actions: 0,
      queuedSubmission: 0,
    };
    const createValue = (previewText: string): ChatInputViewModel => ({
      ...baseValue,
      queuedSubmissionProps: {
        title: 'Queued',
        previewText,
        fileCount: 0,
        onEdit: vi.fn(),
        onRemove: vi.fn(),
      },
    });
    const ActionsConsumer = React.memo(() => {
      renderCounts.actions += 1;
      const actions = useChatInputActionsView();

      return <span data-testid="isolated-can-send">{String(actions.canSend)}</span>;
    });
    const QueuedSubmissionConsumer = React.memo(() => {
      renderCounts.queuedSubmission += 1;
      const queuedSubmission = useQueuedSubmissionView();

      return <span data-testid="isolated-queued-preview">{queuedSubmission?.previewText}</span>;
    });
    const View = ({ value }: { value: ChatInputViewModel }) => (
      <ChatInputViewProvider value={value}>
        <ActionsConsumer />
        <QueuedSubmissionConsumer />
      </ChatInputViewProvider>
    );

    const { container, rerender } = render(<View value={createValue('First queued text')} />);

    expect(container.querySelector('[data-testid="isolated-can-send"]')?.textContent).toBe('true');
    expect(container.querySelector('[data-testid="isolated-queued-preview"]')?.textContent).toBe('First queued text');
    expect(renderCounts).toEqual({ actions: 1, queuedSubmission: 1 });

    rerender(<View value={createValue('Second queued text')} />);

    expect(container.querySelector('[data-testid="isolated-queued-preview"]')?.textContent).toBe('Second queued text');
    expect(renderCounts).toEqual({ actions: 1, queuedSubmission: 2 });
  });

  it('keeps the chat input area on focused view hooks instead of the full view object', () => {
    const source = readFileSync(path.resolve(__dirname, './ChatInputArea.tsx'), 'utf8');

    expect(source).not.toContain('useChatInputView');
    expect(source).toContain('useQueuedSubmissionView()');
    expect(source).toContain('useLiveStatusView()');
    expect(source).toContain('useChatInputToolbarView()');
    expect(source).toContain('useChatInputTextAreaView()');
    expect(source).toContain('useChatInputFormView()');
  });

  it('does not export the broad chat input view object hook', () => {
    const source = readFileSync(path.resolve(__dirname, './ChatInputViewContext.tsx'), 'utf8');

    expect(source).not.toMatch(/export const useChatInputView\b/);
    expect(source).toContain('useQueuedSubmissionView');
    expect(source).toContain('useLiveStatusView');
  });

  it('uses one store-backed provider instead of many slice contexts', () => {
    const source = readFileSync(path.resolve(__dirname, './ChatInputViewContext.tsx'), 'utf8');

    expect(source).toContain('createStore<ChatInputViewModel>');
    expect(source).toContain('useStore(store, selector)');
    expect(source).not.toContain('createChatInputViewSliceContext');
    expect(source).not.toContain('ChatInputToolbarViewContext.Provider');
  });
});
