import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { MessageText } from './MessageText';

vi.mock('../../../contexts/I18nContext', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../GroundedResponse', () => ({
  GroundedResponse: () => <div data-testid="grounded-response" />,
}));

vi.mock('../LazyMarkdownRenderer', () => ({
  LazyMarkdownRenderer: () => <div data-testid="markdown-renderer" />,
}));

vi.mock('../../icons/GoogleSpinner', () => ({
  GoogleSpinner: () => <div data-testid="google-spinner" />,
}));

vi.mock('../../../hooks/ui/useSmoothStreaming', () => ({
  useSmoothStreaming: (content: string) => content,
}));

vi.mock('../../../hooks/ui/useMessageStream', () => ({
  useMessageStream: () => ({
    streamContent: '',
    streamThoughts: '',
  }),
}));

describe('MessageText', () => {
  it('renders grounded response metadata even when the message only contains images', () => {
    const container = document.createElement('div');
    const root = createRoot(container);

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
          appSettings={{
            autoFullscreenHtml: false,
            hideThinkingInContext: false,
          } as any}
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
});
