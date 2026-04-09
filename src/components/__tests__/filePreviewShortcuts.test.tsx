import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FilePreviewModal } from '../modals/FilePreviewModal';
import type { UploadedFile } from '../../types';

const t = (key: string) => key;

const makeFile = (overrides: Partial<UploadedFile> = {}): UploadedFile => ({
  id: 'file-1',
  name: 'notes.txt',
  type: 'text/plain',
  size: 12,
  dataUrl: 'data:text/plain;base64,SGVsbG8=',
  uploadState: 'active',
  ...overrides,
});

describe('FilePreviewModal shortcuts', () => {
  let container: HTMLDivElement;
  let root: Root;
  let writeTextMock: ReturnType<typeof vi.fn>;
  let selectionMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: writeTextMock,
      },
    });

    selectionMock = vi.fn(() => ({
      toString: () => '',
    }));
    Object.defineProperty(window, 'getSelection', {
      configurable: true,
      value: selectionMock,
    });

    global.fetch = vi.fn().mockResolvedValue({
      text: vi.fn().mockResolvedValue('Hello'),
      blob: vi.fn().mockResolvedValue(new Blob(['Hello'], { type: 'text/plain' })),
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.restoreAllMocks();
  });

  it('does not hijack copy when the user already selected text', async () => {
    selectionMock.mockReturnValue({
      toString: () => 'selected text',
    });

    await act(async () => {
      root.render(
        <FilePreviewModal
          file={makeFile()}
          onClose={vi.fn()}
          t={t as never}
        />
      );
    });

    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          key: 'c',
          metaKey: true,
        })
      );
      await Promise.resolve();
    });

    expect(writeTextMock).not.toHaveBeenCalled();
  });

  it('does not hijack arrow navigation from editable targets', async () => {
    const onNext = vi.fn();
    const input = document.createElement('input');
    document.body.appendChild(input);

    await act(async () => {
      root.render(
        <FilePreviewModal
          file={makeFile({ type: 'image/png', name: 'image.png', dataUrl: 'data:image/png;base64,AAAA' })}
          onClose={vi.fn()}
          onNext={onNext}
          hasNext
          t={t as never}
        />
      );
    });

    await act(async () => {
      input.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          key: 'ArrowRight',
        })
      );
    });

    expect(onNext).not.toHaveBeenCalled();
    input.remove();
  });
});
