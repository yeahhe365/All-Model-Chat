import { act } from 'react';
import { setupProviderTestRenderer as setupTestRenderer } from '@/test/providerTestUtils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateTextFileEditor } from './CreateTextFileEditor';

const createMarkdownPdfBlobMock = vi.hoisted(() => vi.fn(async () => new Blob(['pdf'], { type: 'application/pdf' })));

vi.mock('../../utils/export/markdownPdf', () => ({
  createMarkdownPdfBlob: createMarkdownPdfBlobMock,
}));

describe('CreateTextFileEditor PDF export', () => {
  const renderer = setupTestRenderer();

  beforeEach(() => {
    createMarkdownPdfBlobMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates PDF files from Markdown instead of the html2canvas/html2pdf screenshot path', async () => {
    const onConfirm = vi.fn();

    await act(async () => {
      renderer.render(
        <CreateTextFileEditor
          onConfirm={onConfirm}
          onCancel={vi.fn()}
          isProcessing={false}
          isLoading={false}
          initialContent={'# Exported\\n\\n![remote](https://example.com/remote.png)'}
          initialFilename="article.pdf"
          themeId="pearl"
        />,
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
