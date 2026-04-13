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
});
