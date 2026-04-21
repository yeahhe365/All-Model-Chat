import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UploadedFile } from '../../../types';
import { TextFileViewer } from './TextFileViewer';

const { mockLazyMarkdownRenderer } = vi.hoisted(() => ({
  mockLazyMarkdownRenderer: vi.fn(
    ({ content, themeId }: { content: string; themeId: string }) => (
      <div data-testid="markdown-renderer" data-theme-id={themeId}>
        {content}
      </div>
    ),
  ),
}));

vi.mock('../../../contexts/I18nContext', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../message/LazyMarkdownRenderer', () => ({
  LazyMarkdownRenderer: mockLazyMarkdownRenderer,
}));

describe('TextFileViewer', () => {
  let container: HTMLDivElement;
  let root: Root;

  const createMarkdownFile = (): UploadedFile => ({
    id: 'markdown-file',
    name: 'notes.md',
    type: 'text/markdown',
    size: 128,
    uploadState: 'active',
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    vi.clearAllMocks();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders markdown content inside a theme-aware preview surface', () => {
    act(() => {
      root.render(
        <TextFileViewer
          file={createMarkdownFile()}
          content="# Preview title"
          renderMode="markdown"
          themeId="pearl"
        />,
      );
    });

    const markdownRenderer = container.querySelector('[data-testid="markdown-renderer"]');

    expect(markdownRenderer).not.toBeNull();
    expect(markdownRenderer?.getAttribute('data-theme-id')).toBe('pearl');
    expect(markdownRenderer?.parentElement?.className).toContain('bg-[var(--theme-bg-primary)]');
    expect(container.querySelector('pre')).toBeNull();
  });
});
