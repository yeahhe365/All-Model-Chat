import { act } from 'react';
import { setupProviderTestRenderer as setupTestRenderer } from '@/test/providerTestUtils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setupStoreStateReset } from '@/test/storeTestUtils';
import { ModelListEditor } from './ModelListEditor';

describe('ModelListEditor', () => {
  const renderer = setupTestRenderer({ providers: { language: 'en' } });
  setupStoreStateReset();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps the editor open instead of saving an empty model list', () => {
    const onSave = vi.fn();
    const setIsEditingList = vi.fn();

    act(() => {
      renderer.root.render(
        <ModelListEditor availableModels={[]} onSave={onSave} setIsEditingList={setIsEditingList} />,
      );
    });

    act(() => {
      const saveButton = Array.from(renderer.container.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Save List'),
      );
      saveButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onSave).not.toHaveBeenCalled();
    expect(setIsEditingList).not.toHaveBeenCalled();
    expect(renderer.container.textContent).toContain('Add at least one model before saving.');
  });

  it('lets the user change whether a model is pinned', () => {
    const onSave = vi.fn();

    act(() => {
      renderer.root.render(
        <ModelListEditor
          availableModels={[{ id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', isPinned: true }]}
          onSave={onSave}
          setIsEditingList={vi.fn()}
        />,
      );
    });

    act(() => {
      const pinButton = Array.from(renderer.container.querySelectorAll('button')).find((button) =>
        button.getAttribute('title')?.includes('Pinned'),
      );
      pinButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    act(() => {
      const saveButton = Array.from(renderer.container.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Save List'),
      );
      saveButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onSave).toHaveBeenCalledWith([{ id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', isPinned: false }]);
  });

  it('blocks saving duplicate model ids after trimming whitespace', () => {
    const onSave = vi.fn();

    act(() => {
      renderer.root.render(
        <ModelListEditor
          availableModels={[
            { id: ' gemini-3-flash-preview ', name: 'Gemini 3 Flash', isPinned: true },
            { id: 'gemini-3-flash-preview', name: 'Duplicate Gemini 3 Flash', isPinned: false },
          ]}
          onSave={onSave}
          setIsEditingList={vi.fn()}
        />,
      );
    });

    act(() => {
      const saveButton = Array.from(renderer.container.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Save List'),
      );
      saveButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onSave).not.toHaveBeenCalled();
    expect(renderer.container.textContent).toContain('Model IDs must be unique.');
  });

  it('preserves provider metadata when saving a combined model list', () => {
    const onSave = vi.fn();

    act(() => {
      renderer.root.render(
        <ModelListEditor
          availableModels={[
            {
              id: 'gemini-3-flash-preview',
              name: 'Gemini 3 Flash',
              isPinned: true,
              apiMode: 'gemini-native',
            },
            { id: 'gpt-5.5', name: 'GPT-5.5', isPinned: false, apiMode: 'openai-compatible' },
          ]}
          onSave={onSave}
          setIsEditingList={vi.fn()}
        />,
      );
    });

    act(() => {
      const saveButton = Array.from(renderer.container.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Save List'),
      );
      saveButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onSave).toHaveBeenCalledWith([
      { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', isPinned: true, apiMode: 'gemini-native' },
      { id: 'gpt-5.5', name: 'GPT-5.5', isPinned: false, apiMode: 'openai-compatible' },
    ]);
  });

  it('resets to caller-provided defaults for independent model lists', async () => {
    const onSave = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    act(() => {
      renderer.root.render(
        <ModelListEditor
          availableModels={[{ id: 'custom-openai-model', name: 'Custom OpenAI Model', isPinned: true }]}
          defaultModels={[
            { id: 'gpt-5.5', name: 'GPT-5.5', isPinned: true },
            { id: 'gpt-4.1', name: 'GPT-4.1' },
          ]}
          onSave={onSave}
          setIsEditingList={vi.fn()}
        />,
      );
    });

    await act(async () => {
      const resetButton = Array.from(renderer.container.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Reset'),
      );
      resetButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    act(() => {
      const saveButton = Array.from(renderer.container.querySelectorAll('button')).find((button) =>
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
