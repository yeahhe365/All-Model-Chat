import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ChatInputViewProvider,
  useChatInputActionsView,
  useChatInputLayoutView,
  useLiveStatusView,
  useQueuedSubmissionView,
} from './ChatInputViewContext';

const render = (node: React.ReactNode) => {
  const container = document.createElement('div');
  const root = createRoot(container);

  act(() => {
    root.render(node);
  });

  return {
    container,
    unmount: () => {
      act(() => {
        root.unmount();
      });
    },
  };
};

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
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('requires the provider before chat input view hooks can be used', () => {
    const Consumer = () => {
      useChatInputActionsView();
      return null;
    };

    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { container, unmount } = render(
      <ErrorBoundary>
        <Consumer />
      </ErrorBoundary>,
    );

    expect(container.querySelector('[data-testid="boundary-error"]')?.textContent).toBe(
      'useChatInputView must be used within ChatInputViewProvider',
    );

    unmount();
  });

  it('provides focused view slices to chat input children', () => {
    const value = {
      toolbarProps: {} as any,
      actionsProps: {
        canSend: true,
        isLoading: false,
      },
      slashCommandProps: {} as any,
      fileDisplayProps: {} as any,
      inputProps: {} as any,
      layoutProps: {
        isFullscreen: true,
        isPipActive: false,
        isAnimatingSend: false,
        isMobile: false,
        initialTextareaHeight: 28,
        isConverting: false,
      },
      fileInputs: {} as any,
      formProps: {} as any,
      themeId: 'onyx',
    } as any;

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

    const { container, unmount } = render(
      <ChatInputViewProvider value={value}>
        <Consumer />
      </ChatInputViewProvider>,
    );

    expect(container.querySelector('[data-testid="can-send"]')?.textContent).toBe('true');
    expect(container.querySelector('[data-testid="fullscreen"]')?.textContent).toBe('true');

    unmount();
  });

  it('provides focused status slices to chat input children', () => {
    const value = {
      toolbarProps: {} as any,
      actionsProps: {} as any,
      slashCommandProps: {} as any,
      fileDisplayProps: {} as any,
      inputProps: {} as any,
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
      layoutProps: {
        isFullscreen: false,
        isPipActive: false,
        isAnimatingSend: false,
        isMobile: false,
        initialTextareaHeight: 28,
        isConverting: false,
      },
      fileInputs: {} as any,
      formProps: {} as any,
      themeId: 'pearl',
    } as any;

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

    const { container, unmount } = render(
      <ChatInputViewProvider value={value}>
        <Consumer />
      </ChatInputViewProvider>,
    );

    expect(container.querySelector('[data-testid="queued-preview"]')?.textContent).toBe('Queued preview');
    expect(container.querySelector('[data-testid="live-connected"]')?.textContent).toBe('true');

    unmount();
  });
});
