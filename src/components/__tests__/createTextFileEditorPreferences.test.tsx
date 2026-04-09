import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WindowProvider } from '../../contexts/WindowContext';
import { CreateTextFileEditor } from '../modals/CreateTextFileEditor';

describe('CreateTextFileEditor extension preference', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  const renderEditor = async (props: Partial<React.ComponentProps<typeof CreateTextFileEditor>> = {}) => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root!.render(
        <WindowProvider>
          <CreateTextFileEditor
            onConfirm={vi.fn()}
            onCancel={vi.fn()}
            isProcessing={false}
            isLoading={false}
            t={(key) => key}
            themeId="pearl"
            {...props}
          />
        </WindowProvider>
      );
    });
  };

  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = null;
    container = null;
    window.localStorage.clear();
  });

  it('remembers the last selected extension for new files', async () => {
    await renderEditor();

    let select = document.body.querySelector('select') as HTMLSelectElement | null;
    expect(select?.value).toBe('.md');

    await act(async () => {
      select!.value = '.txt';
      select!.dispatchEvent(new Event('change', { bubbles: true }));
    });

    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = null;
    container = null;

    await renderEditor();

    select = document.body.querySelector('select') as HTMLSelectElement | null;
    expect(select?.value).toBe('.txt');
  });

  it('prefers the existing file extension when editing a file', async () => {
    window.localStorage.setItem('createTextFileEditorLastExtension', '.txt');

    await renderEditor({ initialFilename: 'notes.py' });

    const select = document.body.querySelector('select') as HTMLSelectElement | null;
    expect(select?.value).toBe('.py');
  });
});
