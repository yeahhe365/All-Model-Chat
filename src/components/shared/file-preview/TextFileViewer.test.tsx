import { act } from 'react';
import { createTestRenderer, type TestRenderer } from '@/test/testUtils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UploadedFile } from '../../../types';
import { TextFileViewer } from './TextFileViewer';

const { mockLazyMarkdownRenderer } = vi.hoisted(() => ({
  mockLazyMarkdownRenderer: vi.fn(
    ({ content, themeId, interactiveMode }: { content: string; themeId: string; interactiveMode?: string }) => (
      <div data-testid="markdown-renderer" data-theme-id={themeId} data-interactive-mode={interactiveMode}>
        {content}
      </div>
    ),
  ),
}));

vi.mock('../../../contexts/I18nContext', async () => {
  const { createI18nMock } = await import('../../../test/i18nTestDoubles');

  return createI18nMock();
});

vi.mock('../../message/LazyMarkdownRenderer', () => ({
  LazyMarkdownRenderer: mockLazyMarkdownRenderer,
}));

describe('TextFileViewer', () => {
  let container: HTMLDivElement;
  let root: TestRenderer;

  const createMarkdownFile = (): UploadedFile => ({
    id: 'markdown-file',
    name: 'notes.md',
    type: 'text/markdown',
    size: 128,
    uploadState: 'active',
  });

  beforeEach(() => {
    root = createTestRenderer();
    container = root.container;
    vi.clearAllMocks();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
  });

  it('renders markdown content inside a theme-aware preview surface', () => {
    act(() => {
      root.render(
        <TextFileViewer file={createMarkdownFile()} content="# Preview title" renderMode="markdown" themeId="pearl" />,
      );
    });

    const markdownRenderer = container.querySelector('[data-testid="markdown-renderer"]');

    expect(markdownRenderer).not.toBeNull();
    expect(markdownRenderer?.getAttribute('data-theme-id')).toBe('pearl');
    expect(markdownRenderer?.getAttribute('data-interactive-mode')).toBe('disabled');
    expect(markdownRenderer?.parentElement?.className).toContain('bg-[var(--theme-bg-primary)]');
    expect(container.querySelector('pre')).toBeNull();
  });

  it('falls back to plain text for large markdown files until the user opts in to rich rendering', () => {
    const largeMarkdown = `${'# Heading\n\n'}${'Paragraph line\n'.repeat(5000)}`;

    act(() => {
      root.render(
        <TextFileViewer file={createMarkdownFile()} content={largeMarkdown} renderMode="markdown" themeId="pearl" />,
      );
    });

    expect(container.querySelector('[data-testid="markdown-renderer"]')).toBeNull();
    expect(container.textContent).toContain('filePreview_large_markdown_notice');
    expect(container.textContent).toContain('filePreview_render_markdown_anyway');
    expect(container.textContent).toContain('# Heading');

    const button = Array.from(container.querySelectorAll('button')).find((candidate) =>
      candidate.textContent?.includes('filePreview_render_markdown_anyway'),
    );

    expect(button).not.toBeUndefined();

    act(() => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.querySelector('[data-testid="markdown-renderer"]')).not.toBeNull();
  });
});
