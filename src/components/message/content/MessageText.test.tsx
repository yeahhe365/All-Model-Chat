import { act } from 'react';
import { createTestRenderer } from '@/test/testUtils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MessageText } from './MessageText';

const { mockUseMessageStream } = vi.hoisted(() => ({
  mockUseMessageStream: vi.fn(() => ({
    streamContent: '',
    streamThoughts: '',
  })),
}));

vi.mock('../../../contexts/I18nContext', async () => {
  const { createI18nMock } = await import('../../../test/i18nTestDoubles');

  return createI18nMock();
});

vi.mock('../GroundedResponse', () => ({
  GroundedResponse: () => <div data-testid="grounded-response" />,
}));

vi.mock('../LazyMarkdownRenderer', () => ({
  LazyMarkdownRenderer: ({ content }: { content: string }) => <div data-testid="markdown-renderer">{content}</div>,
}));

vi.mock('../../icons/GoogleSpinner', () => ({
  GoogleSpinner: () => <div data-testid="google-spinner" />,
}));

vi.mock('../../../hooks/ui/useSmoothStreaming', () => ({
  useSmoothStreaming: (content: string) => content,
}));

vi.mock('../../../hooks/ui/useMessageStream', () => ({
  useMessageStream: mockUseMessageStream,
}));

describe('MessageText', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockUseMessageStream.mockReturnValue({
      streamContent: '',
      streamThoughts: '',
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders grounded response metadata even when the message only contains images', () => {
    const root = createTestRenderer();
    const { container } = root;

    act(() => {
      root.render(
        <MessageText
          message={{
            id: 'message-1',
            role: 'model',
            content: '',
            files: [
              {
                id: 'file-1',
                name: 'grounded-image.png',
                type: 'image/png',
                size: 100,
              },
            ],
            groundingMetadata: {
              groundingChunks: [
                {
                  image: {
                    sourceUri: 'https://example.com/source',
                  },
                },
              ],
            },
            timestamp: new Date('2026-04-21T00:00:00.000Z'),
          }}
          showThoughts={false}
          appSettings={
            {
              autoFullscreenHtml: false,
              hideThinkingInContext: false,
            } as any
          }
          themeId="pearl"
          baseFontSize={16}
          onImageClick={vi.fn()}
          onOpenHtmlPreview={vi.fn()}
          expandCodeBlocksByDefault={false}
          isMermaidRenderingEnabled={true}
          isGraphvizRenderingEnabled={true}
          onOpenSidePanel={vi.fn()}
        />,
      );
    });

    expect(container.querySelector('[data-testid="grounded-response"]')).not.toBeNull();

    act(() => {
      root.unmount();
    });
  });

  it('cancels pending automatic HTML preview when unmounted', () => {
    const root = createTestRenderer();
    const onOpenHtmlPreview = vi.fn();
    const loadingMessage = {
      id: 'message-html',
      role: 'model' as const,
      content: '```html\n<div>preview</div>\n```',
      isLoading: true,
      timestamp: new Date('2026-04-21T00:00:00.000Z'),
    };
    const loadedMessage = {
      ...loadingMessage,
      isLoading: false,
    };

    const renderMessage = (message: typeof loadingMessage) => (
      <MessageText
        message={message}
        showThoughts={false}
        appSettings={
          {
            autoFullscreenHtml: true,
            hideThinkingInContext: false,
          } as any
        }
        themeId="pearl"
        baseFontSize={16}
        onImageClick={vi.fn()}
        onOpenHtmlPreview={onOpenHtmlPreview}
        expandCodeBlocksByDefault={false}
        isMermaidRenderingEnabled={true}
        isGraphvizRenderingEnabled={true}
        onOpenSidePanel={vi.fn()}
      />
    );

    act(() => {
      root.render(renderMessage(loadingMessage));
    });

    act(() => {
      root.render(renderMessage(loadedMessage));
    });

    act(() => {
      root.unmount();
      vi.advanceTimersByTime(100);
    });

    expect(onOpenHtmlPreview).not.toHaveBeenCalled();
  });

  it('omits live raw reasoning markup from the visible answer body', () => {
    const root = createTestRenderer();
    const { container } = root;

    mockUseMessageStream.mockReturnValue({
      streamContent: 'drafting the answer',
      streamThoughts: '',
    });

    act(() => {
      root.render(
        <MessageText
          message={{
            id: 'message-raw',
            role: 'model',
            content: '<thinking>',
            isLoading: true,
            timestamp: new Date('2026-04-21T00:00:00.000Z'),
          }}
          showThoughts={false}
          appSettings={
            {
              autoFullscreenHtml: false,
              hideThinkingInContext: true,
            } as any
          }
          themeId="pearl"
          baseFontSize={16}
          onImageClick={vi.fn()}
          onOpenHtmlPreview={vi.fn()}
          expandCodeBlocksByDefault={false}
          isMermaidRenderingEnabled={true}
          isGraphvizRenderingEnabled={true}
          onOpenSidePanel={vi.fn()}
        />,
      );
    });

    expect(container.querySelector('[data-testid="markdown-renderer"]')).toBeNull();

    act(() => {
      root.unmount();
    });
  });

  it('renders only the answer body when raw thinking is embedded in content', () => {
    const root = createTestRenderer();
    const { container } = root;

    act(() => {
      root.render(
        <MessageText
          message={{
            id: 'message-raw-complete',
            role: 'model',
            content: '<thinking>Plan carefully.</thinking>\nFinal answer.',
            timestamp: new Date('2026-04-21T00:00:00.000Z'),
          }}
          showThoughts={true}
          appSettings={
            {
              autoFullscreenHtml: false,
              hideThinkingInContext: false,
            } as any
          }
          themeId="pearl"
          baseFontSize={16}
          onImageClick={vi.fn()}
          onOpenHtmlPreview={vi.fn()}
          expandCodeBlocksByDefault={false}
          isMermaidRenderingEnabled={true}
          isGraphvizRenderingEnabled={true}
          onOpenSidePanel={vi.fn()}
        />,
      );
    });

    expect(container.querySelector('[data-testid="markdown-renderer"]')?.textContent).toBe('Final answer.');

    act(() => {
      root.unmount();
    });
  });
});
