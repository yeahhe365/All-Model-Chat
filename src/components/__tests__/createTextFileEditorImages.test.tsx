import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WindowProvider } from '../../contexts/WindowContext';
import { CreateTextFileEditor } from '../modals/CreateTextFileEditor';

describe('CreateTextFileEditor image insertion', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;
  let originalFileReader: typeof FileReader;

  beforeEach(() => {
    vi.useFakeTimers();
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    originalFileReader = globalThis.FileReader;

    class MockFileReader {
      onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
      onerror: ((event: ProgressEvent<FileReader>) => void) | null = null;

      readAsDataURL() {
        setTimeout(() => {
          this.onload?.({
            target: {
              result: 'data:image/png;base64,ZmFrZQ==',
            },
          } as ProgressEvent<FileReader>);
        }, 0);
      }
    }

    globalThis.FileReader = MockFileReader as unknown as typeof FileReader;
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });

    container?.remove();
    root = null;
    container = null;
    globalThis.FileReader = originalFileReader;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('stores pasted images as compact placeholders in the editor and restores data URLs on save', async () => {
    const onConfirm = vi.fn();
    const createObjectUrlSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:http://127.0.0.1:4173/stale-image');

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root!.render(
        <WindowProvider>
          <CreateTextFileEditor
            onConfirm={onConfirm}
            onCancel={vi.fn()}
            isProcessing={false}
            isLoading={false}
            t={(key) => key}
            initialFilename="draft.md"
            themeId="pearl"
          />
        </WindowProvider>,
      );
    });

    const textarea = document.body.querySelector('textarea');
    expect(textarea).toBeTruthy();

    const imageFile = new File(['fake-image'], 'clipboard.png', { type: 'image/png' });
    const pasteEvent = new Event('paste', { bubbles: true, cancelable: true });

    Object.defineProperty(pasteEvent, 'clipboardData', {
      configurable: true,
      value: {
        items: [
          {
            type: 'image/png',
            getAsFile: () => imageFile,
          },
        ],
        getData: () => '',
      },
    });

    await act(async () => {
      textarea!.dispatchEvent(pasteEvent);
      vi.runAllTimers();
      await Promise.resolve();
    });

    expect(createObjectUrlSpy).not.toHaveBeenCalled();
    expect((textarea as HTMLTextAreaElement).value).toContain('![clipboard.png](内嵌图片-1)');
    expect((textarea as HTMLTextAreaElement).value).not.toContain('data:image/png;base64,ZmFrZQ==');
    expect((textarea as HTMLTextAreaElement).value).not.toContain('blob:http://127.0.0.1:4173/stale-image');

    const allButtons = Array.from(document.body.querySelectorAll('button'));
    const createButton = allButtons[allButtons.length - 1];
    expect(createButton).toBeTruthy();

    await act(async () => {
      createButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm.mock.calls[0][0]).toContain('data:image/png;base64,ZmFrZQ==');
    expect(onConfirm.mock.calls[0][0]).not.toContain('(内嵌图片-1)');
  });
});
