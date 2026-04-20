import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HeaderModelSelector } from './HeaderModelSelector';

vi.mock('../../contexts/I18nContext', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

describe('HeaderModelSelector', () => {
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

  it('shows the fast toggle for Gemma and uses it to toggle reasoning', async () => {
    const onToggleGemmaReasoning = vi.fn();

    await act(async () => {
      root.render(
        <HeaderModelSelector
          currentModelName="Gemma 4 31B IT"
          availableModels={[{ id: 'gemma-4-31b-it', name: 'Gemma 4 31B IT' }]}
          selectedModelId="gemma-4-31b-it"
          onSelectModel={vi.fn()}
          isSwitchingModel={false}
          isLoading={false}
          thinkingLevel="HIGH"
          onSetThinkingLevel={vi.fn()}
          showThoughts={true}
          onToggleGemmaReasoning={onToggleGemmaReasoning}
        />,
      );
    });

    const toggleButton = container.querySelector('button[aria-label="headerReasoningToggleAria"]');
    expect(toggleButton).not.toBeNull();
    expect(toggleButton?.getAttribute('title')).toBe('headerReasoningHighTitle');

    await act(async () => {
      toggleButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onToggleGemmaReasoning).toHaveBeenCalledTimes(1);
  });

  it('shows Gemma fast mode as minimal reasoning instead of reasoning off', async () => {
    await act(async () => {
      root.render(
        <HeaderModelSelector
          currentModelName="Gemma 4 31B IT"
          availableModels={[{ id: 'gemma-4-31b-it', name: 'Gemma 4 31B IT' }]}
          selectedModelId="gemma-4-31b-it"
          onSelectModel={vi.fn()}
          isSwitchingModel={false}
          isLoading={false}
          thinkingLevel="HIGH"
          onSetThinkingLevel={vi.fn()}
          showThoughts={false}
          onToggleGemmaReasoning={vi.fn()}
        />,
      );
    });

    const toggleButton = container.querySelector('button[aria-label="headerReasoningToggleAria"]');
    expect(toggleButton?.getAttribute('title')).toBe('headerReasoningMinimalFastTitle');
  });
});
