import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ModelOption } from '../../types';
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
  let container: HTMLDivElement;
  let root: Root;

  const models: ModelOption[] = [
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', isPinned: true },
    { id: 'gemma-4-31b-it', name: 'Gemma 4 31B IT' },
    { id: 'gemini-3.1-flash-tts-preview', name: 'Gemini 3.1 Flash TTS Preview' },
    { id: 'gemini-3-pro-image-preview', name: 'Gemini 3 Pro Image Preview' },
  ];

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

  it('renders a plain model list without search, badges, or section labels', () => {
    act(() => {
      root.render(renderPicker({ models, selectedId: 'gemini-3-flash-preview' }));
    });

    act(() => {
      container
        .querySelector('[data-testid="model-picker-trigger"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.querySelector('input[placeholder="Search models..."]')).toBeNull();
    expect(container.querySelector('[data-badge-key="pinned"]')).toBeNull();
    expect(container.querySelector('[data-badge-key="flash"]')).toBeNull();
    expect(container.querySelector('[data-badge-key="pro"]')).toBeNull();
    expect(container.querySelector('[data-badge-key="gemma"]')).toBeNull();
    expect(container.querySelector('[data-badge-key="live"]')).toBeNull();
    expect(container.querySelector('[data-badge-key="tts"]')).toBeNull();
    expect(container.querySelector('[data-badge-key="image"]')).toBeNull();
    expect(container.querySelector('[data-badge-key="robotics"]')).toBeNull();
    expect(container.querySelector('[data-provider-section="gemini-native"]')).toBeNull();
    expect(container.querySelector('[data-provider-section="openai-compatible"]')).toBeNull();
    expect(container.textContent).not.toContain('Pinned');
    expect(container.textContent).not.toContain('Speech');
    expect(container.textContent).toContain('Gemini 3.1 Flash TTS Preview');
  });

  it('groups models by provider when provider metadata is available', () => {
    act(() => {
      root.render(
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
      container
        .querySelector('[data-testid="model-picker-trigger"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const geminiSection = container.querySelector('[data-provider-section="gemini-native"]');
    const openAISection = container.querySelector('[data-provider-section="openai-compatible"]');

    expect(geminiSection?.textContent).toContain('Gemini');
    expect(geminiSection?.textContent).toContain('Gemini 3 Flash Preview');
    expect(openAISection?.textContent).toContain('OpenAI Compatible');
    expect(openAISection?.textContent).toContain('GPT-5.5');
  });
});
