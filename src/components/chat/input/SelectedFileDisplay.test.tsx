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
        selectedFile_moreActions: 'More file actions',
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

describe('SelectedFileDisplay', () => {
  let container: HTMLDivElement;
  let root: Root;
  let originalIntersectionObserver: typeof IntersectionObserver | undefined;

  beforeEach(() => {
    originalIntersectionObserver = globalThis.IntersectionObserver;
    Object.defineProperty(globalThis, 'IntersectionObserver', {
      configurable: true,
      value: undefined,
    });
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
    if (originalIntersectionObserver) {
      Object.defineProperty(globalThis, 'IntersectionObserver', {
        configurable: true,
        value: originalIntersectionObserver,
      });
    } else {
      delete (globalThis as Partial<typeof globalThis>).IntersectionObserver;
    }
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

  it('renders primary file controls in a right-side action rail with larger targets', () => {
    const onConfigure = vi.fn();
    const onRemove = vi.fn();

    act(() => {
      root.render(
        <SelectedFileDisplay
          file={createFile()}
          onRemove={onRemove}
          onCancelUpload={() => {}}
          onConfigure={onConfigure}
        />,
      );
    });

    const actionRail = container.querySelector('[data-file-action-rail="true"]');
    const editButton = actionRail?.querySelector('[aria-label="Edit File"]');
    const removeButton = actionRail?.querySelector('[aria-label="Remove File"]');

    expect(actionRail).not.toBeNull();
    expect(editButton).not.toBeNull();
    expect(removeButton).not.toBeNull();
    expect(editButton?.className).toContain('h-[30px]');
    expect(editButton?.className).not.toContain('text-white/80');
    expect(removeButton?.className).toContain('w-[30px]');
  });

  it('uses a trash icon for the remove file action', () => {
    act(() => {
      root.render(<SelectedFileDisplay file={createFile()} onRemove={() => {}} onCancelUpload={() => {}} />);
    });

    const removeButton = container.querySelector('[aria-label="Remove File"]');

    expect(removeButton?.querySelector('.lucide-trash2')).not.toBeNull();
  });

  it('renders move-to-input as a direct text file action and keeps copy id in overflow', () => {
    const onMoveTextToInput = vi.fn();

    act(() => {
      root.render(
        <SelectedFileDisplay
          {...({
            file: createFile({ fileApiName: 'files/abc123' }),
            onRemove: () => {},
            onCancelUpload: () => {},
            onMoveTextToInput,
          } as any)}
        />,
      );
    });

    const actionRail = container.querySelector('[data-file-action-rail="true"]');
    const moveButton = actionRail?.querySelector('[aria-label="Move text to input"]') as HTMLButtonElement | null;
    const moreButton = actionRail?.querySelector('[aria-label="More file actions"]') as HTMLButtonElement | null;

    expect(moveButton).not.toBeNull();
    expect(moreButton).not.toBeNull();

    act(() => {
      moveButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onMoveTextToInput).toHaveBeenCalledWith(expect.objectContaining({ id: 'file-1' }));
    expect(container.querySelector('[role="menu"]')).toBeNull();

    act(() => {
      moreButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const menu = container.querySelector('[role="menu"]');

    expect(menu).not.toBeNull();
    expect(menu?.textContent).not.toContain('Move text to input');
    expect(menu?.textContent).toContain('Copy File ID');
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
    await vi.waitFor(() => {
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
    await vi.waitFor(() => {
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
