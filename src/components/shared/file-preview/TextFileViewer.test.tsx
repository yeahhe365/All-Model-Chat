import { act } from 'react';
import { setupTestRenderer } from '@/test/testUtils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
  const { createI18nMockModule } = await import('../../../test/moduleMockDoubles');

  return createI18nMockModule();
});

vi.mock('../../message/LazyMarkdownRenderer', () => ({
  LazyMarkdownRenderer: mockLazyMarkdownRenderer,
}));

describe('TextFileViewer', () => {
  const renderer = setupTestRenderer();

  const createMarkdownFile = (): UploadedFile => ({
    id: 'markdown-file',
    name: 'notes.md',
    type: 'text/markdown',
    size: 128,
    uploadState: 'active',
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders markdown content inside a theme-aware preview surface', () => {
    act(() => {
      renderer.root.render(
        <TextFileViewer file={createMarkdownFile()} content="# Preview title" renderMode="markdown" themeId="pearl" />,
      );
    });

    const markdownRenderer = renderer.container.querySelector('[data-testid="markdown-renderer"]');

    expect(markdownRenderer).not.toBeNull();
    expect(markdownRenderer?.getAttribute('data-theme-id')).toBe('pearl');
    expect(markdownRenderer?.getAttribute('data-interactive-mode')).toBe('disabled');
    expect(markdownRenderer?.parentElement?.className).toContain('bg-[var(--theme-bg-primary)]');
    expect(renderer.container.querySelector('pre')).toBeNull();
  });

  it('falls back to plain text for large markdown files until the user opts in to rich rendering', () => {
    const largeMarkdown = `${'# Heading\n\n'}${'Paragraph line\n'.repeat(5000)}`;

    act(() => {
      renderer.root.render(
        <TextFileViewer file={createMarkdownFile()} content={largeMarkdown} renderMode="markdown" themeId="pearl" />,
      );
    });

    expect(renderer.container.querySelector('[data-testid="markdown-renderer"]')).toBeNull();
    expect(renderer.container.textContent).toContain('filePreview_large_markdown_notice');
    expect(renderer.container.textContent).toContain('filePreview_render_markdown_anyway');
    expect(renderer.container.textContent).toContain('# Heading');

    const button = Array.from(renderer.container.querySelectorAll('button')).find((candidate) =>
      candidate.textContent?.includes('filePreview_render_markdown_anyway'),
    );

    expect(button).not.toBeUndefined();

    act(() => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(renderer.container.querySelector('[data-testid="markdown-renderer"]')).not.toBeNull();
  });
});
