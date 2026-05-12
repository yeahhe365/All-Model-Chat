import { act } from 'react';
import { setupTestRenderer } from '@/test/testUtils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ModelOption } from '@/types';
import { ModelPicker } from './ModelPicker';

const renderPicker = ({
  models,
  selectedId,
  onSelect = vi.fn(),
}: {
  models: ModelOption[];
  selectedId: string;
  onSelect?: (modelId: string) => void;
}) => (
  <ModelPicker
    models={models}
    selectedId={selectedId}
    onSelect={onSelect}
    renderTrigger={({ isOpen, setIsOpen, selectedModel }) => (
      <button
        type="button"
        data-testid="model-picker-trigger"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedModel?.name ?? 'Select model'}
      </button>
    )}
  />
);

describe('ModelPicker behavior', () => {
  const renderer = setupTestRenderer();

  const models: ModelOption[] = [
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', isPinned: true },
    { id: 'gemma-4-31b-it', name: 'Gemma 4 31B IT' },
    { id: 'gemini-3.1-flash-tts-preview', name: 'Gemini 3.1 Flash TTS Preview' },
    { id: 'gemini-3-pro-image-preview', name: 'Gemini 3 Pro Image Preview' },
  ];

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders a plain model list without search, badges, or section labels', () => {
    act(() => {
      renderer.root.render(renderPicker({ models, selectedId: 'gemini-3-flash-preview' }));
    });

    act(() => {
      renderer.container
        .querySelector('[data-testid="model-picker-trigger"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(renderer.container.querySelector('input[placeholder="Search models..."]')).toBeNull();
    expect(renderer.container.querySelector('[data-badge-key="pinned"]')).toBeNull();
    expect(renderer.container.querySelector('[data-badge-key="flash"]')).toBeNull();
    expect(renderer.container.querySelector('[data-badge-key="pro"]')).toBeNull();
    expect(renderer.container.querySelector('[data-badge-key="gemma"]')).toBeNull();
    expect(renderer.container.querySelector('[data-badge-key="live"]')).toBeNull();
    expect(renderer.container.querySelector('[data-badge-key="tts"]')).toBeNull();
    expect(renderer.container.querySelector('[data-badge-key="image"]')).toBeNull();
    expect(renderer.container.querySelector('[data-badge-key="robotics"]')).toBeNull();
    expect(renderer.container.querySelector('[data-provider-section="gemini-native"]')).toBeNull();
    expect(renderer.container.querySelector('[data-provider-section="openai-compatible"]')).toBeNull();
    expect(renderer.container.textContent).not.toContain('Pinned');
    expect(renderer.container.textContent).not.toContain('Speech');
    expect(renderer.container.textContent).toContain('Gemini 3.1 Flash TTS Preview');
  });

  it('groups models by provider when provider metadata is available', () => {
    act(() => {
      renderer.root.render(
        renderPicker({
          models: [
            { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', apiMode: 'gemini-native' },
            { id: 'gpt-5.5', name: 'GPT-5.5', apiMode: 'openai-compatible' },
          ],
          selectedId: 'gemini-3-flash-preview',
        }),
      );
    });

    act(() => {
      renderer.container
        .querySelector('[data-testid="model-picker-trigger"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const geminiSection = renderer.container.querySelector('[data-provider-section="gemini-native"]');
    const openAISection = renderer.container.querySelector('[data-provider-section="openai-compatible"]');

    expect(geminiSection?.textContent).toContain('Gemini');
    expect(geminiSection?.textContent).toContain('Gemini 3 Flash Preview');
    expect(openAISection?.textContent).toContain('OpenAI Compatible');
    expect(openAISection?.textContent).toContain('GPT-5.5');
  });
});
