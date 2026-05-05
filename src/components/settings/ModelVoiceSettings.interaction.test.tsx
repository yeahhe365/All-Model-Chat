import { act } from 'react';
import { setupTestRenderer } from '@/test/testUtils';
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
  const renderer = setupTestRenderer();
  const initialState = useSettingsStore.getState();

  const baseProps = {
    modelId: 'gemini-3-flash-preview',
    setModelId: vi.fn(),
    availableModels: [
      { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', isPinned: true },
      { id: 'gemma-4-31b-it', name: 'Gemma 4 31B IT' },
    ],
    t: (key: string) => key,
    setAvailableModels: vi.fn(),
    currentSettings: {
      ...useSettingsStore.getState().appSettings,
      transcriptionModelId: 'gemini-3-flash-preview',
      ttsVoice: 'Zephyr',
      systemInstruction: '',
      thinkingBudget: -1,
      thinkingLevel: 'HIGH' as const,
      showThoughts: true,
      temperature: 1,
      topP: 0.95,
      topK: 64,
      mediaResolution: MediaResolution.MEDIA_RESOLUTION_UNSPECIFIED,
    },
    onUpdateSetting: vi.fn(),
  };

  beforeEach(() => {
    useSettingsStore.setState({ language: 'en' });
  });

  afterEach(() => {
    vi.clearAllMocks();
    useSettingsStore.setState(initialState);
  });

  it('selects a model and commits pending prompt edits when clicking a model row', async () => {
    const setModelId = vi.fn();
    const onUpdateSetting = vi.fn();

    await act(async () => {
      renderer.root.render(
        <I18nProvider>
          <ModelVoiceSettings {...baseProps} setModelId={setModelId} onUpdateSetting={onUpdateSetting} />
        </I18nProvider>,
      );
    });

    const textarea = renderer.container.querySelector<HTMLTextAreaElement>('#system-prompt-input');
    expect(textarea).not.toBeNull();

    await act(async () => {
      textarea?.focus();
      const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
      descriptor?.set?.call(textarea, 'Persist this prompt');
      textarea?.dispatchEvent(new Event('input', { bubbles: true }));
      textarea?.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const modelButton = renderer.container.querySelector<HTMLButtonElement>(
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
    expect(onUpdateSetting).toHaveBeenCalledWith('systemInstruction', 'Persist this prompt');
  });

  it('shows system prompt status, clear action, and a taller editor', async () => {
    const onUpdateSetting = vi.fn();

    await act(async () => {
      renderer.root.render(
        <I18nProvider>
          <ModelVoiceSettings
            {...baseProps}
            currentSettings={{ ...baseProps.currentSettings, systemInstruction: 'Stay concise.' }}
            onUpdateSetting={onUpdateSetting}
          />
        </I18nProvider>,
      );
    });

    const textarea = renderer.container.querySelector<HTMLTextAreaElement>('#system-prompt-input');
    const clearButton = renderer.container.querySelector<HTMLButtonElement>('[aria-label="Clear system prompt"]');
    const expandButton = renderer.container.querySelector<HTMLButtonElement>('[aria-label="Full editor"]');

    expect(renderer.container.textContent).toContain('Enabled');
    expect(textarea?.className).toContain('min-h-[112px]');
    expect(clearButton).not.toBeNull();
    expect(clearButton?.className).toContain('hover:text-[var(--theme-text-danger)]');
    expect(expandButton?.className).toContain('w-8');
    expect(expandButton?.className).toContain('h-8');
    expect(expandButton?.className).toContain('hover:text-[var(--theme-text-link)]');

    await act(async () => {
      clearButton?.click();
    });

    expect(onUpdateSetting).toHaveBeenCalledWith('systemInstruction', '');
    expect(textarea?.value).toBe('');
    expect(renderer.container.textContent).toContain('Not set');
    expect(renderer.container.querySelector<HTMLButtonElement>('[aria-label="Clear system prompt"]')).toBeNull();
  });
});
