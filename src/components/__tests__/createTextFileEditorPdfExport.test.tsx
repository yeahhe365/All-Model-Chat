import { act } from 'react';
import { createTestRenderer, type TestRenderer } from '@/test/testUtils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WindowProvider } from '../../contexts/WindowContext';
import { CreateTextFileEditor } from '../modals/CreateTextFileEditor';

const createMarkdownPdfBlobMock = vi.hoisted(() => vi.fn(async () => new Blob(['pdf'], { type: 'application/pdf' })));

vi.mock('../../utils/export/markdownPdf', () => ({
  createMarkdownPdfBlob: createMarkdownPdfBlobMock,
}));

describe('CreateTextFileEditor PDF export', () => {
  let root: TestRenderer | null = null;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    createMarkdownPdfBlobMock.mockClear();
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    vi.restoreAllMocks();
  });

  it('creates PDF files from Markdown instead of the html2canvas/html2pdf screenshot path', async () => {
    const onConfirm = vi.fn();
    root = createTestRenderer();

    await act(async () => {
      root!.render(
        <WindowProvider>
          <CreateTextFileEditor
            onConfirm={onConfirm}
            onCancel={vi.fn()}
            isProcessing={false}
            isLoading={false}
            initialContent={'# Exported\\n\\n![remote](https://example.com/remote.png)'}
            initialFilename="article.pdf"
            themeId="pearl"
          />
        </WindowProvider>,
      );
    });

    const saveButton = Array.from(document.body.querySelectorAll('button')).find(
      (button) => button.getAttribute('title') === 'Save',
    );
    expect(saveButton).toBeTruthy();
    expect(saveButton).not.toBeDisabled();

    await act(async () => {
      saveButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(createMarkdownPdfBlobMock).toHaveBeenCalledWith(
      '# Exported\\n\\n![remote](https://example.com/remote.png)',
      {
        filename: 'article.pdf',
        themeId: 'pearl',
      },
    );
    expect(onConfirm).toHaveBeenCalledWith(expect.any(Blob), 'article.pdf');
  });
});
