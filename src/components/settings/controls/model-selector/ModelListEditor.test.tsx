import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../../../contexts/I18nContext';
import { useSettingsStore } from '../../../../stores/settingsStore';
import { ModelListEditor } from './ModelListEditor';

describe('ModelListEditor', () => {
  let container: HTMLDivElement;
  let root: Root;
  const initialState = useSettingsStore.getState();

  beforeEach(() => {
    useSettingsStore.setState({ language: 'en' });
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
    vi.restoreAllMocks();
    useSettingsStore.setState(initialState);
  });

  it('keeps the editor open instead of saving an empty model list', () => {
    const onSave = vi.fn();
    const setIsEditingList = vi.fn();

    act(() => {
      root.render(
        <I18nProvider>
          <ModelListEditor
            availableModels={[]}
            onSave={onSave}
            setIsEditingList={setIsEditingList}
          />
        </I18nProvider>,
      );
    });

    act(() => {
      const saveButton = Array.from(container.querySelectorAll('button')).find(
        (button) => button.textContent?.includes('Save List'),
      );
      saveButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onSave).not.toHaveBeenCalled();
    expect(setIsEditingList).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Add at least one model before saving.');
  });

  it('lets the user change whether a model is pinned', () => {
    const onSave = vi.fn();

    act(() => {
      root.render(
        <I18nProvider>
          <ModelListEditor
            availableModels={[{ id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', isPinned: true }]}
            onSave={onSave}
            setIsEditingList={vi.fn()}
          />
        </I18nProvider>,
      );
    });

    act(() => {
      const pinButton = Array.from(container.querySelectorAll('button')).find(
        (button) => button.getAttribute('title')?.includes('Pinned'),
      );
      pinButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    act(() => {
      const saveButton = Array.from(container.querySelectorAll('button')).find(
        (button) => button.textContent?.includes('Save List'),
      );
      saveButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onSave).toHaveBeenCalledWith([
      { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', isPinned: false },
    ]);
  });
});
