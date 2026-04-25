import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pdfjs } from 'react-pdf';
import { SelectedFileDisplay } from './SelectedFileDisplay';
import type { UploadedFile } from '../../../types';

vi.mock('../../../hooks/useCopyToClipboard', () => ({
  useCopyToClipboard: () => ({
    isCopied: false,
    copyToClipboard: vi.fn(),
  }),
}));

vi.mock('../../../contexts/I18nContext', () => ({
  useI18n: () => ({
    t: (key: string) =>
      ({
        selectedFile_cancelUpload: 'Cancel Upload',
        selectedFile_removeFile: 'Remove File',
        selectedFile_editFile: 'Edit File',
        selectedFile_configureFile: 'Configure File',
        selectedFile_moveTextToInput: 'Move text to input',
        selectedFile_idCopied: 'ID Copied',
        selectedFile_copyFileId: 'Copy File ID',
        selectedFile_errorFallback: 'Error',
        selectedFile_uploading: 'Uploading {percent}%',
        selectedFile_processingGemini: 'Processing on Gemini',
        selectedFile_cancelled: 'Cancelled',
      })[key] ?? key,
  }),
}));

vi.mock('react-pdf', () => ({
  Document: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-pdf-document">{children}</div>,
  Page: ({ pageNumber }: { pageNumber: number }) => (
    <div data-testid="mock-pdf-page" data-page-number={pageNumber}>
      PDF page {pageNumber}
    </div>
  ),
  pdfjs: {
    GlobalWorkerOptions: {
      workerSrc: 'pdf.worker.mjs',
    },
  },
}));

const createFile = (overrides: Partial<UploadedFile> = {}): UploadedFile => ({
  id: 'file-1',
  name: 'notes.txt',
  type: 'text/plain',
  size: 128,
  uploadState: 'active',
  isProcessing: false,
  ...overrides,
});

const waitForAssertion = async (assertion: () => void) => {
  let lastError: unknown;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      assertion();
      return;
    } catch (error) {
      lastError = error;
      await act(async () => {
        await new Promise((resolve) => {
          window.setTimeout(resolve, 0);
        });
      });
    }
  }

  throw lastError;
};

describe('SelectedFileDisplay', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('keeps the preview frame on a dedicated class so success animations can target it', () => {
    act(() => {
      root.render(<SelectedFileDisplay file={createFile()} onRemove={() => {}} onCancelUpload={() => {}} />);
    });

    expect(container.querySelector('.file-preview-box')).not.toBeNull();
  });

  it('shows upload percentage and speed while a file is uploading', () => {
    act(() => {
      root.render(
        <SelectedFileDisplay
          file={createFile({
            uploadState: 'uploading',
            isProcessing: true,
            progress: 42,
            uploadSpeed: '1.8 MB/s',
          })}
          onRemove={() => {}}
          onCancelUpload={() => {}}
        />,
      );
    });

    expect(container.textContent).toContain('42%');
    expect(container.textContent).toContain('1.8 MB/s');
  });

  it('shows a dedicated Gemini processing stage after upload completes', () => {
    act(() => {
      root.render(
        <SelectedFileDisplay
          file={createFile({
            uploadState: 'processing_api',
            isProcessing: true,
            progress: 100,
          })}
          onRemove={() => {}}
          onCancelUpload={() => {}}
        />,
      );
    });

    expect(container.textContent).toContain('Processing on Gemini');
  });

  it('shows a move-to-input action for active text files when the callback is provided', () => {
    act(() => {
      root.render(
        <SelectedFileDisplay
          {...({
            file: createFile(),
            onRemove: () => {},
            onCancelUpload: () => {},
            onMoveTextToInput: vi.fn(),
          } as any)}
        />,
      );
    });

    const moveButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.getAttribute('aria-label') === 'Move text to input',
    );

    expect(moveButton).not.toBeUndefined();
  });

  it('does not show the move-to-input action for non-text files', () => {
    act(() => {
      root.render(
        <SelectedFileDisplay
          {...({
            file: createFile({
              name: 'diagram.png',
              type: 'image/png',
            }),
            onRemove: () => {},
            onCancelUpload: () => {},
            onMoveTextToInput: vi.fn(),
          } as any)}
        />,
      );
    });

    const moveButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.getAttribute('aria-label') === 'Move text to input',
    );

    expect(moveButton).toBeUndefined();
  });

  it('renders a text snippet thumbnail for text files', () => {
    act(() => {
      root.render(
        <SelectedFileDisplay
          file={createFile({
            textContent: 'first line\nsecond line\nthird line',
          })}
          onRemove={() => {}}
          onCancelUpload={() => {}}
        />,
      );
    });

    expect(container.querySelector('[data-thumbnail-kind="text"]')).not.toBeNull();
    expect(container.textContent).toContain('first line');
  });

  it('renders a first-page thumbnail for PDF files', async () => {
    await act(async () => {
      root.render(
        <SelectedFileDisplay
          file={createFile({
            name: 'paper.pdf',
            type: 'application/pdf',
            dataUrl: 'blob:paper',
          })}
          onRemove={() => {}}
          onCancelUpload={() => {}}
        />,
      );
    });

    expect(container.querySelector('[data-thumbnail-kind="pdf"]')).not.toBeNull();
    await waitForAssertion(() => {
      expect(container.querySelector('[data-testid="mock-pdf-page"]')).not.toBeNull();
    });
  });

  it('overrides the pdf.js default worker module specifier for PDF thumbnails', async () => {
    await act(async () => {
      root.render(
        <SelectedFileDisplay
          file={createFile({
            name: 'paper.pdf',
            type: 'application/pdf',
            dataUrl: 'blob:paper',
          })}
          onRemove={() => {}}
          onCancelUpload={() => {}}
        />,
      );
    });
    await waitForAssertion(() => {
      expect(pdfjs.GlobalWorkerOptions.workerSrc).toBe('/pdf.worker.min.mjs');
    });
  });

  it('renders an inline video thumbnail for video files', () => {
    act(() => {
      root.render(
        <SelectedFileDisplay
          file={createFile({
            name: 'clip.mp4',
            type: 'video/mp4',
            dataUrl: 'blob:clip',
          })}
          onRemove={() => {}}
          onCancelUpload={() => {}}
        />,
      );
    });

    expect(container.querySelector('[data-thumbnail-kind="video"]')).not.toBeNull();
    expect(container.querySelector('video')).not.toBeNull();
  });

  it('renders a waveform thumbnail for audio files', () => {
    act(() => {
      root.render(
        <SelectedFileDisplay
          file={createFile({
            name: 'voice.mp3',
            type: 'audio/mpeg',
            dataUrl: 'blob:voice',
          })}
          onRemove={() => {}}
          onCancelUpload={() => {}}
        />,
      );
    });

    expect(container.querySelector('[data-thumbnail-kind="audio"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-waveform-bar="true"]').length).toBeGreaterThan(0);
  });

  it('renders a cover thumbnail for spreadsheet and other document files', () => {
    act(() => {
      root.render(
        <SelectedFileDisplay
          file={createFile({
            name: 'metrics.csv',
            type: 'text/csv',
          })}
          onRemove={() => {}}
          onCancelUpload={() => {}}
        />,
      );
    });

    expect(container.querySelector('[data-thumbnail-kind="spreadsheet"]')).not.toBeNull();
  });
});
