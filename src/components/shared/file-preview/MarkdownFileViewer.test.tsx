import { act } from 'react';
import { createProviderTestRenderer } from '@/test/providerTestUtils';
import type { TestRenderer } from '@/test/testUtils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UploadedFile } from '@/types';
import { MarkdownFileViewer } from './MarkdownFileViewer';

const { mockLazyMarkdownRenderer } = vi.hoisted(() => ({
  mockLazyMarkdownRenderer: vi.fn(({ content }: { content: string }) => (
    <div data-testid="markdown-renderer">{content}</div>
  )),
}));

vi.mock('@/components/message/LazyMarkdownRenderer', () => ({
  LazyMarkdownRenderer: mockLazyMarkdownRenderer,
}));

describe('MarkdownFileViewer', () => {
  let container: HTMLDivElement;
  let root: TestRenderer;

  const createMarkdownFile = (id = 'markdown-file'): UploadedFile => ({
    id,
    name: 'notes.md',
    type: 'text/markdown',
    size: 128,
    uploadState: 'active',
    textContent: '# Preview title',
  });

  beforeEach(() => {
    root = createProviderTestRenderer({ providers: { language: 'en' } });
    container = root.container;
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('remembers source mode for the same markdown file when reopened', () => {
    const file = createMarkdownFile();

    act(() => {
      root.render(<MarkdownFileViewer file={file} content="# Preview title" />);
    });

    expect(container.querySelector('[data-testid="markdown-renderer"]')).not.toBeNull();

    const sourceButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Source'),
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

    root = createProviderTestRenderer({ providers: { language: 'en' } });
    container = root.container;

    act(() => {
      root.render(<MarkdownFileViewer file={file} content="# Preview title" />);
    });

    expect(container.textContent).toContain('# Preview title');
    expect(container.querySelector('[data-testid="markdown-renderer"]')).toBeNull();
  });
});
