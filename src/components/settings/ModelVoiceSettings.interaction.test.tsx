import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../contexts/I18nContext';
import { useSettingsStore } from '../../stores/settingsStore';
import { ModelVoiceSettings } from './ModelVoiceSettings';
import { MediaResolution } from '../../types/settings';

vi.mock('./controls/thinking/ThinkingControl', () => ({
  ThinkingControl: () => <div data-testid="thinking-control" />,
}));

vi.mock('./controls/VoiceControl', () => ({
  VoiceControl: () => <div data-testid="voice-control" />,
}));

vi.mock('../modals/TextEditorModal', () => ({
  TextEditorModal: () => null,
}));

vi.mock('../shared/Tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('ModelVoiceSettings interactions', () => {
  let container: HTMLDivElement;
  let root: Root;
  const initialState = useSettingsStore.getState();

  const baseProps = {
    modelId: 'gemini-3-flash-preview',
    setModelId: vi.fn(),
    availableModels: [
      { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', isPinned: true },
      { id: 'gemma-4-31b-it', name: 'Gemma 4 31B IT' },
    ],
    transcriptionModelId: 'gemini-3-flash-preview',
    setTranscriptionModelId: vi.fn(),
    ttsVoice: 'Zephyr',
    setTtsVoice: vi.fn(),
    t: (key: string) => key,
    systemInstruction: '',
    setSystemInstruction: vi.fn(),
    thinkingBudget: -1,
    setThinkingBudget: vi.fn(),
    thinkingLevel: 'HIGH' as const,
    setThinkingLevel: vi.fn(),
    showThoughts: true,
    setShowThoughts: vi.fn(),
    temperature: 1,
    setTemperature: vi.fn(),
    topP: 0.95,
    setTopP: vi.fn(),
    topK: 64,
    setTopK: vi.fn(),
    setAvailableModels: vi.fn(),
    mediaResolution: MediaResolution.MEDIA_RESOLUTION_UNSPECIFIED,
    setMediaResolution: vi.fn(),
  };

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
    vi.clearAllMocks();
    useSettingsStore.setState(initialState);
  });

  it('selects a model and commits pending prompt edits when clicking a model row', async () => {
    const setModelId = vi.fn();
    const setSystemInstruction = vi.fn();

    await act(async () => {
      root.render(
        <I18nProvider>
          <ModelVoiceSettings
            {...baseProps}
            setModelId={setModelId}
            setSystemInstruction={setSystemInstruction}
          />
        </I18nProvider>,
      );
    });

    const textarea = container.querySelector<HTMLTextAreaElement>('#system-prompt-input');
    expect(textarea).not.toBeNull();

    await act(async () => {
      textarea?.focus();
      const descriptor = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        'value',
      );
      descriptor?.set?.call(textarea, 'Persist this prompt');
      textarea?.dispatchEvent(new Event('input', { bubbles: true }));
      textarea?.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const modelButton = container.querySelector<HTMLButtonElement>(
      '[data-testid="settings-model-option-gemma-4-31b-it"]',
    );
    expect(modelButton).not.toBeNull();

    await act(async () => {
      modelButton?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      textarea?.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
      modelButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(setModelId).toHaveBeenCalledWith('gemma-4-31b-it');
    expect(setSystemInstruction).toHaveBeenCalledWith('Persist this prompt');
  });
});
