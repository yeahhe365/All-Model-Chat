import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MessageThoughts } from '../message/content/MessageThoughts';
import { DEFAULT_APP_SETTINGS } from '../../constants/appConstants';

const translateText = vi.fn();
const useMessageStream = vi.fn();

vi.mock('../../hooks/ui/useMessageStream', () => ({
  useMessageStream: (...args: unknown[]) => useMessageStream(...args),
}));

vi.mock('../../services/geminiService', () => ({
  geminiServiceInstance: {
    translateText: (...args: unknown[]) => translateText(...args),
  },
}));

vi.mock('../message/LazyMarkdownRenderer', () => ({
  LazyMarkdownRenderer: ({ content }: { content: string }) => <div>{content}</div>,
}));

describe('MessageThoughts', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    translateText.mockReset();
    useMessageStream.mockReset();
    useMessageStream.mockReturnValue({
      streamContent: '',
      streamThoughts: 'live thoughts from stream',
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('shows translated thoughts even while the live thought stream is still active', async () => {
    translateText.mockResolvedValue('translated thoughts');

    await act(async () => {
      root.render(
        <MessageThoughts
          message={{
            id: 'msg-1',
            role: 'model',
            content: '',
            thoughts: 'persisted thoughts',
            isLoading: true,
            timestamp: new Date(),
            generationStartTime: new Date(),
          }}
          showThoughts={true}
          t={(key) => String(key)}
          appSettings={{
            ...DEFAULT_APP_SETTINGS,
            useCustomApiConfig: true,
            apiKey: 'test-key',
          }}
          themeId="onyx"
          onImageClick={vi.fn()}
          onOpenHtmlPreview={vi.fn()}
          expandCodeBlocksByDefault={false}
          isMermaidRenderingEnabled={false}
          isGraphvizRenderingEnabled={false}
          onOpenSidePanel={vi.fn()}
        />
      );
    });

    await act(async () => {
      (container.querySelector('.message-thoughts-block .cursor-pointer') as HTMLDivElement).click();
    });

    const translateButton = container.querySelector('[title="Translate to Chinese"]') as HTMLButtonElement;

    await act(async () => {
      translateButton.click();
    });

    expect(translateText).toHaveBeenCalledWith(
      'test-key',
      'live thoughts from stream',
      'Chinese'
    );
    const contentArea = container.querySelector('.thought-process-content');

    expect(contentArea?.textContent).toContain('translated thoughts');
    expect(contentArea?.textContent).not.toContain('live thoughts from stream');
  });
});
