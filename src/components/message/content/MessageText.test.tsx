import { act } from 'react';
import { setupProviderTestRenderer } from '@/test/providerTestUtils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MessageText } from './MessageText';
import { createAppSettings } from '@/test/factories';

const { mockUseMessageStream } = vi.hoisted(() => ({
  mockUseMessageStream: vi.fn(() => ({
    streamContent: '',
    streamThoughts: '',
  })),
}));

vi.mock('../GroundedResponse', () => ({
  GroundedResponse: () => <div data-testid="grounded-response" />,
}));

vi.mock('../LazyMarkdownRenderer', () => ({
  LazyMarkdownRenderer: ({ content, contentPreNormalized }: { content: string; contentPreNormalized?: boolean }) => (
    <div data-testid="markdown-renderer" data-pre-normalized={String(Boolean(contentPreNormalized))}>
      {content}
    </div>
  ),
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
  const renderer = setupProviderTestRenderer({ providers: { language: 'en' } });

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
    act(() => {
      renderer.render(
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
          appSettings={createAppSettings({ autoFullscreenHtml: false, hideThinkingInContext: false })}
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

    expect(renderer.container.querySelector('[data-testid="grounded-response"]')).not.toBeNull();
  });

  it('cancels pending automatic HTML preview when unmounted', () => {
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
        appSettings={createAppSettings({ autoFullscreenHtml: true, hideThinkingInContext: false })}
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
      renderer.render(renderMessage(loadingMessage));
    });

    act(() => {
      renderer.render(renderMessage(loadedMessage));
    });

    act(() => {
      renderer.unmount();
      vi.advanceTimersByTime(100);
    });

    expect(onOpenHtmlPreview).not.toHaveBeenCalled();
  });

  it('omits live raw reasoning markup from the visible answer body', () => {
    mockUseMessageStream.mockReturnValue({
      streamContent: 'drafting the answer',
      streamThoughts: '',
    });

    act(() => {
      renderer.render(
        <MessageText
          message={{
            id: 'message-raw',
            role: 'model',
            content: '<thinking>',
            isLoading: true,
            timestamp: new Date('2026-04-21T00:00:00.000Z'),
          }}
          showThoughts={false}
          appSettings={createAppSettings({ autoFullscreenHtml: false, hideThinkingInContext: true })}
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

    expect(renderer.container.querySelector('[data-testid="markdown-renderer"]')).toBeNull();
  });

  it('renders only the answer body when raw thinking is embedded in content', () => {
    act(() => {
      renderer.render(
        <MessageText
          message={{
            id: 'message-raw-complete',
            role: 'model',
            content: '<thinking>Plan carefully.</thinking>\nFinal answer.',
            timestamp: new Date('2026-04-21T00:00:00.000Z'),
          }}
          showThoughts={true}
          appSettings={createAppSettings({ autoFullscreenHtml: false, hideThinkingInContext: false })}
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

    expect(renderer.container.querySelector('[data-testid="markdown-renderer"]')?.textContent).toBe('Final answer.');
  });

  it('passes bare standalone html documents to markdown as internal artifact fences', () => {
    const htmlDocument =
      '<!DOCTYPE html><html><head><title>Transformer 模型深度解析图谱</title><style>:root{--primary:#2563eb}</style></head><body><h1>Transformer</h1></body></html>';

    act(() => {
      renderer.render(
        <MessageText
          message={{
            id: 'message-bare-html',
            role: 'model',
            content: htmlDocument,
            timestamp: new Date('2026-04-21T00:00:00.000Z'),
          }}
          showThoughts={false}
          appSettings={createAppSettings({ autoFullscreenHtml: false, hideThinkingInContext: false })}
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

    expect(renderer.container.querySelector('[data-testid="markdown-renderer"]')?.textContent).toBe(
      `\`\`\`amc-live-artifact-html\n${htmlDocument}\n\`\`\``,
    );
  });

  it('normalizes standalone raw html fragments into artifact code fences for markdown rendering', () => {
    const htmlFragment = '<div style="display:flex;gap:12px"><span>Ready</span></div>';

    act(() => {
      renderer.render(
        <MessageText
          message={{
            id: 'message-html-fragment',
            role: 'model',
            content: htmlFragment,
            timestamp: new Date('2026-04-21T00:00:00.000Z'),
          }}
          showThoughts={false}
          appSettings={createAppSettings({ autoFullscreenHtml: false, hideThinkingInContext: false })}
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

    expect(renderer.container.querySelector('[data-testid="markdown-renderer"]')?.textContent).toBe(
      `\`\`\`amc-live-artifact-html\n${htmlFragment}\n\`\`\``,
    );
    expect(renderer.container.querySelector('[data-testid="markdown-renderer"]')?.getAttribute('data-pre-normalized')).toBe(
      'true',
    );
  });

  it('normalizes streamed raw html fragments into artifact fences while loading', () => {
    const htmlFragment = '<div style="display:grid"><strong>Streaming artifact';
    mockUseMessageStream.mockReturnValue({
      streamContent: htmlFragment,
      streamThoughts: '',
    });

    act(() => {
      renderer.render(
        <MessageText
          message={{
            id: 'message-streaming-html-fragment',
            role: 'model',
            content: '',
            isLoading: true,
            timestamp: new Date('2026-04-21T00:00:00.000Z'),
          }}
          showThoughts={false}
          appSettings={createAppSettings({ autoFullscreenHtml: false, hideThinkingInContext: false })}
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

    expect(renderer.container.querySelector('[data-testid="markdown-renderer"]')?.textContent).toBe(
      `\`\`\`amc-live-artifact-html\n${htmlFragment}\n\`\`\``,
    );
  });

  it('renders mislabeled fenced html fragments inline instead of as css code', () => {
    const htmlFragment =
      '<!-- 核心定义卡片 -->\n<div style="padding:20px;background:#f9fafb"><strong>Transformer</strong></div>';
    const content = `<div style="background:#6d28d9;color:white">Transformer 模型</div>\n\n\`\`\`css\n${htmlFragment}\n\`\`\``;

    act(() => {
      renderer.render(
        <MessageText
          message={{
            id: 'message-mislabeled-fragment',
            role: 'model',
            content,
            timestamp: new Date('2026-04-21T00:00:00.000Z'),
          }}
          showThoughts={false}
          appSettings={createAppSettings({ autoFullscreenHtml: false, hideThinkingInContext: false })}
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

    const renderedContent = renderer.container.querySelector('[data-testid="markdown-renderer"]')?.textContent;

    expect(renderedContent).toContain(htmlFragment);
    expect(renderedContent).not.toContain('```css');
  });
});
