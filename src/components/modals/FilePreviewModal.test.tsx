import { act } from 'react';
import { createTestRenderer, type TestRenderer } from '@/test/testUtils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UploadedFile } from '../../types';

const { mockCopyFileToClipboard, mockExtractDocxText, mockSettingsState, mockT, mockTextFileViewer } = vi.hoisted(
  () => ({
    mockCopyFileToClipboard: vi.fn(),
    mockExtractDocxText: vi.fn(),
    mockSettingsState: {
      appSettings: {
        customShortcuts: {},
      },
      currentTheme: {
        id: 'pearl',
      },
    },
    mockT: vi.fn((key: string) => {
      const messages: Record<string, string> = {
        imageZoom_title: 'Preview {filename}',
        filePreview_loading_word: 'Loading Word preview...',
        filePreview_word_unavailable: 'Unable to preview this Word document.',
        filePreview_previous: 'Previous',
        filePreview_next: 'Next',
      };
      return messages[key] ?? key;
    }),
    mockTextFileViewer: vi.fn(
      ({ content, renderMode, themeId }: { content?: string | null; renderMode?: string; themeId?: string }) => (
        <div data-testid="text-file-viewer" data-render-mode={renderMode} data-theme-id={themeId}>
          {content ?? 'Preview text content'}
        </div>
      ),
    ),
  }),
);

vi.mock('../../contexts/I18nContext', () => ({
  useI18n: () => ({
    t: mockT,
  }),
}));

vi.mock('../../stores/settingsStore', () => ({
  useSettingsStore: (selector: (state: typeof mockSettingsState) => unknown) => selector(mockSettingsState),
}));

vi.mock('../shared/Modal', () => ({
  Modal: ({ children }: { children: React.ReactNode }) => <div data-testid="modal-shell">{children}</div>,
}));

vi.mock('../shared/file-preview/FilePreviewHeader', async () => {
  const React = await import('react');

  const FilePreviewHeader = React.forwardRef<{ showCopyFeedback: () => void }>((_, ref) => {
    const [isCopied, setIsCopied] = React.useState(false);

    React.useImperativeHandle(
      ref,
      () => ({
        showCopyFeedback: () => setIsCopied(true),
      }),
      [],
    );

    return (
      <button
        type="button"
        data-testid="file-preview-copy-button"
        data-copied={isCopied ? 'true' : 'false'}
        onClick={() => setIsCopied(true)}
      >
        {isCopied ? 'Copied' : 'Copy'}
      </button>
    );
  });

  FilePreviewHeader.displayName = 'MockFilePreviewHeader';

  return { FilePreviewHeader };
});

vi.mock('../shared/file-preview/TextFileViewer', () => ({
  TextFileViewer: mockTextFileViewer,
}));

vi.mock('../../utils/fileHelpers', () => ({
  copyFileToClipboard: mockCopyFileToClipboard,
  isMarkdownFile: (file: { name: string; type: string }) =>
    file.type === 'text/markdown' ||
    file.name.toLowerCase().endsWith('.md') ||
    file.name.toLowerCase().endsWith('.markdown'),
  isTextFile: (file: { name: string; type: string }) =>
    file.type.startsWith('text/') || /\.(md|markdown|txt|json|js|ts|tsx|jsx|css|html)$/i.test(file.name),
}));

vi.mock('../../utils/docxPreview', () => ({
  extractDocxText: mockExtractDocxText,
  isDocxFile: (file: { name: string; type: string }) =>
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.name.toLowerCase().endsWith('.docx'),
}));

import { FilePreviewModal } from './FilePreviewModal';

describe('FilePreviewModal', () => {
  let root: TestRenderer;

  const createDocxFile = (): UploadedFile => ({
    id: 'docx-1',
    name: 'report.docx',
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 512,
    rawFile: new File(['fake-docx'], 'report.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }),
    uploadState: 'active',
  });

  const createMarkdownFile = (): UploadedFile => ({
    id: 'md-1',
    name: 'README.md',
    type: '',
    size: 256,
    dataUrl: 'blob:markdown-preview',
    uploadState: 'active',
  });

  beforeEach(() => {
    root = createTestRenderer();
    vi.clearAllMocks();
    mockSettingsState.appSettings.customShortcuts = {};
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
  });

  it('renders extracted docx text in the text preview surface', async () => {
    mockExtractDocxText.mockResolvedValue({
      text: 'Quarterly document preview',
      messages: [],
    });

    await act(async () => {
      root.render(<FilePreviewModal file={createDocxFile()} onClose={() => {}} />);
    });

    await vi.waitFor(() => {
      expect(mockExtractDocxText).toHaveBeenCalledTimes(1);
      expect(document.querySelector('[data-testid="text-file-viewer"]')?.textContent).toContain(
        'Quarterly document preview',
      );
    });
  });

  it('shows a readable error when docx preview extraction fails', async () => {
    mockExtractDocxText.mockRejectedValue(new Error('preview failed'));

    await act(async () => {
      root.render(<FilePreviewModal file={createDocxFile()} onClose={() => {}} />);
    });

    await vi.waitFor(() => {
      expect(document.body.textContent).toContain('Unable to preview this Word document.');
    });
  });

  it('uses configured file navigation shortcuts instead of hard-coded arrows', async () => {
    mockSettingsState.appSettings.customShortcuts = {
      'global.prevFile': 'a',
      'global.nextFile': 'd',
    };

    const onPrev = vi.fn();
    const onNext = vi.fn();

    await act(async () => {
      root.render(
        <FilePreviewModal file={createDocxFile()} onClose={() => {}} onPrev={onPrev} onNext={onNext} hasPrev hasNext />,
      );
    });

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));
    });

    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('routes .md uploads into markdown preview mode with the active theme id', async () => {
    await act(async () => {
      root.render(<FilePreviewModal file={createMarkdownFile()} onClose={() => {}} />);
    });

    const viewer = document.querySelector('[data-testid="text-file-viewer"]');

    expect(viewer).not.toBeNull();
    expect(viewer?.getAttribute('data-render-mode')).toBe('markdown');
    expect(viewer?.getAttribute('data-theme-id')).toBe('pearl');
  });

  it('does not hijack copy shortcuts when the user has selected preview text', async () => {
    await act(async () => {
      root.render(<FilePreviewModal file={createMarkdownFile()} onClose={() => {}} />);
    });

    const previewNode = document.querySelector('[data-testid="text-file-viewer"]');
    const textNode = previewNode?.firstChild;

    expect(textNode).not.toBeNull();

    const selection = window.getSelection();
    const range = document.createRange();
    range.setStart(textNode as Text, 0);
    range.setEnd(textNode as Text, 6);
    selection?.removeAllRanges();
    selection?.addRange(range);

    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'c',
          ctrlKey: true,
          bubbles: true,
        }),
      );
    });

    expect(mockCopyFileToClipboard).not.toHaveBeenCalled();
  });

  it('shows copy button feedback when the file is copied with the keyboard shortcut', async () => {
    await act(async () => {
      root.render(<FilePreviewModal file={createMarkdownFile()} onClose={() => {}} />);
    });

    expect(document.querySelector('[data-testid="file-preview-copy-button"]')?.getAttribute('data-copied')).toBe(
      'false',
    );

    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'c',
          ctrlKey: true,
          bubbles: true,
        }),
      );
    });

    expect(mockCopyFileToClipboard).toHaveBeenCalledTimes(1);

    await vi.waitFor(() => {
      expect(document.querySelector('[data-testid="file-preview-copy-button"]')?.getAttribute('data-copied')).toBe(
        'true',
      );
    });
  });
});
