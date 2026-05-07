import { act, type ComponentProps } from 'react';
import { setupProviderTestRenderer as setupTestRenderer } from '@/test/providerTestUtils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSettingsStore } from '../../../stores/settingsStore';
import { setupStoreStateReset } from '../../../test/storeTestUtils';
import { ModelsSection } from './ModelsSection';
import type { ModelSelector } from '../controls/ModelSelector';
import type { LanguageVoiceSection } from './LanguageVoiceSection';
import type { SafetySection } from './SafetySection';

type ModelSelectorProps = ComponentProps<typeof ModelSelector>;
type LanguageVoiceSectionProps = ComponentProps<typeof LanguageVoiceSection>;
type SafetySectionProps = ComponentProps<typeof SafetySection>;

const mockSafetySection = vi.hoisted(() => ({
  renderCount: 0,
  lastProps: null as SafetySectionProps | null,
}));

const mockLanguageVoiceSection = vi.hoisted(() => ({
  lastProps: null as LanguageVoiceSectionProps | null,
}));

const mockModelSelector = vi.hoisted(() => ({
  lastProps: null as ModelSelectorProps | null,
}));

vi.mock('../controls/ModelSelector', () => ({
  ModelSelector: (props: ModelSelectorProps) => {
    mockModelSelector.lastProps = props;
    return <div data-testid="model-selector">model selector</div>;
  },
}));

vi.mock('./LanguageVoiceSection', () => ({
  LanguageVoiceSection: (props: LanguageVoiceSectionProps) => {
    mockLanguageVoiceSection.lastProps = props;
    return <div data-testid="language-voice-section">language voice section</div>;
  },
}));

vi.mock('./SafetySection', () => ({
  SafetySection: (props: SafetySectionProps) => {
    mockSafetySection.renderCount += 1;
    mockSafetySection.lastProps = props;
    return <div data-testid="safety-section">safety section</div>;
  },
}));

describe('ModelsSection', () => {
  const renderer = setupTestRenderer({ providers: { language: 'en' } });
  setupStoreStateReset();

  const renderModelsSection = async (overrides: Partial<ComponentProps<typeof ModelsSection>> = {}) => {
    await act(async () => {
      renderer.root.render(
        <ModelsSection
          modelId="gemini-3.1-pro-preview"
          setModelId={vi.fn()}
          availableModels={[{ id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview', isPinned: true }]}
          setAvailableModels={vi.fn()}
          currentSettings={useSettingsStore.getState().appSettings}
          onUpdateSettings={vi.fn()}
          {...overrides}
        />,
      );
    });
  };

  afterEach(() => {
    mockSafetySection.renderCount = 0;
    mockSafetySection.lastProps = null;
    mockLanguageVoiceSection.lastProps = null;
    mockModelSelector.lastProps = null;
  });

  it('keeps tab cycle model settings out of models settings', async () => {
    const onUpdateSettings = vi.fn();

    await renderModelsSection({
      availableModels: [
        { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview', isPinned: true },
        { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', isPinned: true },
        { id: 'gemini-3.1-flash-lite-preview', name: 'Gemini 3.1 Flash Lite Preview', isPinned: true },
      ],
      currentSettings: {
        ...useSettingsStore.getState().appSettings,
        tabModelCycleIds: ['gemini-3.1-pro-preview', 'gemini-3-flash-preview'],
      },
      onUpdateSettings,
    });

    expect(renderer.container.querySelector('[data-testid="model-selector"]')).not.toBeNull();
    expect(renderer.container.textContent).not.toContain('Models Included In Tab Cycle');
    expect(renderer.container.textContent).not.toContain('2 models selected');
    expect(renderer.container.textContent).not.toContain('Gemini 3.1 Flash Lite Preview');
    expect(
      renderer.container.querySelector<HTMLButtonElement>('button[aria-label="Toggle Tab cycle model panel"]'),
    ).toBeNull();
    expect(onUpdateSettings).not.toHaveBeenCalledWith(
      expect.objectContaining({
        tabModelCycleIds: expect.anything(),
      }),
    );
  });

  it('keeps safety settings inside models settings and collapsed by default', async () => {
    const onUpdateSettings = vi.fn();
    const safetySettings = useSettingsStore.getState().appSettings.safetySettings;

    await renderModelsSection({
      currentSettings: {
        ...useSettingsStore.getState().appSettings,
        safetySettings,
      },
      onUpdateSettings,
    });

    const toggleButton = renderer.container.querySelector<HTMLButtonElement>(
      'button[aria-label="Toggle safety settings"]',
    );

    expect(toggleButton).not.toBeNull();
    expect(toggleButton?.getAttribute('aria-expanded')).toBe('false');
    expect(renderer.container.textContent).toContain('Safety Settings');
    expect(renderer.container.querySelector('[data-testid="safety-section"]')).toBeNull();

    await act(async () => {
      toggleButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(toggleButton?.getAttribute('aria-expanded')).toBe('true');
    expect(renderer.container.querySelector('[data-testid="safety-section"]')).not.toBeNull();
    expect(mockSafetySection.lastProps!.safetySettings).toBe(safetySettings);

    mockSafetySection.lastProps!.setSafetySettings([]);

    expect(onUpdateSettings).toHaveBeenCalledWith({ safetySettings: [] });
  });

  it('keeps canvas settings inside models settings', async () => {
    const onUpdateSettings = vi.fn();

    await renderModelsSection({
      currentSettings: {
        ...useSettingsStore.getState().appSettings,
        autoCanvasVisualization: false,
        autoCanvasModelId: 'gemini-3-flash-preview',
      },
      onUpdateSettings,
    });

    expect(renderer.container.textContent).toContain('Canvas Visualizations');
    expect(renderer.container.textContent).toContain('Auto-open Canvas Visualization');
    expect(renderer.container.textContent).toContain('Canvas Model');

    const toggleLabel = Array.from(renderer.container.querySelectorAll('span')).find(
      (element) => element.textContent?.trim() === 'Auto-open Canvas Visualization',
    );
    const toggleInput = toggleLabel?.closest('.group')?.querySelector<HTMLInputElement>('input[type="checkbox"]');

    await act(async () => {
      toggleInput?.click();
    });

    expect(onUpdateSettings).toHaveBeenCalledWith({ autoCanvasVisualization: true });

    await act(async () => {
      renderer.container
        .querySelector<HTMLButtonElement>('#canvas-model-select')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    await act(async () => {
      Array.from(renderer.container.querySelectorAll('button'))
        .find((button) => button.textContent?.trim() === 'Gemini 3.1 Pro')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onUpdateSettings).toHaveBeenCalledWith({ autoCanvasModelId: 'gemini-3.1-pro-preview' });
  });

  it('keeps language, voice, and translation settings inside models settings', async () => {
    const onUpdateSettings = vi.fn();

    await renderModelsSection({
      availableModels: [
        { id: 'gemini-custom-input-translator', name: 'Input Translator' },
        { id: 'gemini-custom-thought-translator', name: 'Thought Translator' },
      ],
      currentSettings: {
        ...useSettingsStore.getState().appSettings,
        transcriptionModelId: 'gemini-3-flash-preview',
        translationTargetLanguage: 'Japanese',
        inputTranslationModelId: 'gemini-custom-input-translator',
        thoughtTranslationTargetLanguage: 'Korean',
        thoughtTranslationModelId: 'gemini-custom-thought-translator',
      },
      onUpdateSettings,
    });

    expect(renderer.container.querySelector('[data-testid="language-voice-section"]')).not.toBeNull();
    expect(mockLanguageVoiceSection.lastProps!.currentSettings.transcriptionModelId).toBe('gemini-3-flash-preview');
    expect(mockLanguageVoiceSection.lastProps!.currentSettings.translationTargetLanguage).toBe('Japanese');
    expect(mockLanguageVoiceSection.lastProps!.currentSettings.inputTranslationModelId).toBe(
      'gemini-custom-input-translator',
    );
    expect(mockLanguageVoiceSection.lastProps!.currentSettings.thoughtTranslationTargetLanguage).toBe('Korean');
    expect(mockLanguageVoiceSection.lastProps!.currentSettings.thoughtTranslationModelId).toBe(
      'gemini-custom-thought-translator',
    );

    act(() => {
      mockLanguageVoiceSection.lastProps!.onUpdateSetting('transcriptionModelId', 'gemini-3.1-flash-lite-preview');
      mockLanguageVoiceSection.lastProps!.onUpdateSetting('translationTargetLanguage', 'Simplified Chinese');
      mockLanguageVoiceSection.lastProps!.onUpdateSetting('inputTranslationModelId', 'gemini-3-flash-preview');
      mockLanguageVoiceSection.lastProps!.onUpdateSetting('thoughtTranslationTargetLanguage', 'English');
      mockLanguageVoiceSection.lastProps!.onUpdateSetting('thoughtTranslationModelId', 'gemini-3.1-pro-preview');
    });

    expect(onUpdateSettings).toHaveBeenCalledWith({ transcriptionModelId: 'gemini-3.1-flash-lite-preview' });
    expect(onUpdateSettings).toHaveBeenCalledWith({ translationTargetLanguage: 'Simplified Chinese' });
    expect(onUpdateSettings).toHaveBeenCalledWith({ inputTranslationModelId: 'gemini-3-flash-preview' });
    expect(onUpdateSettings).toHaveBeenCalledWith({ thoughtTranslationTargetLanguage: 'English' });
    expect(onUpdateSettings).toHaveBeenCalledWith({ thoughtTranslationModelId: 'gemini-3.1-pro-preview' });
  });

  it('keeps OpenAI-compatible models out of Gemini language and voice controls', async () => {
    await renderModelsSection({
      availableModels: [
        { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', apiMode: 'gemini-native' },
        { id: 'gpt-5.5', name: 'GPT-5.5', apiMode: 'openai-compatible' },
      ],
    });

    expect(mockLanguageVoiceSection.lastProps!.availableModels).toEqual([
      { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview' },
    ]);
  });

  it('shows only GPT-compatible model and chat controls in OpenAI-compatible mode', async () => {
    const onUpdateSettings = vi.fn();
    const defaultModels = [
      { id: 'gpt-5.5', name: 'GPT-5.5', isPinned: true },
      { id: 'gpt-4.1', name: 'GPT-4.1' },
    ];

    await renderModelsSection({
      modelId: 'gpt-5.5',
      availableModels: defaultModels,
      defaultModels,
      isOpenAICompatibleMode: true,
      currentSettings: {
        ...useSettingsStore.getState().appSettings,
        isOpenAICompatibleApiEnabled: true,
        apiMode: 'openai-compatible',
      },
      onUpdateSettings,
    });

    expect(renderer.container.querySelector('[data-testid="model-selector"]')).not.toBeNull();
    expect(mockModelSelector.lastProps!.defaultModels).toBe(defaultModels);
    expect(renderer.container.textContent).toContain('Default System Prompt');
    expect(renderer.container.textContent).toContain('Temperature');
    expect(renderer.container.textContent).toContain('Top P');
    expect(renderer.container.textContent).not.toContain('Top K');
    expect(renderer.container.textContent).not.toContain('Canvas Visualizations');
    expect(renderer.container.textContent).not.toContain('Safety Settings');
    expect(renderer.container.querySelector('[data-testid="language-voice-section"]')).toBeNull();
    expect(
      renderer.container.querySelector<HTMLButtonElement>('button[aria-label="Toggle safety settings"]'),
    ).toBeNull();
  });
});
