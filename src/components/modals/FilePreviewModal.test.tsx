import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UploadedFile } from '../../types';

const { mockExtractDocxText } = vi.hoisted(() => ({
  mockExtractDocxText: vi.fn(),
}));

vi.mock('../../contexts/I18nContext', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../shared/Modal', () => ({
  Modal: ({ children }: { children: React.ReactNode }) => <div data-testid="modal-shell">{children}</div>,
}));

vi.mock('../shared/file-preview/FilePreviewHeader', () => ({
  FilePreviewHeader: () => <div data-testid="file-preview-header" />,
}));

vi.mock('../shared/file-preview/TextFileViewer', () => ({
  TextFileViewer: ({ content }: { content?: string | null }) => (
    <div data-testid="text-file-viewer">{content ?? ''}</div>
  ),
}));

vi.mock('../../utils/docxPreview', () => ({
  extractDocxText: mockExtractDocxText,
  isDocxFile: (file: { name: string; type: string }) =>
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    || file.name.toLowerCase().endsWith('.docx'),
}));

import { FilePreviewModal } from './FilePreviewModal';

describe('FilePreviewModal', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

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
    document.body.innerHTML = '';
  });

  it('renders extracted docx text in the text preview surface', async () => {
    mockExtractDocxText.mockResolvedValue({
      text: 'Quarterly document preview',
      messages: [],
    });

    await act(async () => {
      root.render(
        <FilePreviewModal
          file={createDocxFile()}
          onClose={() => {}}
        />,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockExtractDocxText).toHaveBeenCalledTimes(1);
    expect(document.querySelector('[data-testid="text-file-viewer"]')?.textContent).toContain(
      'Quarterly document preview',
    );
  });

  it('shows a readable error when docx preview extraction fails', async () => {
    mockExtractDocxText.mockRejectedValue(new Error('preview failed'));

    await act(async () => {
      root.render(
        <FilePreviewModal
          file={createDocxFile()}
          onClose={() => {}}
        />,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(document.body.textContent).toContain('Unable to preview this Word document.');
  });
});
