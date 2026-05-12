import { act } from 'react';
import { setupProviderTestRenderer as setupTestRenderer } from '@/test/providerTestUtils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setupStoreStateReset } from '@/test/storeTestUtils';
import { OpenAICompatibleModelListEditor } from './OpenAICompatibleModelListEditor';

describe('OpenAICompatibleModelListEditor', () => {
  const renderer = setupTestRenderer({ providers: { language: 'en' } });
  setupStoreStateReset();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adds a blank row and saves typed model IDs as model options', () => {
    const onModelsChange = vi.fn();

    act(() => {
      renderer.root.render(
        <OpenAICompatibleModelListEditor
          models={[{ id: 'gpt-5.5', name: 'GPT-5.5', isPinned: true }]}
          selectedModelId="gpt-5.5"
          onModelsChange={onModelsChange}
          onSelectedModelChange={vi.fn()}
        />,
      );
    });

    act(() => {
      const addButton = Array.from(renderer.container.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Add Model'),
      );
      addButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const inputs = Array.from(
      renderer.container.querySelectorAll<HTMLInputElement>('input[data-openai-compatible-model-id-input="true"]'),
    );

    expect(inputs.map((input) => input.value)).toEqual(['gpt-5.5', '']);

    act(() => {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
      descriptor?.set?.call(inputs[1], 'deepseek-chat');
      inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(onModelsChange).toHaveBeenCalledWith([
      { id: 'gpt-5.5', name: 'GPT-5.5', isPinned: true },
      { id: 'deepseek-chat', name: 'deepseek-chat' },
    ]);
  });

  it('saves custom model names for the model picker display', () => {
    const onModelsChange = vi.fn();

    act(() => {
      renderer.root.render(
        <OpenAICompatibleModelListEditor
          models={[{ id: 'openrouter/deepseek-chat', name: 'openrouter/deepseek-chat', isPinned: true }]}
          selectedModelId="openrouter/deepseek-chat"
          onModelsChange={onModelsChange}
          onSelectedModelChange={vi.fn()}
        />,
      );
    });

    const nameInput = renderer.container.querySelector<HTMLInputElement>(
      'input[data-openai-compatible-model-name-input="true"]',
    );

    expect(nameInput?.value).toBe('openrouter/deepseek-chat');

    act(() => {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
      descriptor?.set?.call(nameInput, 'DeepSeek Chat');
      nameInput?.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(onModelsChange).toHaveBeenLastCalledWith([
      { id: 'openrouter/deepseek-chat', name: 'DeepSeek Chat', isPinned: true },
    ]);
  });

  it('falls back to the model ID when the model name is blank', () => {
    const onModelsChange = vi.fn();

    act(() => {
      renderer.root.render(
        <OpenAICompatibleModelListEditor
          models={[{ id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', isPinned: true }]}
          selectedModelId="gpt-4.1-mini"
          onModelsChange={onModelsChange}
          onSelectedModelChange={vi.fn()}
        />,
      );
    });

    const nameInput = renderer.container.querySelector<HTMLInputElement>(
      'input[data-openai-compatible-model-name-input="true"]',
    );

    act(() => {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
      descriptor?.set?.call(nameInput, '   ');
      nameInput?.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(onModelsChange).toHaveBeenLastCalledWith([{ id: 'gpt-4.1-mini', name: 'gpt-4.1-mini', isPinned: true }]);
  });

  it('deduplicates model IDs when rows are edited to the same ID', () => {
    const onModelsChange = vi.fn();

    act(() => {
      renderer.root.render(
        <OpenAICompatibleModelListEditor
          models={[
            { id: 'gpt-5.5', name: 'GPT-5.5', isPinned: true },
            { id: 'gpt-4.1', name: 'GPT-4.1' },
          ]}
          selectedModelId="gpt-5.5"
          onModelsChange={onModelsChange}
          onSelectedModelChange={vi.fn()}
        />,
      );
    });

    const inputs = Array.from(
      renderer.container.querySelectorAll<HTMLInputElement>('input[data-openai-compatible-model-id-input="true"]'),
    );

    act(() => {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
      descriptor?.set?.call(inputs[1], 'gpt-5.5');
      inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(onModelsChange).toHaveBeenLastCalledWith([{ id: 'gpt-5.5', name: 'GPT-5.5', isPinned: true }]);
  });

  it('selects the first remaining model when the active model is removed', () => {
    const onModelsChange = vi.fn();
    const onSelectedModelChange = vi.fn();

    act(() => {
      renderer.root.render(
        <OpenAICompatibleModelListEditor
          models={[
            { id: 'gpt-5.5', name: 'GPT-5.5', isPinned: true },
            { id: 'gpt-4.1', name: 'GPT-4.1' },
          ]}
          selectedModelId="gpt-5.5"
          onModelsChange={onModelsChange}
          onSelectedModelChange={onSelectedModelChange}
        />,
      );
    });

    const removeButtons = Array.from(renderer.container.querySelectorAll('button')).filter((button) =>
      button.getAttribute('title')?.includes('Remove Model'),
    );

    act(() => {
      removeButtons[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onModelsChange).toHaveBeenLastCalledWith([{ id: 'gpt-4.1', name: 'GPT-4.1', isPinned: true }]);
    expect(onSelectedModelChange).toHaveBeenCalledWith('gpt-4.1');
  });
});
