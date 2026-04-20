import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SelectedFileDisplay } from './SelectedFileDisplay';
import type { UploadedFile } from '../../../types';

vi.mock('../../../hooks/useCopyToClipboard', () => ({
  useCopyToClipboard: () => ({
    isCopied: false,
    copyToClipboard: vi.fn(),
  }),
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
      root.render(
        <SelectedFileDisplay
          file={createFile()}
          onRemove={() => {}}
          onCancelUpload={() => {}}
        />
      );
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
        />
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
        />
      );
    });

    expect(container.textContent).toContain('Processing on Gemini');
  });
});
