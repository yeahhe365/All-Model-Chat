import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MessageThoughts } from './MessageThoughts';

const { mockUseMessageStream } = vi.hoisted(() => ({
  mockUseMessageStream: vi.fn(() => ({
    streamContent: '',
    streamThoughts: '',
  })),
}));

vi.mock('../../../contexts/I18nContext', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../../utils/apiUtils', () => ({
  getKeyForRequest: vi.fn(() => ({ key: 'api-key', isNewKey: false })),
}));

vi.mock('../../../services/geminiService', () => ({
  geminiServiceInstance: {
    translateText: vi.fn(),
  },
}));

vi.mock('../../../hooks/useCopyToClipboard', () => ({
  useCopyToClipboard: () => ({
    isCopied: false,
    copyToClipboard: vi.fn(),
  }),
}));

vi.mock('../../../hooks/ui/useMessageStream', () => ({
  useMessageStream: mockUseMessageStream,
}));

vi.mock('./thoughts/ThinkingHeader', () => ({
  ThinkingHeader: ({ lastThought }: { lastThought: { content: string } | null }) => (
    <div data-testid="thinking-header">{lastThought?.content}</div>
  ),
}));

vi.mock('./thoughts/ThinkingActions', () => ({
  ThinkingActions: () => <div data-testid="thinking-actions" />,
}));

vi.mock('./thoughts/ThoughtContent', () => ({
  ThoughtContent: ({ content }: { content: string }) => <div data-testid="thought-content">{content}</div>,
}));

describe('MessageThoughts', () => {
  beforeEach(() => {
    mockUseMessageStream.mockReturnValue({
      streamContent: '',
      streamThoughts: '',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders raw thinking blocks using the normal thought panel', () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    act(() => {
      root.render(
        <MessageThoughts
          message={{
            id: 'message-raw',
            role: 'model',
            content: '<thinking>Plan carefully.</thinking>\nFinal answer.',
            timestamp: new Date('2026-04-21T00:00:00.000Z'),
          }}
          showThoughts={true}
          appSettings={{} as any}
          themeId="pearl"
          onImageClick={vi.fn()}
          onOpenHtmlPreview={vi.fn()}
          expandCodeBlocksByDefault={false}
          isMermaidRenderingEnabled={true}
          isGraphvizRenderingEnabled={true}
          onOpenSidePanel={vi.fn()}
        />,
      );
    });

    expect(container.querySelector('.message-thoughts-block')).not.toBeNull();
    expect(container.querySelector('[data-testid="thought-content"]')?.textContent).toBe('Plan carefully.');

    act(() => {
      root.unmount();
    });
  });

  it('renders live unclosed raw thinking from the stream store', () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    mockUseMessageStream.mockReturnValue({
      streamContent: 'Drafting the answer',
      streamThoughts: '',
    });

    act(() => {
      root.render(
        <MessageThoughts
          message={{
            id: 'message-live-raw',
            role: 'model',
            content: '<thinking>',
            isLoading: true,
            timestamp: new Date('2026-04-21T00:00:00.000Z'),
          }}
          showThoughts={true}
          appSettings={{} as any}
          themeId="pearl"
          onImageClick={vi.fn()}
          onOpenHtmlPreview={vi.fn()}
          expandCodeBlocksByDefault={false}
          isMermaidRenderingEnabled={true}
          isGraphvizRenderingEnabled={true}
          onOpenSidePanel={vi.fn()}
        />,
      );
    });

    expect(container.querySelector('[data-testid="thought-content"]')?.textContent).toBe('Drafting the answer');

    act(() => {
      root.unmount();
    });
  });
});
