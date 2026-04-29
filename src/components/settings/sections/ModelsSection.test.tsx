import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../../contexts/I18nContext';
import { useSettingsStore } from '../../../stores/settingsStore';
import { ModelsSection } from './ModelsSection';

const mockSafetySection = vi.hoisted(() => ({
  renderCount: 0,
  lastProps: null as any,
}));

const mockLanguageVoiceSection = vi.hoisted(() => ({
  lastProps: null as any,
}));

const mockModelSelector = vi.hoisted(() => ({
  lastProps: null as any,
}));

vi.mock('../controls/ModelSelector', () => ({
  ModelSelector: (props: any) => {
    mockModelSelector.lastProps = props;
    return <div data-testid="model-selector">model selector</div>;
  },
}));

vi.mock('./LanguageVoiceSection', () => ({
  LanguageVoiceSection: (props: any) => {
    mockLanguageVoiceSection.lastProps = props;
    return <div data-testid="language-voice-section">language voice section</div>;
  },
}));

vi.mock('./SafetySection', () => ({
  SafetySection: (props: any) => {
    mockSafetySection.renderCount += 1;
    mockSafetySection.lastProps = props;
    return <div data-testid="safety-section">safety section</div>;
  },
}));

describe('ModelsSection', () => {
  let container: HTMLDivElement;
  let root: Root;
  const initialState = useSettingsStore.getState();

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
    useSettingsStore.setState(initialState);
    mockSafetySection.renderCount = 0;
    mockSafetySection.lastProps = null;
    mockLanguageVoiceSection.lastProps = null;
    mockModelSelector.lastProps = null;
  });

  it('keeps tab cycle model settings out of models settings', async () => {
    const onUpdateSettings = vi.fn();

    await act(async () => {
      useSettingsStore.setState({ language: 'en' });
      root.render(
        <I18nProvider>
          <ModelsSection
            modelId="gemini-3.1-pro-preview"
            setModelId={vi.fn()}
            availableModels={[
              { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview', isPinned: true },
              { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', isPinned: true },
              { id: 'gemini-3.1-flash-lite-preview', name: 'Gemini 3.1 Flash Lite Preview', isPinned: true },
            ]}
            setAvailableModels={vi.fn()}
            currentSettings={{
              ...useSettingsStore.getState().appSettings,
              tabModelCycleIds: ['gemini-3.1-pro-preview', 'gemini-3-flash-preview'],
            }}
            onUpdateSettings={onUpdateSettings}
            t={(key) =>
              ({
                shortcuts_cycle_models_scope_title: 'Models Included In Tab Cycle',
                shortcuts_cycle_models_scope_hint: 'Tab cycles through the checked models in the current picker order.',
                shortcuts_cycle_models_scope_summary: '{count} models selected',
                shortcuts_cycle_models_scope_toggle_aria: 'Toggle Tab cycle model panel',
                shortcuts_cycle_models_scope_model_aria: 'Toggle Tab cycle model',
              })[String(key)] ?? String(key)
            }
          />
        </I18nProvider>,
      );
    });

    expect(container.querySelector('[data-testid="model-selector"]')).not.toBeNull();
    expect(container.textContent).not.toContain('Models Included In Tab Cycle');
    expect(container.textContent).not.toContain('2 models selected');
    expect(container.textContent).not.toContain('Gemini 3.1 Flash Lite Preview');
    expect(container.querySelector<HTMLButtonElement>('button[aria-label="Toggle Tab cycle model panel"]')).toBeNull();
    expect(onUpdateSettings).not.toHaveBeenCalledWith(
      expect.objectContaining({
        tabModelCycleIds: expect.anything(),
      }),
    );
  });

  it('keeps safety settings inside models settings and collapsed by default', async () => {
    const onUpdateSettings = vi.fn();
    const safetySettings = useSettingsStore.getState().appSettings.safetySettings;

    await act(async () => {
      useSettingsStore.setState({ language: 'en' });
      root.render(
        <I18nProvider>
          <ModelsSection
            modelId="gemini-3.1-pro-preview"
            setModelId={vi.fn()}
            availableModels={[{ id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview', isPinned: true }]}
            setAvailableModels={vi.fn()}
            currentSettings={{
              ...useSettingsStore.getState().appSettings,
              safetySettings,
            }}
            onUpdateSettings={onUpdateSettings}
            t={(key) =>
              ({
                safety_title: 'Safety Settings',
                safety_description: 'Adjust content safety filters.',
                models_safety_toggle_aria: 'Toggle safety settings',
              })[String(key)] ?? String(key)
            }
          />
        </I18nProvider>,
      );
    });

    const toggleButton = container.querySelector<HTMLButtonElement>('button[aria-label="Toggle safety settings"]');

    expect(toggleButton).not.toBeNull();
    expect(toggleButton?.getAttribute('aria-expanded')).toBe('false');
    expect(container.textContent).toContain('Safety Settings');
    expect(container.querySelector('[data-testid="safety-section"]')).toBeNull();

    await act(async () => {
      toggleButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(toggleButton?.getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelector('[data-testid="safety-section"]')).not.toBeNull();
    expect(mockSafetySection.lastProps.safetySettings).toBe(safetySettings);

    mockSafetySection.lastProps.setSafetySettings([]);

    expect(onUpdateSettings).toHaveBeenCalledWith({ safetySettings: [] });
  });

  it('keeps canvas settings inside models settings', async () => {
    const onUpdateSettings = vi.fn();

    await act(async () => {
      useSettingsStore.setState({ language: 'en' });
      root.render(
        <I18nProvider>
          <ModelsSection
            modelId="gemini-3.1-pro-preview"
            setModelId={vi.fn()}
            availableModels={[{ id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview', isPinned: true }]}
            setAvailableModels={vi.fn()}
            currentSettings={{
              ...useSettingsStore.getState().appSettings,
              autoCanvasVisualization: false,
              autoCanvasModelId: 'gemini-3-flash-preview',
            }}
            onUpdateSettings={onUpdateSettings}
            t={(key) =>
              ({
                settingsCanvasSectionTitle: 'Canvas Visualizations',
                settings_autoCanvasVisualization_label: 'Auto-open Canvas Visualization',
                settings_autoCanvasVisualization_tooltip: 'Automatically trigger Canvas visualization.',
                settings_autoCanvasModel_label: 'Canvas Model',
              })[String(key)] ?? String(key)
            }
          />
        </I18nProvider>,
      );
    });

    expect(container.textContent).toContain('Canvas Visualizations');
    expect(container.textContent).toContain('Auto-open Canvas Visualization');
    expect(container.textContent).toContain('Canvas Model');

    const toggleLabel = Array.from(container.querySelectorAll('span')).find(
      (element) => element.textContent?.trim() === 'Auto-open Canvas Visualization',
    );
    const toggleInput = toggleLabel?.closest('.group')?.querySelector<HTMLInputElement>('input[type="checkbox"]');

    await act(async () => {
      toggleInput?.click();
    });

    expect(onUpdateSettings).toHaveBeenCalledWith({ autoCanvasVisualization: true });

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('#canvas-model-select')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    await act(async () => {
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent?.trim() === 'Gemini 3.1 Pro')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onUpdateSettings).toHaveBeenCalledWith({ autoCanvasModelId: 'gemini-3.1-pro-preview' });
  });

  it('keeps language, voice, and translation settings inside models settings', async () => {
    const onUpdateSettings = vi.fn();

    await act(async () => {
      useSettingsStore.setState({ language: 'en' });
      root.render(
        <I18nProvider>
          <ModelsSection
            modelId="gemini-3.1-pro-preview"
            setModelId={vi.fn()}
            availableModels={[
              { id: 'gemini-custom-input-translator', name: 'Input Translator' },
              { id: 'gemini-custom-thought-translator', name: 'Thought Translator' },
            ]}
            setAvailableModels={vi.fn()}
            currentSettings={{
              ...useSettingsStore.getState().appSettings,
              transcriptionModelId: 'gemini-3-flash-preview',
              translationTargetLanguage: 'Japanese',
              inputTranslationModelId: 'gemini-custom-input-translator',
              thoughtTranslationTargetLanguage: 'Korean',
              thoughtTranslationModelId: 'gemini-custom-thought-translator',
            }}
            onUpdateSettings={onUpdateSettings}
            t={(key) => String(key)}
          />
        </I18nProvider>,
      );
    });

    expect(container.querySelector('[data-testid="language-voice-section"]')).not.toBeNull();
    expect(mockLanguageVoiceSection.lastProps.transcriptionModelId).toBe('gemini-3-flash-preview');
    expect(mockLanguageVoiceSection.lastProps.translationTargetLanguage).toBe('Japanese');
    expect(mockLanguageVoiceSection.lastProps.inputTranslationModelId).toBe('gemini-custom-input-translator');
    expect(mockLanguageVoiceSection.lastProps.thoughtTranslationTargetLanguage).toBe('Korean');
    expect(mockLanguageVoiceSection.lastProps.thoughtTranslationModelId).toBe('gemini-custom-thought-translator');

    act(() => {
      mockLanguageVoiceSection.lastProps.setTranscriptionModelId('gemini-3.1-flash-lite-preview');
      mockLanguageVoiceSection.lastProps.setTranslationTargetLanguage('Simplified Chinese');
      mockLanguageVoiceSection.lastProps.setInputTranslationModelId('gemini-3-flash-preview');
      mockLanguageVoiceSection.lastProps.setThoughtTranslationTargetLanguage('English');
      mockLanguageVoiceSection.lastProps.setThoughtTranslationModelId('gemini-3.1-pro-preview');
    });

    expect(onUpdateSettings).toHaveBeenCalledWith({ transcriptionModelId: 'gemini-3.1-flash-lite-preview' });
    expect(onUpdateSettings).toHaveBeenCalledWith({ translationTargetLanguage: 'Simplified Chinese' });
    expect(onUpdateSettings).toHaveBeenCalledWith({ inputTranslationModelId: 'gemini-3-flash-preview' });
    expect(onUpdateSettings).toHaveBeenCalledWith({ thoughtTranslationTargetLanguage: 'English' });
    expect(onUpdateSettings).toHaveBeenCalledWith({ thoughtTranslationModelId: 'gemini-3.1-pro-preview' });
  });

  it('shows only GPT-compatible model and chat controls in OpenAI-compatible mode', async () => {
    const onUpdateSettings = vi.fn();
    const defaultModels = [
      { id: 'gpt-5.5', name: 'GPT-5.5', isPinned: true },
      { id: 'gpt-4.1', name: 'GPT-4.1' },
    ];

    await act(async () => {
      useSettingsStore.setState({ language: 'en' });
      root.render(
        <I18nProvider>
          <ModelsSection
            modelId="gpt-5.5"
            setModelId={vi.fn()}
            availableModels={defaultModels}
            setAvailableModels={vi.fn()}
            defaultModels={defaultModels}
            isOpenAICompatibleMode
            currentSettings={{
              ...useSettingsStore.getState().appSettings,
              apiMode: 'openai-compatible',
            }}
            onUpdateSettings={onUpdateSettings}
            t={(key) =>
              ({
                settingsSystemPrompt: 'System prompt',
                settingsTemperature: 'Temperature',
                settingsTopP: 'Top P',
                settingsCanvasSectionTitle: 'Canvas Visualizations',
                safety_title: 'Safety Settings',
                models_safety_toggle_aria: 'Toggle safety settings',
              })[String(key)] ?? String(key)
            }
          />
        </I18nProvider>,
      );
    });

    expect(container.querySelector('[data-testid="model-selector"]')).not.toBeNull();
    expect(mockModelSelector.lastProps.defaultModels).toBe(defaultModels);
    expect(container.textContent).toContain('System prompt');
    expect(container.textContent).toContain('Temperature');
    expect(container.textContent).toContain('Top P');
    expect(container.textContent).not.toContain('Top K');
    expect(container.textContent).not.toContain('Canvas Visualizations');
    expect(container.textContent).not.toContain('Safety Settings');
    expect(container.querySelector('[data-testid="language-voice-section"]')).toBeNull();
    expect(container.querySelector<HTMLButtonElement>('button[aria-label="Toggle safety settings"]')).toBeNull();
  });
});
