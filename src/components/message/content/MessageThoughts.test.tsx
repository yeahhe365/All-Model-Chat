import { act } from 'react';
import type React from 'react';
import { createTestRenderer } from '@/test/testUtils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MessageThoughts } from './MessageThoughts';

const { mockUseMessageStream, mockTranslateText } = vi.hoisted(() => ({
  mockUseMessageStream: vi.fn(() => ({
    streamContent: '',
    streamThoughts: '',
  })),
  mockTranslateText: vi.fn(),
}));

vi.mock('../../../contexts/I18nContext', async () => {
  const { createI18nMock } = await import('../../../test/i18nTestDoubles');

  return createI18nMock();
});

vi.mock('../../../utils/apiUtils', () => ({
  getKeyForRequest: vi.fn(() => ({ key: 'api-key', isNewKey: false })),
}));

vi.mock('../../../services/api/generation/textApi', () => ({
  translateTextApi: mockTranslateText,
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
  ThinkingActions: ({ onTranslate }: { onTranslate: (event: React.MouseEvent) => void }) => (
    <button type="button" data-testid="thinking-translate" onClick={onTranslate}>
      translate
    </button>
  ),
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

  it('uses the configured thought translation model when translating thoughts', async () => {
    const root = createTestRenderer();
    const { container } = root;
    mockTranslateText.mockResolvedValue('已翻译的思维链');

    await act(async () => {
      root.render(
        <MessageThoughts
          message={{
            id: 'message-thought-translation',
            role: 'model',
            content: '',
            thoughts: 'Plan carefully.',
            timestamp: new Date('2026-04-21T00:00:00.000Z'),
          }}
          showThoughts={true}
          appSettings={{ thoughtTranslationModelId: 'gemini-custom-thought-translator' } as any}
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

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="thinking-translate"]')?.click();
      await Promise.resolve();
    });

    expect(mockTranslateText).toHaveBeenCalledWith(
      'api-key',
      'Plan carefully.',
      'Simplified Chinese',
      'gemini-custom-thought-translator',
    );

    act(() => {
      root.unmount();
    });
  });

  it('uses the configured thought translation target language when translating thoughts', async () => {
    const root = createTestRenderer();
    const { container } = root;
    mockTranslateText.mockResolvedValue('翻訳済みの思考');

    await act(async () => {
      root.render(
        <MessageThoughts
          message={{
            id: 'message-thought-translation-language',
            role: 'model',
            content: '',
            thoughts: 'Plan carefully.',
            timestamp: new Date('2026-04-21T00:00:00.000Z'),
          }}
          showThoughts={true}
          appSettings={{ thoughtTranslationTargetLanguage: 'Japanese' } as any}
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

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="thinking-translate"]')?.click();
      await Promise.resolve();
    });

    expect(mockTranslateText).toHaveBeenCalledWith(
      'api-key',
      'Plan carefully.',
      'Japanese',
      'gemini-3.1-flash-lite-preview',
    );

    act(() => {
      root.unmount();
    });
  });

  it('renders raw thinking blocks using the normal thought panel', () => {
    const root = createTestRenderer();
    const { container } = root;

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
    const root = createTestRenderer();
    const { container } = root;

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
