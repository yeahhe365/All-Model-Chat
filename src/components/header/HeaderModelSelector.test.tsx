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

  it('shows the fast toggle for Gemma and uses it to toggle showThoughts', async () => {
    const onToggleGemmaThinking = vi.fn();

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
          onToggleGemmaThinking={onToggleGemmaThinking}
        />,
      );
    });

    const toggleButton = container.querySelector('button[aria-label="Toggle thinking level"]');
    expect(toggleButton).not.toBeNull();

    await act(async () => {
      toggleButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onToggleGemmaThinking).toHaveBeenCalledTimes(1);
  });
});
