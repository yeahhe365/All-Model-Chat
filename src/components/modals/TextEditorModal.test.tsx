import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WindowProvider } from '../../contexts/WindowContext';
import { TextEditorModal } from './TextEditorModal';

describe('TextEditorModal', () => {
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

  const setTextareaValue = (textarea: HTMLTextAreaElement, value: string) => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');

    descriptor?.set?.call(textarea, value);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
  };

  it('commits edited text when the modal closes through the footer action', async () => {
    const onChange = vi.fn();
    const onClose = vi.fn();

    await act(async () => {
      root.render(
        <WindowProvider>
          <TextEditorModal
            isOpen
            onClose={onClose}
            title="Editor"
            value="Original"
            onChange={onChange}
            t={() => 'Done'}
          />
        </WindowProvider>,
      );
    });

    const textarea = document.body.querySelector('textarea') as HTMLTextAreaElement | null;
    expect(textarea).not.toBeNull();

    await act(async () => {
      setTextareaValue(textarea!, 'Updated text');
    });

    const doneButton = Array.from(document.body.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Done'),
    ) as HTMLButtonElement | undefined;

    expect(doneButton).toBeDefined();

    await act(async () => {
      doneButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onChange).toHaveBeenCalledWith('Updated text');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('adds visible keyboard focus styles to the close and confirm actions', async () => {
    await act(async () => {
      root.render(
        <WindowProvider>
          <TextEditorModal
            isOpen
            onClose={vi.fn()}
            title="Editor"
            value="Original"
            onChange={vi.fn()}
            t={() => 'Done'}
          />
        </WindowProvider>,
      );
    });

    const buttons = Array.from(document.body.querySelectorAll('button'));
    const closeButton = buttons[0];
    const doneButton = buttons.find((button) => button.textContent?.includes('Done'));

    expect(closeButton?.className).toContain('focus-visible:ring-2');
    expect(doneButton?.className).toContain('focus-visible:ring-2');
  });
});
