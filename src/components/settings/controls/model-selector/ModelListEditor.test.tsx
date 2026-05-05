import { act } from 'react';
import { createTestRenderer, type TestRenderer } from '@/test/testUtils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../../../contexts/I18nContext';
import { useSettingsStore } from '../../../../stores/settingsStore';
import { ModelListEditor } from './ModelListEditor';

describe('ModelListEditor', () => {
  let container: HTMLDivElement;
  let root: TestRenderer;
  const initialState = useSettingsStore.getState();

  beforeEach(() => {
    useSettingsStore.setState({ language: 'en' });
    root = createTestRenderer();
    container = root.container;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    vi.restoreAllMocks();
    useSettingsStore.setState(initialState);
  });

  it('keeps the editor open instead of saving an empty model list', () => {
    const onSave = vi.fn();
    const setIsEditingList = vi.fn();

    act(() => {
      root.render(
        <I18nProvider>
          <ModelListEditor availableModels={[]} onSave={onSave} setIsEditingList={setIsEditingList} />
        </I18nProvider>,
      );
    });

    act(() => {
      const saveButton = Array.from(container.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Save List'),
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
      const pinButton = Array.from(container.querySelectorAll('button')).find((button) =>
        button.getAttribute('title')?.includes('Pinned'),
      );
      pinButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    act(() => {
      const saveButton = Array.from(container.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Save List'),
      );
      saveButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onSave).toHaveBeenCalledWith([{ id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', isPinned: false }]);
  });

  it('blocks saving duplicate model ids after trimming whitespace', () => {
    const onSave = vi.fn();

    act(() => {
      root.render(
        <I18nProvider>
          <ModelListEditor
            availableModels={[
              { id: ' gemini-3-flash-preview ', name: 'Gemini 3 Flash', isPinned: true },
              { id: 'gemini-3-flash-preview', name: 'Duplicate Gemini 3 Flash', isPinned: false },
            ]}
            onSave={onSave}
            setIsEditingList={vi.fn()}
          />
        </I18nProvider>,
      );
    });

    act(() => {
      const saveButton = Array.from(container.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Save List'),
      );
      saveButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onSave).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Model IDs must be unique.');
  });

  it('resets to caller-provided defaults for independent model lists', async () => {
    const onSave = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    act(() => {
      root.render(
        <I18nProvider>
          <ModelListEditor
            availableModels={[{ id: 'custom-openai-model', name: 'Custom OpenAI Model', isPinned: true }]}
            defaultModels={[
              { id: 'gpt-5.5', name: 'GPT-5.5', isPinned: true },
              { id: 'gpt-4.1', name: 'GPT-4.1' },
            ]}
            onSave={onSave}
            setIsEditingList={vi.fn()}
          />
        </I18nProvider>,
      );
    });

    await act(async () => {
      const resetButton = Array.from(container.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Reset'),
      );
      resetButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    act(() => {
      const saveButton = Array.from(container.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Save List'),
      );
      saveButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onSave).toHaveBeenCalledWith([
      { id: 'gpt-5.5', name: 'GPT-5.5', isPinned: true },
      { id: 'gpt-4.1', name: 'GPT-4.1', isPinned: false },
    ]);
  });
});
