import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UploadedFile } from '../../../types';
import { MarkdownFileViewer } from './MarkdownFileViewer';

const { mockLazyMarkdownRenderer } = vi.hoisted(() => ({
  mockLazyMarkdownRenderer: vi.fn(({ content }: { content: string }) => (
    <div data-testid="markdown-renderer">{content}</div>
  )),
}));

vi.mock('../../../contexts/I18nContext', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../message/LazyMarkdownRenderer', () => ({
  LazyMarkdownRenderer: mockLazyMarkdownRenderer,
}));

describe('MarkdownFileViewer', () => {
  let container: HTMLDivElement;
  let root: Root;

  const createMarkdownFile = (id = 'markdown-file'): UploadedFile => ({
    id,
    name: 'notes.md',
    type: 'text/markdown',
    size: 128,
    uploadState: 'active',
    textContent: '# Preview title',
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    localStorage.clear();
  });

  it('remembers source mode for the same markdown file when reopened', () => {
    const file = createMarkdownFile();

    act(() => {
      root.render(<MarkdownFileViewer file={file} content="# Preview title" />);
    });

    expect(container.querySelector('[data-testid="markdown-renderer"]')).not.toBeNull();

    const sourceButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('markdownPreview_source'),
    );
    expect(sourceButton).toBeDefined();

    act(() => {
      sourceButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain('# Preview title');
    expect(container.querySelector('[data-testid="markdown-renderer"]')).toBeNull();

    act(() => {
      root.unmount();
    });

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(<MarkdownFileViewer file={file} content="# Preview title" />);
    });

    expect(container.textContent).toContain('# Preview title');
    expect(container.querySelector('[data-testid="markdown-renderer"]')).toBeNull();
  });
});
