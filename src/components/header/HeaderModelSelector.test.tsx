import { act } from 'react';
import { setupProviderTestRenderer } from '@/test/providerTestUtils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HeaderModelSelector } from './HeaderModelSelector';

describe('HeaderModelSelector', () => {
  const renderer = setupProviderTestRenderer({ providers: { language: 'en' } });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows the fast toggle for Gemma and uses it to toggle reasoning', async () => {
    const onToggleGemmaReasoning = vi.fn();

    await act(async () => {
      renderer.root.render(
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

    const toggleButton = renderer.container.querySelector('button[aria-label="Toggle reasoning mode"]');
    expect(toggleButton).not.toBeNull();
    expect(toggleButton?.getAttribute('title')).toBe('Reasoning: High');

    await act(async () => {
      toggleButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onToggleGemmaReasoning).toHaveBeenCalledTimes(1);
  });

  it('shows Gemma fast mode as minimal reasoning instead of reasoning off', async () => {
    await act(async () => {
      renderer.root.render(
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

    const toggleButton = renderer.container.querySelector('button[aria-label="Toggle reasoning mode"]');
    expect(toggleButton?.getAttribute('title')).toBe('Reasoning: Minimal (Fast Mode)');
  });

  it('does not render an icon inside the collapsed selector trigger', async () => {
    await act(async () => {
      renderer.root.render(
        <HeaderModelSelector
          currentModelName="Custom Model"
          availableModels={[{ id: 'custom-model', name: 'Custom Model' }]}
          selectedModelId="custom-model"
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

    const triggerButton = renderer.container.querySelector('button[aria-haspopup="listbox"]');
    expect(triggerButton?.querySelectorAll('svg')).toHaveLength(0);
  });

  it('hides the selector chevron while the model menu is expanded', async () => {
    await act(async () => {
      renderer.root.render(
        <HeaderModelSelector
          currentModelName="Custom Model"
          availableModels={[{ id: 'custom-model', name: 'Custom Model' }]}
          selectedModelId="custom-model"
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

    const triggerButton = renderer.container.querySelector('button[aria-haspopup="listbox"]');

    await act(async () => {
      triggerButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(triggerButton?.getAttribute('aria-expanded')).toBe('true');
    expect(triggerButton?.querySelectorAll('svg')).toHaveLength(0);
  });

  it('keeps compact header controls stable by avoiding scale transforms', async () => {
    await act(async () => {
      renderer.root.render(
        <HeaderModelSelector
          currentModelName="Gemini 3 Flash Preview"
          availableModels={[{ id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview' }]}
          selectedModelId="gemini-3-flash-preview"
          onSelectModel={vi.fn()}
          isSwitchingModel={false}
          isLoading={false}
          thinkingLevel="HIGH"
          onSetThinkingLevel={vi.fn()}
          showThoughts={true}
          onToggleGemmaReasoning={vi.fn()}
        />,
      );
    });

    const triggerButton = renderer.container.querySelector('button[aria-haspopup="listbox"]');
    const thinkingButton = renderer.container.querySelector('button[aria-label="Toggle thinking level"]');

    expect(triggerButton?.className).toContain('min-h-9');
    expect(triggerButton?.className).not.toContain('scale');
    expect(thinkingButton?.className).toContain('h-9');
    expect(thinkingButton?.className).toContain('w-9');
    expect(thinkingButton?.className).not.toContain('scale');
  });

  it('renders the collapsed model name with stronger emphasis', async () => {
    await act(async () => {
      renderer.root.render(
        <HeaderModelSelector
          currentModelName="Gemini Robotics-ER 1.6 Preview"
          availableModels={[{ id: 'gemini-robotics-er-1.6-preview', name: 'Gemini Robotics-ER 1.6 Preview' }]}
          selectedModelId="gemini-robotics-er-1.6-preview"
          onSelectModel={vi.fn()}
          isSwitchingModel={false}
          isLoading={false}
          thinkingLevel="HIGH"
          onSetThinkingLevel={vi.fn()}
          showThoughts={true}
          onToggleGemmaReasoning={vi.fn()}
        />,
      );
    });

    const label = Array.from(renderer.container.querySelectorAll('span')).find(
      (node) => node.textContent === 'Robotics-ER 1.6',
    );
    expect(label?.className).toContain('font-semibold');
  });

  it('shows the fast toggle for Gemini Robotics-ER 1.6 and uses minimal thinking as fast mode', async () => {
    const onSetThinkingLevel = vi.fn();

    await act(async () => {
      renderer.root.render(
        <HeaderModelSelector
          currentModelName="Gemini Robotics-ER 1.6 Preview"
          availableModels={[{ id: 'gemini-robotics-er-1.6-preview', name: 'Gemini Robotics-ER 1.6 Preview' }]}
          selectedModelId="gemini-robotics-er-1.6-preview"
          onSelectModel={vi.fn()}
          isSwitchingModel={false}
          isLoading={false}
          thinkingLevel="HIGH"
          onSetThinkingLevel={onSetThinkingLevel}
          showThoughts={true}
          onToggleGemmaReasoning={vi.fn()}
        />,
      );
    });

    const toggleButton = renderer.container.querySelector('button[aria-label="Toggle thinking level"]');
    expect(toggleButton).not.toBeNull();
    expect(toggleButton?.getAttribute('title')).toBe('Thinking: High (Pro Mode)');

    await act(async () => {
      toggleButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onSetThinkingLevel).toHaveBeenCalledWith('MINIMAL');
  });

  it('does not show the thinking fast toggle for Gemini 3.1 Flash TTS Preview', async () => {
    await act(async () => {
      renderer.root.render(
        <HeaderModelSelector
          currentModelName="Gemini 3.1 Flash TTS Preview"
          availableModels={[{ id: 'gemini-3.1-flash-tts-preview', name: 'Gemini 3.1 Flash TTS Preview' }]}
          selectedModelId="gemini-3.1-flash-tts-preview"
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

    expect(renderer.container.querySelector('button[aria-label="Toggle thinking level"]')).toBeNull();
    expect(renderer.container.querySelector('button[aria-label="Toggle reasoning mode"]')).toBeNull();
  });
});
